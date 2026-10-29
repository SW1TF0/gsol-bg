import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicClient } from "@/lib/supabase/clients";
import type { Tables } from "@/lib/supabase/database.types";

// Достъп до каталога в Supabase. Всичко е кеширано с таг "catalog";
// админ панелът го изчиства с updateTag("catalog") след промяна.

export type Tier = "basic" | "izbor" | "premium" | "office";

export type Product = {
  id: number;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  categoryId: number | null;
  category: string;
  subcategory: string | null;
  price: number;
  regularPrice: number;
  images: string[];
  inStock: boolean;
  deliveryDays: string;
  freeWindows: boolean;
  specs: { k: string; v: string }[];
  summary: string;
  isPromo: boolean;
  tier?: Tier;
  /** Части на машината GSOL; машините от билдъра имат всички осем (motherboard, ram, …) */
  components?: { cpu: string; gpu: string; case: string; [kind: string]: string } | null;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  subcategories: { id: number; slug: string; name: string }[];
  priceRanges: [number, number | null][];
};

export const tierInfo: Record<Tier, { name: string; label: string; blurb: string }> = {
  basic: { name: "GSOL Basic Gaming", label: "Basic", blurb: "Добър старт за игри във Full HD на разумна цена." },
  izbor: { name: "GSOL Избор", label: "Избор", blurb: "Най-доброто съотношение цена / производителност." },
  premium: { name: "GSOL Премиум", label: "Премиум", blurb: "Върхът на нашия стандарт, изпипан до последния кабел." },
  office: { name: "GSOL Office", label: "Office", blurb: "Тиха и надеждна машина за работа и учене." },
};

export type SortKey = "recommended" | "new" | "price-asc" | "price-desc";

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Препоръчани" },
  { key: "new", label: "Най-нови" },
  { key: "price-asc", label: "Цена ↑" },
  { key: "price-desc", label: "Цена ↓" },
];

export type CatalogQuery = {
  category?: string;
  sub?: string;
  brands?: string[];
  range?: number;
  promo?: boolean;
  q?: string;
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export function rangeLabel([min, max]: [number, number | null]) {
  const eur = (c: number) => Math.round(c / 100).toLocaleString("bg-BG");
  if (min === 0 && max) return `До ${eur(max)} €`;
  if (max === null) return `Над ${eur(min - 1)} €`;
  return `${eur(min)} – ${eur(max)} €`;
}

// ---------------------------------------------------------------- категории

type CategoryRow = Tables<"categories">;

async function loadCategoryRows(): Promise<CategoryRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const { data, error } = await publicClient()
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`Категориите не се заредиха: ${error.message}`);
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const rows = await loadCategoryRows();
  return rows
    .filter((r) => r.parent_id === null)
    .map((top) => ({
      id: top.id,
      slug: top.slug,
      name: top.name,
      tagline: top.tagline ?? "",
      priceRanges: (top.price_ranges as [number, number | null][]) ?? [],
      subcategories: rows
        .filter((r) => r.parent_id === top.id)
        .map((r) => ({ id: r.id, slug: r.slug, name: r.name })),
    }));
}

export async function getCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug);
}

// ---------------------------------------------------------------- продукти

const PRODUCT_COLUMNS =
  "id, slug, name, sku, brand, category_id, price_cents, regular_price_cents, images, stock_status, delivery_days, free_windows, specs, summary, is_promo, tier, components";

type ProductRow = Pick<
  Tables<"products">,
  | "id"
  | "slug"
  | "name"
  | "sku"
  | "brand"
  | "category_id"
  | "price_cents"
  | "regular_price_cents"
  | "images"
  | "stock_status"
  | "delivery_days"
  | "free_windows"
  | "specs"
  | "summary"
  | "is_promo"
  | "tier"
  | "components"
>;

async function toProducts(rows: ProductRow[]): Promise<Product[]> {
  const cats = await loadCategoryRows();
  const byId = new Map(cats.map((c) => [c.id, c]));
  return rows.map((r) => {
    const cat = r.category_id ? byId.get(r.category_id) : undefined;
    const parent = cat?.parent_id ? byId.get(cat.parent_id) : undefined;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      sku: r.sku ?? "",
      brand: r.brand ?? "",
      categoryId: r.category_id,
      category: parent?.slug ?? cat?.slug ?? "",
      subcategory: parent ? (cat?.slug ?? null) : null,
      price: r.price_cents,
      regularPrice: r.regular_price_cents ?? r.price_cents,
      images: r.images,
      inStock: r.stock_status === "in_stock",
      deliveryDays: r.delivery_days,
      freeWindows: r.free_windows,
      specs: (r.specs as Product["specs"]) ?? [],
      summary: r.summary ?? "",
      isPromo: r.is_promo,
      tier: (r.tier as Tier | null) ?? undefined,
      components: (r.components as Product["components"]) ?? null,
    };
  });
}

/** id-тата на категория и всичките ѝ подкатегории */
async function categoryIds(slug: string, sub?: string) {
  const cats = await loadCategoryRows();
  const top = cats.find((c) => c.slug === slug && c.parent_id === null);
  if (!top) return [];
  if (sub) {
    const leaf = cats.find((c) => c.slug === sub && c.parent_id === top.id);
    return leaf ? [leaf.id] : [];
  }
  return [top.id, ...cats.filter((c) => c.parent_id === top.id).map((c) => c.id)];
}

/** Екранира текст за PostgREST .or() филтър */
function orSafe(text: string) {
  return text.replace(/[,()%*\\]/g, " ").trim();
}

export async function queryProducts(query: CatalogQuery) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const db = publicClient();
  const perPage = query.perPage ?? 24;
  const page = Math.max(1, query.page ?? 1);
  const category = query.category ? await getCategory(query.category) : undefined;
  const ids = query.category ? await categoryIds(query.category, query.sub) : null;
  const range = category && query.range !== undefined ? category.priceRanges[query.range] : undefined;
  const q = query.q ? orSafe(query.q) : "";

  // Общите филтри без марката — върху тях броим марките.
  // PostgREST builder-ите са с различни generic типове за двете заявки, затова тук е any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoped = (builder: any) => {
    let b = builder.eq("is_active", true);
    if (ids) b = b.in("category_id", ids.length ? ids : [-1]);
    if (query.promo) b = b.eq("is_promo", true);
    if (range) {
      b = b.gte("price_cents", range[0]);
      if (range[1] !== null) b = b.lte("price_cents", range[1]);
    }
    if (q) b = b.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`);
    return b;
  };

  const brandRows: { data: { brand: string | null }[] | null; error: { message: string } | null } = await scoped(
    db.from("products").select("brand"),
  );
  if (brandRows.error) throw new Error(brandRows.error.message);
  const brandCounts = new Map<string, number>();
  for (const r of brandRows.data ?? []) {
    if (r.brand) brandCounts.set(r.brand, (brandCounts.get(r.brand) ?? 0) + 1);
  }

  let list = scoped(db.from("products").select(PRODUCT_COLUMNS, { count: "exact" }));
  if (query.brands?.length) list = list.in("brand", query.brands);
  switch (query.sort) {
    case "new":
      list = list.order("id", { ascending: false });
      break;
    case "price-asc":
      list = list.order("price_cents", { ascending: true });
      break;
    case "price-desc":
      list = list.order("price_cents", { ascending: false });
      break;
    default:
      list = list
        .order("is_promo", { ascending: false })
        .order("stock_status", { ascending: true })
        .order("id", { ascending: false });
  }
  const { data, count, error }: { data: ProductRow[] | null; count: number | null; error: { message: string } | null } =
    await list.range((page - 1) * perPage, page * perPage - 1);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    items: await toProducts(data ?? []),
    brands: [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
  };
}

async function selectProducts(build: (q: ReturnType<typeof productSelect>) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await build(productSelect());
  if (error) throw new Error(error.message);
  return toProducts((data ?? []) as ProductRow[]);
}

function productSelect() {
  return publicClient().from("products").select(PRODUCT_COLUMNS).eq("is_active", true);
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [product] = await selectProducts((q) => q.eq("slug", slug).limit(1));
  return product;
}

export async function getAllSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const { data, error } = await publicClient().from("products").select("slug").eq("is_active", true).limit(5000);
  if (error) throw new Error(error.message);
  return data.map((r) => r.slug);
}

export async function getRelated(product: Product, limit = 4) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  if (!product.categoryId) return [];
  const sameCategory = await selectProducts((q) => q.eq("category_id", product.categoryId!).neq("id", product.id).limit(40));
  return sameCategory
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .slice(0, limit);
}

export async function getPromoProducts(limit = 12) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return selectProducts((q) => q.eq("is_promo", true).order("id", { ascending: false }).limit(limit));
}

export async function getConfigsByTier() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const configs = await selectProducts((q) => q.not("tier", "is", null).order("price_cents", { ascending: false }));
  const result = {} as Record<Tier, Product[]>;
  for (const tier of Object.keys(tierInfo) as Tier[]) result[tier] = configs.filter((p) => p.tier === tier);
  return result;
}

export async function getCollection(name: "gaming-laptops" | "budget-laptops", limit = 4) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  if (name === "gaming-laptops") {
    const ids = await categoryIds("laptopi", "geiming-laptopi");
    return selectProducts((q) => q.in("category_id", ids).order("price_cents").limit(limit));
  }
  const ids = await categoryIds("laptopi");
  return selectProducts((q) =>
    q.in("category_id", ids).gte("price_cents", 45000).lte("price_cents", 65000).order("price_cents").limit(limit),
  );
}

export async function countByCategory() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const cats = await getCategories();
  const counts: Record<string, number> = {};
  await Promise.all(
    cats.map(async (c) => {
      const ids = [c.id, ...c.subcategories.map((s) => s.id)];
      const { count } = await publicClient()
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .in("category_id", ids);
      counts[c.slug] = count ?? 0;
    }),
  );
  return counts;
}

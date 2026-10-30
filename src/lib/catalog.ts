import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicClient } from "@/lib/supabase/clients";
import type { Tables } from "@/lib/supabase/database.types";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { compareFacetValues, extractFacets, facetDefs, FACET_MIN_SHARE, type FacetKey } from "@/lib/facets";

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
  /** Технически филтри: избор в една група = ИЛИ, между групите = И */
  facets?: Partial<Record<FacetKey, string[]>>;
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

type ShelfRow = {
  id: number;
  price: number;
  brand: string;
  promo: boolean;
  stock: string;
  facets: Partial<Record<FacetKey, string>>;
};

/**
 * Рафтът наведнъж (до ~1000 продукта): цена, марка, наличност и разчетените технически стойности.
 * Кешира се — филтрите, броенето и подреждането стават в паметта, без нова заявка за всеки избор.
 */
async function loadShelf(category: string | undefined, sub: string | undefined, promo: boolean, q: string): Promise<ShelfRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const db = publicClient();
  const ids = category ? await categoryIds(category, sub) : null;
  const cats = await loadCategoryRows();
  const byId = new Map(cats.map((c) => [c.id, c]));
  type Row = Pick<Tables<"products">, "id" | "name" | "brand" | "category_id" | "price_cents" | "is_promo" | "stock_status" | "specs" | "components">;
  const rows = await fetchAll<Row>((from, to) => {
    // Веригата с условни филтри е с any — иначе типовете на PostgREST се извеждат наново при всяко
    // присвояване и проверката на типовете става много бавна
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let b: any = db
      .from("products")
      .select("id, name, brand, category_id, price_cents, is_promo, stock_status, specs, components")
      .eq("is_active", true);
    if (ids) b = b.in("category_id", ids.length ? ids : [-1]);
    if (promo) b = b.eq("is_promo", true);
    if (q) b = b.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`);
    return b.order("id").range(from, to);
  });
  return rows.map((r) => {
    const cat = r.category_id ? byId.get(r.category_id) : undefined;
    const parent = cat?.parent_id ? byId.get(cat.parent_id) : undefined;
    return {
      id: r.id,
      price: r.price_cents,
      brand: r.brand ?? "",
      promo: r.is_promo,
      stock: r.stock_status,
      facets: extractFacets({
        name: r.name,
        category: [parent?.slug, cat?.slug].filter(Boolean).join("/"),
        stockStatus: r.stock_status,
        specs: Array.isArray(r.specs) ? (r.specs as { k: string; v: string }[]) : [],
        components: (r.components as Record<string, string> | null) ?? null,
      }),
    };
  });
}

export type FacetGroup = { key: FacetKey; label: string; values: { value: string; count: number; active: boolean }[] };

export async function queryProducts(query: CatalogQuery) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const perPage = query.perPage ?? 24;
  const category = query.category ? await getCategory(query.category) : undefined;
  const range = category && query.range !== undefined ? category.priceRanges[query.range] : undefined;
  const shelf = await loadShelf(query.category, query.sub, Boolean(query.promo), query.q ? orSafe(query.q) : "");

  const base = range ? shelf.filter((r) => r.price >= range[0] && (range[1] === null || r.price <= range[1])) : shelf;
  const selected = Object.entries(query.facets ?? {}).filter(([, v]) => v?.length) as [FacetKey, string[]][];
  const facetsOk = (r: ShelfRow, except?: FacetKey) => selected.every(([k, v]) => k === except || v.includes(r.facets[k] ?? ""));
  const brandOk = (r: ShelfRow) => !query.brands?.length || query.brands.includes(r.brand);

  // Марките се броят с техническите филтри, но без избора на марка (и обратно за всяка група)
  const brandCounts = new Map<string, number>();
  for (const r of base) if (r.brand && facetsOk(r)) brandCounts.set(r.brand, (brandCounts.get(r.brand) ?? 0) + 1);

  const facets: FacetGroup[] = [];
  for (const def of facetDefs) {
    const covered = base.filter((r) => r.facets[def.key]);
    const distinct = new Set(covered.map((r) => r.facets[def.key]!));
    const chosen = selected.find(([k]) => k === def.key)?.[1] ?? [];
    // „Не се чете надеждно = няма филтър“ — освен ако групата вече е избрана
    if (!chosen.length && (base.length === 0 || covered.length / base.length < FACET_MIN_SHARE || distinct.size < 2)) continue;
    const counts = new Map<string, number>();
    for (const r of base) {
      const v = r.facets[def.key];
      if (v && brandOk(r) && facetsOk(r, def.key)) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const values = [...new Set([...distinct, ...chosen])]
      .sort(compareFacetValues)
      .map((value) => ({ value, count: counts.get(value) ?? 0, active: chosen.includes(value) }));
    facets.push({ key: def.key, label: def.label, values });
  }

  const matches = base.filter((r) => brandOk(r) && facetsOk(r));
  const stockRank = (s: string) => (s === "in_stock" ? 0 : s === "on_request" ? 1 : 2);
  matches.sort((a, b) => {
    switch (query.sort) {
      case "new":
        return b.id - a.id;
      case "price-asc":
        return a.price - b.price || b.id - a.id;
      case "price-desc":
        return b.price - a.price || b.id - a.id;
      default:
        return Number(b.promo) - Number(a.promo) || stockRank(a.stock) - stockRank(b.stock) || b.id - a.id;
    }
  });

  const total = matches.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, query.page ?? 1), pages);
  const ids = matches.slice((page - 1) * perPage, page * perPage).map((r) => r.id);
  let items: Product[] = [];
  if (ids.length) {
    const { data, error } = await publicClient().from("products").select(PRODUCT_COLUMNS).in("id", ids);
    if (error) throw new Error(error.message);
    const order = new Map(ids.map((id, i) => [id, i]));
    items = await toProducts(((data ?? []) as ProductRow[]).sort((a, b) => order.get(a.id)! - order.get(b.id)!));
  }

  return {
    total,
    page,
    pages,
    items,
    brands: [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    facets,
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

// ---------------------------------------------------------------- меню

export type MenuLink = { label: string; href: string; count: number };
export type MenuDepartment = MenuLink & { slug: string; subs: MenuLink[]; brands: MenuLink[] };

/**
 * Менюто с отдели от живите категории: празна категория изчезва сама, марките са подредени
 * по брой продукти. „Популярни марки“ водят към отдела, в който марката има най-много продукти.
 */
export async function getMenu() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [cats, { data }] = await Promise.all([getCategories(), publicClient().rpc("catalog_menu")]);
  const rows = data ?? [];
  const sum = (ids: number[], brand?: string) =>
    rows.filter((r) => ids.includes(r.category_id) && (!brand || r.brand === brand)).reduce((s, r) => s + r.products, 0);

  const departments: MenuDepartment[] = cats
    .map((c) => {
      const ids = [c.id, ...c.subcategories.map((s) => s.id)];
      const brandCounts = new Map<string, number>();
      for (const r of rows) if (ids.includes(r.category_id) && r.brand !== "—") brandCounts.set(r.brand, (brandCounts.get(r.brand) ?? 0) + r.products);
      return {
        slug: c.slug,
        label: c.name,
        href: `/katalog/${c.slug}`,
        count: sum(ids),
        subs: c.subcategories
          .map((s) => ({ label: s.name, href: `/katalog/${c.slug}?sub=${s.slug}`, count: sum([s.id]) }))
          .filter((s) => s.count > 0),
        brands: [...brandCounts]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([brand, count]) => ({ label: brand, href: `/katalog/${c.slug}?brand=${encodeURIComponent(brand)}`, count })),
      };
    })
    .filter((d) => d.count > 0);

  const topBrands = new Map<string, { count: number; best: { slug: string; count: number } }>();
  for (const d of departments) {
    for (const b of d.brands) {
      const t = topBrands.get(b.label) ?? { count: 0, best: { slug: d.slug, count: 0 } };
      t.count += b.count;
      if (b.count > t.best.count) t.best = { slug: d.slug, count: b.count };
      topBrands.set(b.label, t);
    }
  }
  const brands: MenuLink[] = [...topBrands]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([brand, t]) => ({ label: brand, href: `/katalog/${t.best.slug}?brand=${encodeURIComponent(brand)}`, count: t.count }));

  return { departments, brands };
}

/** Бързи резултати в търсачката на хедъра */
export async function suggestProducts(q: string) {
  const term = q.replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
  if (term.length < 2) return [];
  const { data } = await publicClient()
    .from("products")
    .select("slug, name, price_cents, images")
    .eq("is_active", true)
    .or(`name.ilike.%${term}%,sku.ilike.%${term}%,brand.ilike.%${term}%`)
    .order("price_cents")
    .limit(6);
  return (data ?? []).map((p) => ({ slug: p.slug, name: p.name, price: p.price_cents, image: p.images[0] ?? null }));
}

import seed from "@/data/seed.json";

// Достъп до каталога. Сега чете seed.json; в следващия етап същите функции ще четат от Supabase.

export type Tier = "basic" | "izbor" | "premium" | "office";

export type Product = {
  id: number;
  slug: string;
  name: string;
  sku: string;
  brand: string;
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
  components?: { cpu: string; gpu: string; case: string } | null;
};

export type Category = {
  slug: string;
  name: string;
  tagline: string;
  subcategories: { slug: string; name: string }[];
  priceRanges: [number, number | null][];
};

const products = seed as Product[];

export const categories: Category[] = [
  {
    slug: "laptopi",
    name: "Лаптопи",
    tagline: "За работа, дома и игри",
    subcategories: [
      { slug: "laptopi", name: "Работа и дом" },
      { slug: "geiming-laptopi", name: "Гейминг лаптопи" },
    ],
    priceRanges: [[0, 85000], [85001, 115000], [115001, 160000], [160001, 240000], [240001, null]],
  },
  {
    slug: "kompyutri",
    name: "Компютри",
    tagline: "Сглобени и тествани от GSOL",
    subcategories: [
      { slug: "gsol-basic", name: "GSOL Basic Gaming" },
      { slug: "gsol-izbor", name: "GSOL Избор" },
      { slug: "gsol-premium", name: "GSOL Премиум" },
      { slug: "gsol-office", name: "GSOL Office" },
    ],
    priceRanges: [[0, 150000], [150001, 250000], [250001, null]],
  },
  {
    slug: "komponenti",
    name: "Компоненти",
    tagline: "Части за надграждане и сглобяване",
    subcategories: [
      { slug: "procesori", name: "Процесори" },
      { slug: "videokarti", name: "Видеокарти" },
      { slug: "ram", name: "RAM памет" },
      { slug: "ssd", name: "SSD и HDD" },
    ],
    priceRanges: [[0, 10000], [10001, 30000], [30001, 60000], [60001, null]],
  },
  {
    slug: "periferiya",
    name: "Периферия",
    tagline: "Монитори, мишки, клавиатури, слушалки",
    subcategories: [
      { slug: "monitori", name: "Монитори" },
      { slug: "geiming-monitori", name: "Гейминг монитори" },
      { slug: "mishki", name: "Мишки" },
      { slug: "klaviaturi", name: "Клавиатури" },
      { slug: "slushalki", name: "Слушалки" },
    ],
    priceRanges: [[0, 5000], [5001, 15000], [15001, 30000], [30001, null]],
  },
  {
    slug: "renovirani",
    name: "Реновирани",
    tagline: "Проверена техника на по-добра цена",
    subcategories: [],
    priceRanges: [[0, 10000], [10001, 30000], [30001, null]],
  },
];

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

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function rangeLabel([min, max]: [number, number | null]) {
  const eur = (c: number) => Math.round(c / 100).toLocaleString("bg-BG");
  if (min === 0 && max) return `До ${eur(max)} €`;
  if (max === null) return `Над ${eur(min - 1)} €`;
  return `${eur(min)} – ${eur(max)} €`;
}

function sortProducts(list: Product[], sort: SortKey = "recommended") {
  const sorted = [...list];
  switch (sort) {
    case "new":
      return sorted.sort((a, b) => b.id - a.id);
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    default:
      return sorted.sort(
        (a, b) =>
          Number(b.isPromo) - Number(a.isPromo) ||
          Number(b.inStock) - Number(a.inStock) ||
          b.id - a.id,
      );
  }
}

/** Филтрира без марката, за да покажем броя по марки за текущия избор. */
function baseFilter(query: CatalogQuery) {
  const category = query.category ? getCategory(query.category) : undefined;
  const q = query.q?.trim().toLowerCase();
  return products.filter((p) => {
    if (query.category && p.category !== query.category) return false;
    if (query.sub && p.subcategory !== query.sub) return false;
    if (query.promo && !p.isPromo) return false;
    if (q && !`${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(q)) return false;
    if (category && query.range !== undefined) {
      const r = category.priceRanges[query.range];
      if (r && (p.price < r[0] || (r[1] !== null && p.price > r[1]))) return false;
    }
    return true;
  });
}

export async function queryProducts(query: CatalogQuery) {
  const base = baseFilter(query);
  const brandCounts = new Map<string, number>();
  for (const p of base) brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);

  const filtered = query.brands?.length ? base.filter((p) => query.brands!.includes(p.brand)) : base;
  const perPage = query.perPage ?? 24;
  const page = Math.max(1, query.page ?? 1);
  const sorted = sortProducts(filtered, query.sort);

  return {
    total: sorted.length,
    page,
    pages: Math.max(1, Math.ceil(sorted.length / perPage)),
    items: sorted.slice((page - 1) * perPage, page * perPage),
    brands: [...brandCounts.entries()]
      .filter(([b]) => b !== "Друга")
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
  };
}

export async function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export async function getAllSlugs() {
  return products.map((p) => p.slug);
}

export async function getRelated(product: Product, limit = 4) {
  return products
    .filter((p) => p.id !== product.id && p.subcategory === product.subcategory)
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .slice(0, limit);
}

export async function getPromoProducts(limit = 12) {
  return products.filter((p) => p.isPromo).slice(0, limit);
}

export async function getConfigsByTier() {
  const result = {} as Record<Tier, Product[]>;
  for (const tier of Object.keys(tierInfo) as Tier[]) {
    result[tier] = products.filter((p) => p.tier === tier).sort((a, b) => b.price - a.price);
  }
  return result;
}

export async function getCollection(name: "gaming-laptops" | "budget-laptops", limit = 4) {
  if (name === "gaming-laptops") {
    return products
      .filter((p) => p.subcategory === "geiming-laptopi")
      .sort((a, b) => a.price - b.price)
      .slice(0, limit);
  }
  return products
    .filter((p) => p.category === "laptopi" && p.price >= 45000 && p.price <= 65000)
    .sort((a, b) => a.price - b.price)
    .slice(0, limit);
}

export async function countByCategory() {
  const counts: Record<string, number> = {};
  for (const p of products) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return counts;
}

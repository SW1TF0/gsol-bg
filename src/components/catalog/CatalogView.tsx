import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductCard";
import { facetDefs, type FacetKey } from "@/lib/facets";
import {
  getCategory,
  queryProducts,
  rangeLabel,
  sortOptions,
  type CatalogQuery,
  type SortKey,
} from "@/lib/catalog";

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Стойностите в една група са разделени с „|“ (в някои има запетая — 15,6") */
const FACET_SEP = "|";

export function parseQuery(params: Params, fixed: CatalogQuery = {}): CatalogQuery {
  const sort = first(params.sort) as SortKey | undefined;
  const facets: Partial<Record<FacetKey, string[]>> = {};
  for (const def of facetDefs) {
    const values = first(params[def.key])?.split(FACET_SEP).filter(Boolean);
    if (values?.length) facets[def.key] = values;
  }
  return {
    ...fixed,
    sub: first(params.sub) ?? fixed.sub,
    brands: first(params.brand)?.split(",").filter(Boolean),
    facets,
    ranges: (first(params.range) ?? "").split(FACET_SEP).filter((r) => /^\d+$/.test(r)).map(Number),
    sort: sortOptions.some((o) => o.key === sort) ? sort : "recommended",
    page: Number(first(params.page)) || 1,
    q: first(params.q) ?? fixed.q,
  };
}

/** Строи URL с променени параметри; null премахва параметъра. Смяната на филтър връща на страница 1. */
function hrefWith(base: string, params: Params, changes: Record<string, string | null>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const value = first(v);
    if (value && k !== "page") next.set(k, value);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function CatalogView({
  basePath,
  params,
  fixed = {},
  showSearchSummary = false,
}: {
  basePath: string;
  params: Params;
  fixed?: CatalogQuery;
  showSearchSummary?: boolean;
}) {
  const query = parseQuery(params, fixed);
  const category = query.category ? await getCategory(query.category) : undefined;
  const result = await queryProducts(query);
  const activeBrands = query.brands ?? [];

  const toggleBrand = (brand: string) => {
    const set = new Set(activeBrands);
    if (set.has(brand)) set.delete(brand);
    else set.add(brand);
    return hrefWith(basePath, params, { brand: set.size ? [...set].join(",") : null });
  };

  const toggleRange = (i: number) => {
    const set = new Set(query.ranges ?? []);
    if (set.has(i)) set.delete(i);
    else set.add(i);
    return hrefWith(basePath, params, { range: set.size ? [...set].sort().join(FACET_SEP) : null });
  };

  const toggleFacet = (key: FacetKey, value: string) => {
    const set = new Set(query.facets?.[key] ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return hrefWith(basePath, params, { [key]: set.size ? [...set].join(FACET_SEP) : null });
  };

  // Избраните филтри като чипове с × над резултатите
  const chips: { label: string; href: string }[] = [
    ...activeBrands.map((b) => ({ label: b, href: toggleBrand(b) })),
    ...Object.entries(query.facets ?? {}).flatMap(([key, values]) =>
      (values ?? []).map((v) => ({ label: v, href: toggleFacet(key as FacetKey, v) })),
    ),
    ...(category
      ? (query.ranges ?? [])
          .filter((i) => category.priceRanges[i])
          .map((i) => ({ label: rangeLabel(category.priceRanges[i]), href: toggleRange(i) }))
      : []),
  ];
  const hasFilters = Boolean(chips.length || first(params.sub));

  const filters = (
    <div className="space-y-8">
      {category && category.subcategories.length > 0 && (
        <FilterGroup title="Категория">
          <div className="flex flex-wrap gap-2">
            <Link href={hrefWith(basePath, params, { sub: null })} className="chip" data-active={!query.sub}>
              Всички
            </Link>
            {category.subcategories.map((s) => (
              <Link
                key={s.slug}
                href={hrefWith(basePath, params, { sub: s.slug })}
                className="chip"
                data-active={query.sub === s.slug}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </FilterGroup>
      )}

      {result.brands.length > 0 && (
        <FilterGroup title="Марка">
          <ul className="space-y-1">
            {result.brands.map((b) => {
              const active = activeBrands.includes(b.name);
              return (
                <li key={b.name}>
                  <Link
                    href={toggleBrand(b.name)}
                    className="flex items-center justify-between gap-3 py-1.5 text-[14px] text-text hover:text-white"
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-4 w-4 items-center justify-center ring-1 ${active ? "bg-accent ring-accent" : "ring-line"}`}
                        aria-hidden="true"
                      >
                        {active && <span className="h-1.5 w-1.5 bg-white" />}
                      </span>
                      {b.name}
                    </span>
                    <span className="text-[12px] text-dim">{b.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      )}

      {result.facets.map((g) => (
        <FilterGroup key={g.key} title={g.label}>
          <ul className="space-y-1">
            {g.values.map((v) => (
              <li key={v.value}>
                <Link
                  href={toggleFacet(g.key, v.value)}
                  className={`flex items-center justify-between gap-3 py-1.5 text-[14px] hover:text-white ${v.count || v.active ? "text-text" : "pointer-events-none text-dim"}`}
                  aria-current={v.active ? "true" : undefined}
                  aria-disabled={!v.count && !v.active ? true : undefined}
                  rel="nofollow"
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`flex h-4 w-4 items-center justify-center ring-1 ${v.active ? "bg-accent ring-accent" : "ring-line"}`} aria-hidden="true">
                      {v.active && <span className="h-1.5 w-1.5 bg-white" />}
                    </span>
                    {v.value}
                  </span>
                  <span className="text-[12px] text-dim">{v.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </FilterGroup>
      ))}

      {category && (
        <FilterGroup title="Цена">
          <div className="flex flex-wrap gap-2">
            {category.priceRanges.map((r, i) => (
              <Link
                key={i}
                href={toggleRange(i)}
                className="chip"
                data-active={query.ranges?.includes(i) ?? false}
              >
                {rangeLabel(r)}
              </Link>
            ))}
          </div>
        </FilterGroup>
      )}

      {hasFilters && (
        <Link href={basePath} className="flex items-center gap-2 text-[13px] uppercase tracking-wide text-accent-ink hover:text-white">
          <X className="h-4 w-4" /> Изчисти филтрите
        </Link>
      )}
    </div>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block" aria-label="Филтри">
        {filters}
      </aside>

      <div>
        <details className="mb-6 lg:hidden">
          <summary className="btn btn-ghost btn-sm w-full list-none [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="h-4 w-4" /> Филтри{chips.length ? ` (${chips.length})` : ""}
          </summary>
          <div className="mt-4 bg-surface-2 p-5">{filters}</div>
        </details>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[14px] text-muted">
            {showSearchSummary && query.q ? (
              <>
                Резултати за „<span className="text-white">{query.q}</span>“: {result.total}
              </>
            ) : (
              <>
                <span className="font-display text-white">{result.total}</span> продукта
              </>
            )}
          </p>
          <nav aria-label="Подреждане" className="flex flex-wrap gap-2">
            {sortOptions.map((o) => (
              <Link
                key={o.key}
                href={hrefWith(basePath, params, { sort: o.key === "recommended" ? null : o.key })}
                className="chip !h-8 !text-[12px]"
                data-active={query.sort === o.key}
              >
                {o.label}
              </Link>
            ))}
          </nav>
        </div>

        {chips.length > 0 && (
          <ul className="mb-6 flex flex-wrap gap-2" aria-label="Избрани филтри">
            {chips.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="chip !h-8 !text-[12px]" data-active="true" aria-label={`Премахни филтъра ${c.label}`}>
                  {c.label} <X className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
            <li>
              <Link href={basePath} className="flex h-8 items-center px-2 text-[12px] uppercase tracking-wide text-accent-ink hover:text-white">
                Изчисти филтрите
              </Link>
            </li>
          </ul>
        )}

        {result.items.length ? (
          <ProductGrid products={result.items} />
        ) : (
          <div className="bg-surface-2 p-10 text-center">
            <p className="h-display text-[20px]">Няма продукт с тази комбинация</p>
            <p className="mt-2 text-muted">Опитайте с по-малко филтри или ни пишете — ще намерим подходящ вариант.</p>
            <Link href="/zapitvane?tema=nov-kompyutar" className="btn btn-primary btn-sm mt-6">
              Изпрати запитване
            </Link>
          </div>
        )}

        {result.pages > 1 && (
          <nav aria-label="Страници" className="mt-10 flex flex-wrap justify-center gap-2">
            {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={hrefWith(basePath, params, { page: n === 1 ? null : String(n) })}
                className="chip !w-10 justify-center !px-0"
                data-active={n === result.page}
                aria-current={n === result.page ? "page" : undefined}
              >
                {n}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-display text-[13px] uppercase tracking-[1.5px] text-muted">
        <span className="marker" /> {title}
      </h2>
      {children}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]" aria-busy="true">
      <div className="hidden h-96 animate-pulse bg-surface-2 lg:block" />
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-[440px] animate-pulse bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

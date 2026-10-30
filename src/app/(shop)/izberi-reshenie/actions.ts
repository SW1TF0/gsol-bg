"use server";

import { facetDefs, type FacetKey } from "@/lib/facets";
import { getCategory, queryProducts, rangeLabel } from "@/lib/catalog";
import { shelves } from "./shelves";

export type FunnelPreview = {
  total: number;
  ranges: { index: number; label: string; count: number }[];
  steps: { key: FacetKey; label: string; values: { value: string; count: number }[] }[];
  href: string;
};

/** Живият брояч: колко продукта отговарят на избора досега и какви са следващите въпроси */
export async function funnelPreview(
  shelfId: string,
  ranges: number[],
  facets: Partial<Record<FacetKey, string[]>>,
): Promise<FunnelPreview | null> {
  const shelf = shelves.find((s) => s.id === shelfId);
  if (!shelf) return null;
  const category = await getCategory(shelf.category);
  if (!category) return null;
  const clean: Partial<Record<FacetKey, string[]>> = {};
  for (const def of facetDefs) {
    const v = facets[def.key]?.filter((x) => typeof x === "string" && x.length < 80).slice(0, 12);
    if (v?.length) clean[def.key] = v;
  }
  const validRanges = ranges.filter((i) => Number.isInteger(i) && i >= 0 && i < category.priceRanges.length);

  const result = await queryProducts({ category: shelf.category, sub: shelf.sub, ranges: validRanges, facets: clean, perPage: 1 });
  const available = result.facets.filter((g) => g.key !== "stock");
  const preferred = shelf.steps.flatMap((k) => available.filter((g) => g.key === k));
  const steps = (preferred.length ? preferred : available.slice(0, 2)).map((g) => ({
    key: g.key,
    label: g.label,
    values: g.values.map((v) => ({ value: v.value, count: v.count })),
  }));

  const params = new URLSearchParams();
  if (shelf.sub && !shelf.path) params.set("sub", shelf.sub);
  if (validRanges.length) params.set("range", [...validRanges].sort().join("|"));
  for (const [k, v] of Object.entries(clean)) params.set(k, v.join("|"));
  const qs = params.toString();

  return {
    total: result.total,
    ranges: category.priceRanges.map((r, index) => ({ index, label: rangeLabel(r), count: result.rangeCounts[index] ?? 0 })),
    steps,
    href: `${shelf.path ?? `/katalog/${shelf.category}`}${qs ? `?${qs}` : ""}`,
  };
}

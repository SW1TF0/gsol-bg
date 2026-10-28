import { formatPrice } from "@/lib/format";

export function describeDiscount(p: { discount_type: string; percent: number | null; amount_cents: number | null }) {
  if (p.discount_type === "percent") return `${Number(p.percent)}%`;
  if (p.discount_type === "fixed") return formatPrice(p.amount_cents ?? 0);
  return "Безплатна доставка";
}

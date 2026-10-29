import type { LineId } from "./policy.ts";

// Цена на машина: частите по доставна цена + фиксирана надценка на машината (не процент на част).
// Същата формула е и в базата (private.machine_price) — от нея идват цените в сайта и в конфигуратора;
// портата сравнява двете при всеки прогон. Числата са в базата, не тук: хранилището е публично.

export type PricingParams = {
  /** Разходи на всяка машина: сглобяване, Windows, драйвери, BIOS, тест, опаковка… */
  fixed_costs_cents: Record<string, number>;
  /** Гаранционен резерв, % от частите */
  warranty_pct: number;
  /** Такса за плащане, % от крайната цена */
  payment_fee_pct: number;
  /** Надценка по линия */
  markup_cents: Record<LineId, number>;
  /** Добавка за линията */
  line_addon_cents: Partial<Record<LineId, number>>;
  /** Труд: max(минимум, % от частите) */
  labor: { min_cents: number; pct: number };
  /** Закръгляне на …9: през малка стъпка до прага, през голяма над него (в евро) */
  rounding: { threshold_eur: number; small_step_eur: number; large_step_eur: number };
};

/** Закръгля нагоре до цена, завършваща на 9 (1234 → 1239, 2345 → 2399) */
export function roundToNine(euros: number, r: PricingParams["rounding"]) {
  const step = euros <= r.threshold_eur ? r.small_step_eur : r.large_step_eur;
  return Math.ceil((euros + 1) / step) * step - 1;
}

export function machinePrice(partsCents: number, line: LineId, p: PricingParams) {
  const fixed = Object.values(p.fixed_costs_cents).reduce((s, v) => s + v, 0);
  const warranty = Math.round((partsCents * p.warranty_pct) / 100);
  const labor = Math.max(p.labor.min_cents, Math.round((partsCents * p.labor.pct) / 100));
  const subtotal = partsCents + fixed + warranty + p.markup_cents[line] + (p.line_addon_cents[line] ?? 0) + labor;
  // −1e-7: делението с плаваща запетая не бива да вдигне точна сума с цял цент (базата смята точно)
  const gross = Math.ceil(subtotal / (1 - p.payment_fee_pct / 100) - 1e-7);
  return roundToNine(Math.ceil(gross / 100), p.rounding) * 100;
}

/** Проверка на параметрите, преди да се запишат от админа */
export function validatePricing(value: unknown): PricingParams | null {
  const v = value as PricingParams | null;
  const nonNeg = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (!v || typeof v !== "object") return null;
  if (!v.fixed_costs_cents || !Object.values(v.fixed_costs_cents).every(nonNeg)) return null;
  if (![v.warranty_pct, v.payment_fee_pct, v.labor?.min_cents, v.labor?.pct].every(nonNeg) || v.payment_fee_pct >= 50) return null;
  if (!v.markup_cents || !(["office", "basic", "izbor", "premium"] as const).every((l) => nonNeg(v.markup_cents[l]))) return null;
  if (!v.line_addon_cents || !Object.values(v.line_addon_cents).every(nonNeg)) return null;
  const r = v.rounding;
  if (!r || ![r.threshold_eur, r.small_step_eur, r.large_step_eur].every((n) => nonNeg(n) && n > 0)) return null;
  return v;
}

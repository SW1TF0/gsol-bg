// Промо кодове: отстъпката се изчислява в базата (private.compute_quote / place_order).
// Тук са само общите помощници — нормализиране, съобщения за грешки и масово генериране.

export type PromoFailure =
  | "invalid"
  | "inactive"
  | "not_started"
  | "expired"
  | "exhausted"
  | "customer_limit"
  | "first_order_only"
  | "not_allowed"
  | "min_subtotal"
  | "no_eligible_items";

export const promoMessages: Record<PromoFailure, string> = {
  invalid: "Няма такъв промо код.",
  inactive: "Този промо код не е активен.",
  not_started: "Този промо код още не е активен.",
  expired: "Този промо код е изтекъл.",
  exhausted: "Този промо код вече е използван максималния брой пъти.",
  customer_limit: "Вече сте използвали този промо код.",
  first_order_only: "Този промо код важи само за първа поръчка.",
  not_allowed: "Този промо код не е предназначен за вашия имейл.",
  min_subtotal: "Сумата на поръчката е под минималната за този код.",
  no_eligible_items: "Промо кодът не важи за продуктите в количката.",
};

export function promoMessage(reason: string | null | undefined) {
  return promoMessages[(reason ?? "invalid") as PromoFailure] ?? promoMessages.invalid;
}

export function normalizeCode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/** Генерира уникални кодове с префикс, напр. GSOL-7KQ2M9 — за масово създаване. */
export function generateCodes(prefix: string, count: number, length = 6, existing = new Set<string>()) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без 0/O и 1/I, за да не се бъркат
  const clean = normalizeCode(prefix).replace(/[^A-Z0-9]/g, "");
  const out = new Set<string>();
  const bytes = new Uint32Array(length);
  while (out.size < count) {
    crypto.getRandomValues(bytes);
    const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    const code = clean ? `${clean}-${body}` : body;
    if (!existing.has(code)) out.add(code);
  }
  return [...out];
}

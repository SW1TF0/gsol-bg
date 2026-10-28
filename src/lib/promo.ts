// Изчисляване на промо кодове. Чиста логика без база данни: ползва се и в количката,
// и при създаване на поръчката (там сървърът зарежда кода и историята от Supabase).

export type DiscountType = "percent" | "fixed" | "free_shipping";

export type PromoCode = {
  id: number;
  code: string;
  discountType: DiscountType;
  percent: number | null;
  amountCents: number | null;
  scope: "order" | "categories" | "brands" | "products";
  scopeCategoryIds: number[];
  scopeBrands: string[];
  scopeProductIds: number[];
  excludePromoItems: boolean;
  minSubtotalCents: number;
  maxDiscountCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  firstOrderOnly: boolean;
  allowedEmails: string[];
  isActive: boolean;
  timesUsed: number;
};

export type PromoLine = {
  productId: number;
  categoryId: number | null;
  brand: string | null;
  isPromo: boolean;
  unitPriceCents: number;
  qty: number;
};

/** Данни за клиента; липсват, докато клиентът не е въвел имейл. */
export type PromoCustomer = {
  email: string;
  previousOrders: number;
  redemptionsOfThisCode: number;
};

export type PromoFailure =
  | "inactive"
  | "not_started"
  | "expired"
  | "exhausted"
  | "customer_limit"
  | "first_order_only"
  | "not_allowed"
  | "min_subtotal"
  | "no_eligible_items";

export type PromoResult =
  | {
      ok: true;
      code: string;
      discountCents: number;
      shippingDiscountCents: number;
      /** Отстъпката, разпределена по редовете (индексите съвпадат с lines). */
      lineDiscounts: number[];
    }
  | { ok: false; code: string; reason: PromoFailure; message: string };

const messages: Record<PromoFailure, string> = {
  inactive: "Този промо код не е валиден.",
  not_started: "Този промо код още не е активен.",
  expired: "Този промо код е изтекъл.",
  exhausted: "Този промо код вече е използван максималния брой пъти.",
  customer_limit: "Вече сте използвали този промо код.",
  first_order_only: "Този промо код важи само за първа поръчка.",
  not_allowed: "Този промо код не е предназначен за вашия имейл.",
  min_subtotal: "Сумата на поръчката е под минималната за този код.",
  no_eligible_items: "Промо кодът не важи за продуктите в количката.",
};

export function normalizeCode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function fail(promo: PromoCode, reason: PromoFailure, extra = ""): PromoResult {
  return { ok: false, code: promo.code, reason, message: messages[reason] + extra };
}

function isEligible(promo: PromoCode, line: PromoLine) {
  if (promo.excludePromoItems && line.isPromo) return false;
  switch (promo.scope) {
    case "categories":
      return line.categoryId !== null && promo.scopeCategoryIds.includes(line.categoryId);
    case "brands":
      return line.brand !== null && promo.scopeBrands.some((b) => b.toLowerCase() === line.brand!.toLowerCase());
    case "products":
      return promo.scopeProductIds.includes(line.productId);
    default:
      return true;
  }
}

/** Разпределя сума пропорционално; остатъкът от закръглянето отива към най-големия ред. */
function distribute(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum || !total) return weights.map(() => 0);
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  const remainder = total - parts.reduce((a, b) => a + b, 0);
  const largest = weights.indexOf(Math.max(...weights));
  parts[largest] += remainder;
  return parts;
}

export function applyPromo(
  promo: PromoCode,
  lines: PromoLine[],
  opts: { shippingCents: number; now?: Date; customer?: PromoCustomer; formatCents?: (c: number) => string },
): PromoResult {
  const now = opts.now ?? new Date();

  if (!promo.isActive) return fail(promo, "inactive");
  if (promo.startsAt && now < new Date(promo.startsAt)) return fail(promo, "not_started");
  if (promo.endsAt && now > new Date(promo.endsAt)) return fail(promo, "expired");
  if (promo.usageLimit !== null && promo.timesUsed >= promo.usageLimit) return fail(promo, "exhausted");

  const customer = opts.customer;
  if (customer) {
    const email = customer.email.trim().toLowerCase();
    if (promo.allowedEmails.length && !promo.allowedEmails.some((e) => e.toLowerCase() === email)) {
      return fail(promo, "not_allowed");
    }
    if (promo.perCustomerLimit !== null && customer.redemptionsOfThisCode >= promo.perCustomerLimit) {
      return fail(promo, "customer_limit");
    }
    if (promo.firstOrderOnly && customer.previousOrders > 0) return fail(promo, "first_order_only");
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPriceCents * l.qty, 0);
  if (subtotal < promo.minSubtotalCents) {
    const fmt = opts.formatCents;
    return fail(promo, "min_subtotal", fmt ? ` Минимум: ${fmt(promo.minSubtotalCents)}.` : "");
  }

  const eligibleTotals = lines.map((l) => (isEligible(promo, l) ? l.unitPriceCents * l.qty : 0));
  const eligibleSubtotal = eligibleTotals.reduce((a, b) => a + b, 0);

  if (promo.discountType === "free_shipping") {
    if (promo.scope !== "order" && eligibleSubtotal === 0) return fail(promo, "no_eligible_items");
    return {
      ok: true,
      code: promo.code,
      discountCents: 0,
      shippingDiscountCents: opts.shippingCents,
      lineDiscounts: lines.map(() => 0),
    };
  }

  if (eligibleSubtotal === 0) return fail(promo, "no_eligible_items");

  let discount =
    promo.discountType === "percent"
      ? Math.round((eligibleSubtotal * (promo.percent ?? 0)) / 100)
      : Math.min(promo.amountCents ?? 0, eligibleSubtotal);
  if (promo.maxDiscountCents !== null) discount = Math.min(discount, promo.maxDiscountCents);

  return {
    ok: true,
    code: promo.code,
    discountCents: discount,
    shippingDiscountCents: 0,
    lineDiscounts: distribute(discount, eligibleTotals),
  };
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

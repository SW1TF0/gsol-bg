import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPromo, generateCodes, normalizeCode, type PromoCode, type PromoLine } from "./promo.ts";

const base: PromoCode = {
  id: 1,
  code: "GSOL10",
  discountType: "percent",
  percent: 10,
  amountCents: null,
  scope: "order",
  scopeCategoryIds: [],
  scopeBrands: [],
  scopeProductIds: [],
  excludePromoItems: false,
  minSubtotalCents: 0,
  maxDiscountCents: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perCustomerLimit: null,
  firstOrderOnly: false,
  allowedEmails: [],
  isActive: true,
  timesUsed: 0,
};

const laptop: PromoLine = { productId: 10, categoryId: 1, brand: "Lenovo", isPromo: false, unitPriceCents: 60000, qty: 1 };
const mouse: PromoLine = { productId: 20, categoryId: 4, brand: "Logitech", isPromo: true, unitPriceCents: 2999, qty: 2 };
const now = new Date("2026-11-01T12:00:00Z");

test("процентът се смята върху цялата поръчка и се разпределя по редовете", () => {
  const r = applyPromo(base, [laptop, mouse], { shippingCents: 690, now });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.discountCents, 6600); // 10% от 659,98 € = 66,00 €
  assert.equal(r.lineDiscounts.reduce((a, b) => a + b, 0), r.discountCents);
});

test("фиксираната сума не надхвърля стойността на допустимите продукти", () => {
  const promo = { ...base, discountType: "fixed" as const, percent: null, amountCents: 10000, scope: "brands" as const, scopeBrands: ["logitech"] };
  const r = applyPromo(promo, [laptop, mouse], { shippingCents: 0, now });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.discountCents, 5998);
    assert.deepEqual(r.lineDiscounts, [0, 5998]);
  }
});

test("таванът на отстъпката се спазва", () => {
  const r = applyPromo({ ...base, percent: 50, maxDiscountCents: 5000 }, [laptop], { shippingCents: 0, now });
  assert.ok(r.ok && r.discountCents === 5000);
});

test("продуктите в промоция могат да се изключат", () => {
  const r = applyPromo({ ...base, excludePromoItems: true }, [mouse], { shippingCents: 0, now });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "no_eligible_items");
});

test("обхват по категория", () => {
  const r = applyPromo({ ...base, scope: "categories", scopeCategoryIds: [1] }, [laptop, mouse], { shippingCents: 0, now });
  assert.ok(r.ok && r.discountCents === 6000);
});

test("безплатна доставка", () => {
  const r = applyPromo({ ...base, discountType: "free_shipping", percent: null }, [mouse], { shippingCents: 690, now });
  assert.ok(r.ok && r.shippingDiscountCents === 690 && r.discountCents === 0);
});

test("срокове, лимити и минимална сума", () => {
  const lines = [mouse];
  const opts = { shippingCents: 0, now };
  const reason = (p: Partial<PromoCode>, o = opts) => {
    const r = applyPromo({ ...base, ...p }, lines, o);
    return r.ok ? "ok" : r.reason;
  };
  assert.equal(reason({ isActive: false }), "inactive");
  assert.equal(reason({ startsAt: "2026-12-01T00:00:00Z" }), "not_started");
  assert.equal(reason({ endsAt: "2026-10-01T00:00:00Z" }), "expired");
  assert.equal(reason({ usageLimit: 5, timesUsed: 5 }), "exhausted");
  assert.equal(reason({ minSubtotalCents: 10000 }), "min_subtotal");
  const customer = { email: "Ivan@Example.com", previousOrders: 2, redemptionsOfThisCode: 1 };
  assert.equal(reason({ perCustomerLimit: 1 }, { ...opts, customer } as never), "customer_limit");
  assert.equal(reason({ firstOrderOnly: true }, { ...opts, customer } as never), "first_order_only");
  assert.equal(reason({ allowedEmails: ["maria@example.com"] }, { ...opts, customer } as never), "not_allowed");
  assert.equal(reason({ allowedEmails: ["ivan@example.com"] }, { ...opts, customer } as never), "ok");
});

test("генериране на уникални кодове", () => {
  const codes = generateCodes("gsol ", 200);
  assert.equal(new Set(codes).size, 200);
  assert.ok(codes.every((c) => /^GSOL-[A-HJ-NP-Z2-9]{6}$/.test(c)));
  assert.equal(normalizeCode("  gsol 10 "), "GSOL10");
});

"use server";

import { publicClient } from "@/lib/supabase/clients";
import { promoMessage } from "@/lib/promo";
import type { CheckoutInput, PlaceOrderResult, Quote, ShippingMethod } from "@/lib/orders";

type CartItem = { productId: number; qty: number };

function toItems(items: CartItem[]) {
  return items
    .filter((i) => Number.isInteger(i.productId) && i.productId > 0)
    .slice(0, 50)
    .map((i) => ({ product_id: i.productId, qty: Math.max(1, Math.min(99, Math.round(i.qty) || 1)) }));
}

/** Оферта за количката: реални цени, отстъпка по промо кода и доставка — всичко от базата. */
export async function quoteCart(items: CartItem[], code: string | null, shipping: ShippingMethod = "econt_office") {
  const { data, error } = await publicClient().rpc("quote_order", {
    p_items: toItems(items),
    p_code: code ?? undefined,
    p_shipping_method: shipping,
  });
  if (error) throw new Error("Офертата не можа да се изчисли. Опитайте отново.");
  const quote = data as unknown as Quote;
  return {
    ...quote,
    promoError: quote.promo && !quote.promo.ok ? promoMessage(quote.promo.reason) : null,
  };
}

// Грешките от place_order идват като кодове (raise exception 'INVALID_PHONE' и т.н.)
const errorMap: Record<string, { error: string; field?: Exclude<PlaceOrderResult, { ok: true }>["field"] }> = {
  INVALID_EMAIL: { error: "Въведете валиден имейл.", field: "email" },
  INVALID_FIRST_NAME: { error: "Въведете име.", field: "first_name" },
  INVALID_LAST_NAME: { error: "Въведете фамилия.", field: "last_name" },
  INVALID_PHONE: { error: "Въведете валиден телефон, напр. 0888 123 456.", field: "phone" },
  INVALID_SHIPPING: { error: "Изберете начин на доставка.", field: "shipping_method" },
  INVALID_CITY: { error: "Въведете населено място.", field: "shipping_city" },
  INVALID_ADDRESS: { error: "Въведете адрес за доставка.", field: "shipping_address" },
  INVALID_OFFICE: { error: "Въведете офис на Еконт.", field: "econt_office" },
  INVALID_PAYMENT: { error: "Изберете начин на плащане.", field: "payment_method" },
  INVALID_INVOICE: { error: "Проверете данните за фактура: фирма, ЕИК (9–13 цифри) и МОЛ.", field: "invoice" },
  EMPTY_CART: { error: "Количката е празна.", field: "items" },
  ITEMS_UNAVAILABLE: {
    error: "Някой от продуктите вече не е наличен. Върнете се в количката, за да я обновите.",
    field: "items",
  },
};

export async function placeOrder(items: CartItem[], input: CheckoutInput): Promise<PlaceOrderResult> {
  // Ботовете попълват всички полета — тихо отказваме
  if (input.website) return { ok: false, error: "Поръчката не можа да бъде изпратена." };
  if (!input.terms) return { ok: false, error: "Трябва да приемете Общите условия.", field: "terms" };

  const order = {
    email: input.email,
    phone: input.phone,
    first_name: input.first_name,
    last_name: input.last_name,
    shipping_method: input.shipping_method,
    shipping_city: input.shipping_city,
    shipping_address: input.shipping_method === "econt_address" ? input.shipping_address : null,
    econt_office: input.shipping_method === "econt_office" ? input.econt_office : null,
    payment_method: input.payment_method,
    invoice: input.invoice ?? null,
    note: input.note ?? null,
    marketing_opt_in: Boolean(input.marketing_opt_in),
    promo_code: input.promo_code || null,
  };

  const { data, error } = await publicClient().rpc("place_order", { p_order: order, p_items: toItems(items) });

  if (error) {
    const code = error.message.trim();
    if (code.startsWith("PROMO_")) {
      return { ok: false, error: promoMessage(code.slice(6).toLowerCase()), field: "promo_code" };
    }
    const known = errorMap[code];
    if (known) return { ok: false, ...known };
    console.error("place_order", error);
    return { ok: false, error: "Възникна грешка при изпращането. Опитайте отново или ни се обадете." };
  }

  const result = data as { number: string; total_cents: number };
  return { ok: true, number: result.number, total_cents: result.total_cents };
}

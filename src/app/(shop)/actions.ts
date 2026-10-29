"use server";

import { after } from "next/server";
import { publicClient } from "@/lib/supabase/clients";
import { sendOrderEmails, siteUrl } from "@/lib/email/notify";
import { checkEcontAddress, econtWorker, getEcontAddressBook, type EcontAddressParts } from "@/lib/econt";
import { promoMessage } from "@/lib/promo";
import type {
  CheckoutInput,
  CheckoutShipping,
  PlaceOrderResult,
  Quote,
  RafflePreview,
  ShippingMethod,
} from "@/lib/orders";

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
  return withExtras(data as unknown as Quote, items);
}

/**
 * Оферта за страницата на поръчката: доставката е цената от Еконт за избрания офис/град, тегло и плащане.
 * Ако базата още няма тази цена, будим работника да я вземе от Еконт и питаме отново.
 */
export async function quoteCheckout(items: CartItem[], code: string | null, shipping: CheckoutShipping) {
  const p_items = toItems(items);
  const p_shipping = {
    method: shipping.method,
    city_id: shipping.cityId,
    office_code: shipping.officeCode,
    payment: shipping.payment,
  };
  const ask = () => publicClient().rpc("quote_checkout", { p_items, p_code: code ?? undefined, p_shipping });

  let { data, error } = await ask();
  if (!error && (data as Quote).shipping_source === "flat" && !(data as Quote).shipping_pending) {
    const priced = await econtWorker<{ cents: number | null }>({ action: "price", items: p_items, code, shipping: p_shipping });
    if (priced?.cents != null) ({ data, error } = await ask());
  }
  if (error) throw new Error("Офертата не можа да се изчисли. Опитайте отново.");
  return withExtras(data as unknown as Quote, items);
}

async function withExtras(quote: Quote, items: CartItem[]) {
  // Колко участия би донесла поръчката в активните томболи (сумата на продуктите след отстъпка)
  const { data: raffles } = await publicClient().rpc("raffle_preview", {
    p_amount_cents: quote.subtotal_cents - quote.discount_cents,
    p_items: toItems(items),
  });

  return {
    ...quote,
    promoError: quote.promo && !quote.promo.ok ? promoMessage(quote.promo.reason) : null,
    raffles: (raffles as RafflePreview[] | null) ?? [],
  };
}

/** Улиците и кварталите на място от списъка на Еконт. null — Еконт не отговори (тогава адресът е свободен текст). */
export async function econtAddressBook(cityId: number) {
  if (!Number.isInteger(cityId) || cityId <= 0) return null;
  try {
    return await getEcontAddressBook(cityId);
  } catch {
    return null;
  }
}

/** Частите на адреса без празните; дължините — като в базата */
function addressParts(raw: CheckoutInput["econt_address"]): EcontAddressParts | null {
  if (!raw) return null;
  const limits = { street: 120, num: 20, quarter: 120, other: 200 } as const;
  const parts: EcontAddressParts = {};
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const value = String(raw[key] ?? "").trim().slice(0, limits[key]);
    if (value) parts[key] = value;
  }
  return Object.keys(parts).length ? parts : null;
}

/** Адресът на един ред — за писмата и админа */
function addressLine(p: EcontAddressParts) {
  return [p.street && p.num ? `${p.street} ${p.num}` : p.street, p.quarter, p.other].filter(Boolean).join(", ");
}

// Грешките от place_order идват като кодове (raise exception 'INVALID_PHONE' и т.н.)
const errorMap: Record<string, { error: string; field?: Exclude<PlaceOrderResult, { ok: true }>["field"] }> = {
  INVALID_EMAIL: { error: "Въведете валиден имейл.", field: "email" },
  INVALID_FIRST_NAME: { error: "Въведете име.", field: "first_name" },
  INVALID_LAST_NAME: { error: "Въведете фамилия.", field: "last_name" },
  INVALID_PHONE: { error: "Въведете валиден телефон, напр. 0888 123 456.", field: "phone" },
  INVALID_SHIPPING: { error: "Изберете начин на доставка.", field: "shipping_method" },
  INVALID_CITY: { error: "Изберете населено място от списъка.", field: "shipping_city" },
  INVALID_ADDRESS: { error: "Въведете адрес за доставка.", field: "shipping_address" },
  INVALID_OFFICE: { error: "Изберете офис на Еконт от списъка.", field: "econt_office" },
  INVALID_PAYMENT: { error: "Изберете начин на плащане.", field: "payment_method" },
  COD_LIMIT: {
    error: "Над 5 112,92 € наложеният платеж не е разрешен по закон. Изберете банков превод.",
    field: "payment_method",
  },
  INVALID_INVOICE: {
    error: "Проверете данните за фактура: за фирма — име, ЕИК/Булстат (9 или 13 цифри), МОЛ и адрес; ДДС № е BG и цифри; ЕГН е 10 цифри.",
    field: "invoice",
  },
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

  // Адрес по полетата на Еконт: питаме Еконт дали го знае, преди да приемем поръчката —
  // иначе товарителницата ще се провали по-късно. Ако Еконт не отговори, поръчката минава.
  const parts = input.shipping_method === "econt_address" ? addressParts(input.econt_address) : null;
  const shippingAddress = parts ? addressLine(parts) : input.shipping_address;
  if (parts && input.econt_city_id) {
    const { data: city } = await publicClient()
      .from("econt_cities")
      .select("name, post_code")
      .eq("id", input.econt_city_id)
      .maybeSingle();
    const check = city ? await checkEcontAddress({ name: city.name, postCode: city.post_code }, parts) : null;
    if (check && !check.ok) {
      return {
        ok: false,
        field: "shipping_address",
        error: `Еконт не намира този адрес: ${check.message} Проверете го или изберете доставка до офис.`,
      };
    }
  }

  const order = {
    email: input.email,
    phone: input.phone,
    first_name: input.first_name,
    last_name: input.last_name,
    shipping_method: input.shipping_method,
    shipping_city: input.shipping_city,
    econt_city_id: input.econt_city_id ?? null,
    econt_office_code: input.shipping_method === "econt_office" ? (input.econt_office_code ?? null) : null,
    shipping_address: input.shipping_method === "econt_address" ? shippingAddress : null,
    econt_address: parts,
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

  const result = data as { order_id: number; number: string; total_cents: number };
  // Писмата тръгват след отговора — клиентът не чака пощата
  const url = await siteUrl();
  after(() => sendOrderEmails({ id: result.order_id, number: result.number }, order, url));
  // Товарителницата: будим работника веднага (иначе будилникът в базата го прави до 5 минути)
  after(() => econtWorker({ action: "tick" }, 30000));
  return { ok: true, number: result.number, total_cents: result.total_cents };
}

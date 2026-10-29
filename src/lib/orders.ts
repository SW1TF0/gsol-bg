// Общи типове за офертата и поръчката (ползват се и от клиента, и от сървъра).

export type ShippingMethod = "econt_office" | "econt_address";
export type PaymentMethod = "cod" | "bank";

export type QuoteLine = {
  product_id: number;
  slug: string;
  name: string;
  sku: string | null;
  image: string | null;
  unit_price_cents: number;
  qty: number;
  discount_cents: number;
  eligible: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  missing: number[];
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  shipping_discount_cents: number;
  total_cents: number;
  /** econt — цена от Еконт; flat — цената от настройките (Еконт не е отговорил); free — безплатна */
  shipping_source?: "econt" | "flat" | "free";
  /** Още не е избран офис/град — доставката не може да се сметне */
  shipping_pending?: boolean;
  weight_kg?: number;
  promo: {
    code: string;
    id: number | null;
    ok: boolean;
    reason: string | null;
    type: "percent" | "fixed" | "free_shipping" | null;
    min_subtotal_cents: number | null;
  } | null;
};

/** Законовият лимит за плащане в брой — над него наложеният платеж не се предлага (и базата го отказва) */
export const COD_LIMIT_CENTS = 511292;

export type RafflePreview = { slug: string; title: string; entries: number; min_order_cents: number };

/** Фактура: на физическо лице (ЕГН по избор) или на фирма. Старите поръчки са без type — фирма. */
export type InvoiceInput =
  | { type: "person"; name: string; egn?: string; address: string }
  | { type?: "company"; company: string; eik: string; vat?: string; mol: string; address: string };

/** Фактурата на един ред — за писмата и админа */
export function invoiceLine(i: InvoiceInput) {
  return i.type === "person"
    ? `Физическо лице: ${i.name}${i.egn ? `, ЕГН ${i.egn}` : ""}, ${i.address}`
    : `${i.company}, ЕИК ${i.eik}${i.vat ? `, ДДС № ${i.vat}` : ""}, МОЛ ${i.mol}, ${i.address}`;
}

/** Изборът за доставка в чекаута — по него базата смята цената с Еконт */
export type CheckoutShipping = {
  method: ShippingMethod;
  cityId: number | null;
  officeCode: string | null;
  payment: PaymentMethod;
};

export type CheckoutInput = {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  shipping_method: ShippingMethod;
  shipping_city: string;
  econt_city_id?: number | null;
  econt_office_code?: string | null;
  /** Адресът по полетата на Еконт: улица + номер или квартал + блок/вход; „other“ — подробностите */
  econt_address?: { street?: string; num?: string; quarter?: string; other?: string } | null;
  shipping_address?: string;
  econt_office?: string;
  payment_method: PaymentMethod;
  invoice?: InvoiceInput | null;
  note?: string;
  marketing_opt_in?: boolean;
  promo_code?: string | null;
  terms: boolean;
  website?: string; // капан за ботове — трябва да остане празно
};

export type PlaceOrderResult =
  | { ok: true; number: string; total_cents: number }
  | { ok: false; error: string; field?: keyof CheckoutInput | "items" | "promo_code" };

export const orderStatusLabels: Record<string, string> = {
  new: "Нова",
  confirmed: "Потвърдена",
  processing: "Обработва се",
  shipped: "Изпратена",
  delivered: "Доставена",
  cancelled: "Отказана",
  returned: "Върната",
};

export const shippingLabels: Record<ShippingMethod, string> = {
  econt_office: "Еконт — до офис",
  econt_address: "Еконт — до адрес",
};

export const paymentLabels: Record<PaymentMethod, string> = {
  cod: "Наложен платеж",
  bank: "Банков превод",
};

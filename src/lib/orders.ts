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
  promo: {
    code: string;
    id: number | null;
    ok: boolean;
    reason: string | null;
    type: "percent" | "fixed" | "free_shipping" | null;
    min_subtotal_cents: number | null;
  } | null;
};

export type RafflePreview = { slug: string; title: string; entries: number; min_order_cents: number };

export type CheckoutInput = {
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  shipping_method: ShippingMethod;
  shipping_city: string;
  shipping_address?: string;
  econt_office?: string;
  payment_method: PaymentMethod;
  invoice?: { company: string; eik: string; vat?: string; mol: string; address: string } | null;
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

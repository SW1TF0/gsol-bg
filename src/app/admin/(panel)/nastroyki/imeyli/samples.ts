import type { SiteSettings } from "@/lib/settings";
import {
  inquiryAlert,
  orderConfirmation,
  orderStatusEmail,
  shopOrderAlert,
  type Customer,
  type Email,
  type Receipt,
} from "@/lib/email/templates";

// Примерни данни за прегледа на писмата в админа

const receipt: Receipt = {
  number: "GS-100123",
  created_at: "2026-10-29T10:30:00Z",
  subtotal_cents: 129800,
  discount_cents: 6490,
  shipping_cents: 690,
  total_cents: 124000,
  promo_code: "ESEN5",
  shipping_method: "econt_office",
  payment_method: "cod",
  items: [
    { name: "Лаптоп Lenovo IdeaPad Slim 5 14″", sku: "83DA003BBM", qty: 1, unit_price_cents: 119900, discount_cents: 5995, line_total_cents: 113905 },
    { name: "Безжична мишка Logitech M650", sku: "910-006263", qty: 1, unit_price_cents: 9900, discount_cents: 495, line_total_cents: 9405 },
  ],
  raffles: [{ slug: "primer", title: "Есенна томбола", entries: 3 }],
};

const customer: Customer = {
  first_name: "Иван",
  last_name: "Петров",
  email: "ivan@example.com",
  phone: "0888 123 456",
  shipping_city: "Кърджали",
  econt_office: "офис Възрожденци",
  note: "Моля, обадете се преди изпращане.",
};

export const emailSamples = [
  { id: "potvarzhdenie", label: "Потвърждение — наложен платеж", to: "клиента" },
  { id: "bankov-prevod", label: "Потвърждение — банков превод", to: "клиента" },
  { id: "izvestie", label: "Нова поръчка", to: "магазина" },
  { id: "zapitvane", label: "Ново запитване", to: "магазина" },
  { id: "izpratena", label: "Статус „Изпратена“", to: "клиента" },
] as const;

export type EmailSampleId = (typeof emailSamples)[number]["id"];

export function renderSample(id: EmailSampleId, settings: SiteSettings, siteUrl: string): Email {
  const ctx = { company: settings.company, siteUrl };
  switch (id) {
    case "potvarzhdenie":
      return orderConfirmation(ctx, receipt, customer, settings.bank);
    case "bankov-prevod":
      return orderConfirmation(ctx, { ...receipt, payment_method: "bank" }, customer, settings.bank);
    case "izvestie":
      return shopOrderAlert(ctx, receipt, customer, `${siteUrl}/admin/porachki`);
    case "zapitvane":
      return inquiryAlert(
        ctx,
        {
          topicLabel: "Диагностика и ремонт",
          name: "Мария Георгиева",
          contact: "0899 111 222",
          message: "Лаптопът се изключва сам след 10 минути работа и много шуми.",
          details: { city: "Момчилград", devices: "Лаптоп HP" },
          sourceUrl: "/zapitvane",
        },
        `${siteUrl}/admin/zapitvaniya`,
      );
    case "izpratena":
      return orderStatusEmail(
        ctx,
        { number: receipt.number, status: "shipped", first_name: customer.first_name, total_cents: receipt.total_cents },
        "Номер на пратката: 1051234567890",
      );
  }
}

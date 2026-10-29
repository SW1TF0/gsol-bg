import "server-only";
import { headers } from "next/headers";
import { publicClient } from "@/lib/supabase/clients";
import { getSettings } from "@/lib/settings-data";
import { sendEmail } from "./send";
import { inquiryAlert, orderConfirmation, shopOrderAlert, type Customer, type InquiryEmail, type Receipt } from "./templates";

// Кой какво получава: клиентът — потвърждение; магазинът (имейлът от „Настройки“) — известие.

/** Адресът на сайта за връзките в писмата: SITE_URL или адресът, от който е дошла заявката */
export async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "gsol.bg";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendOrderEmails(order: { id: number; number: string }, customer: Customer, url: string) {
  const db = publicClient();
  const [{ data }, { company, bank }] = await Promise.all([
    db.rpc("order_receipt", { p_number: order.number, p_email: customer.email }),
    getSettings(),
  ]);
  const receipt = data as Receipt | null;
  if (!receipt) {
    console.error(`[имейл] няма данни за поръчка ${order.number}`);
    return;
  }
  const ctx = { company, siteUrl: url };

  const [toCustomer, toShop] = await Promise.all([
    sendEmail(customer.email, orderConfirmation(ctx, receipt, customer, bank), {
      replyTo: company.email,
      idempotencyKey: `order-confirmation/${order.number}`,
    }),
    sendEmail(company.email, shopOrderAlert(ctx, receipt, customer, `${url}/admin/porachki/${order.id}`), {
      replyTo: customer.email,
      idempotencyKey: `order-alert/${order.number}`,
    }),
  ]);

  await Promise.all([
    db.rpc("log_order_email", { p_number: order.number, p_email: customer.email, p_kind: "confirmation", p_result: toCustomer }),
    db.rpc("log_order_email", { p_number: order.number, p_email: customer.email, p_kind: "shop_alert", p_result: toShop }),
  ]);
}

export async function sendInquiryAlert(inquiry: InquiryEmail, url: string) {
  const { company } = await getSettings();
  await sendEmail(company.email, inquiryAlert({ company, siteUrl: url }, inquiry, `${url}/admin/zapitvaniya`), {
    replyTo: inquiry.contact.includes("@") ? inquiry.contact : undefined,
  });
}

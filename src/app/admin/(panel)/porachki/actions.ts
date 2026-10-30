"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { getSettings } from "@/lib/settings-data";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/notify";
import { econtWorker } from "@/lib/econt";
import { notifiableStatuses, orderStatusEmail } from "@/lib/email/templates";

export type ActionState = { error?: string; ok?: boolean; email?: SendResult } | null;

export async function updateOrderStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db, user } = await requireStaff(["admin", "manager", "sales"]);
  const orderId = Number(form.get("order_id"));
  const status = String(form.get("status")) as Enums<"order_status">;
  if (!orderId || !Constants.public.Enums.order_status.includes(status)) return { error: "Невалиден статус." };

  const notify = form.get("notify") === "on" && notifiableStatuses.includes(status);
  const message = String(form.get("message") ?? "").trim().slice(0, 1000);

  const { data: before } = await db
    .from("orders")
    .select("status, number, email, first_name, total_cents")
    .eq("id", orderId)
    .single();
  if (!before) return { error: "Поръчката не е намерена." };
  if (before.status === status) return { ok: true };

  const { error } = await db.from("orders").update({ status }).eq("id", orderId);
  if (error) return { error: "Статусът не можа да се запише." };
  await db.from("order_events").insert({
    order_id: orderId,
    actor: user.id,
    type: "status",
    data: { from: before.status, to: status },
  });

  let email: SendResult | undefined;
  if (notify) {
    const { company } = await getSettings();
    email = await sendEmail(before.email, orderStatusEmail({ company, siteUrl: await siteUrl() }, { ...before, status }, message), {
      replyTo: company.email,
    });
    await db.from("order_events").insert({
      order_id: orderId,
      actor: user.id,
      type: "email",
      data: { kind: "status", status, result: email, ...(message ? { message } : {}) },
    });
  }
  refresh();
  return { ok: true, email };
}

export async function addOrderNote(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db, user } = await requireStaff();
  const orderId = Number(form.get("order_id"));
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  if (!orderId || !note) return { error: "Напишете бележка." };
  const { error } = await db.from("order_events").insert({ order_id: orderId, actor: user.id, type: "note", data: { text: note } });
  if (error) return { error: "Бележката не можа да се запише." };
  refresh();
  return { ok: true };
}

const shipmentErrors: Record<string, string> = {
  SHIPMENT_EXISTS: "Поръчката вече има товарителница.",
  NO_SHIPMENT: "Няма създадена товарителница за анулиране.",
  FORBIDDEN: "Нямате права за пратките.",
};

/** Товарителница: създаване, обновяване на статуса, анулиране. Работникът го изпълнява веднага. */
export async function shipmentAction(op: "create" | "refresh" | "cancel", orderId: number): Promise<ActionState> {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const { error } =
    op === "create"
      ? await db.rpc("econt_ship", { p_order_id: orderId })
      : op === "cancel"
        ? await db.rpc("econt_cancel", { p_order_id: orderId })
        : await db.rpc("econt_refresh", { p_order_id: orderId });
  if (error) return { error: shipmentErrors[error.message.trim()] ?? "Действието не мина. Опитайте отново." };
  await econtWorker({ action: "tick" }, 30000);
  refresh();
  return { ok: true };
}

const invoiceErrors: Record<string, string> = {
  REASON_REQUIRED: "Напишете основание за кредитното известие.",
  ALREADY_CREDITED: "Фактурата вече е кредитирана.",
  INVOICE_NOT_FOUND: "Фактурата не е намерена.",
  INVOICE_SERIES_FULL: "Серията номера е изчерпана — проверете „Фактури“.",
  FORBIDDEN: "Нямате права за това действие.",
};

/** „Издай фактура“ / „Издай проформа“ — номерът се дава тук; втори натиск връща същия документ */
export async function issueDocument(orderId: number, kind: "invoice" | "proforma"): Promise<{ id: number } | { error: string }> {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const { data, error } = await db.rpc("issue_invoice", { p_order_id: orderId, p_kind: kind });
  if (error) return { error: invoiceErrors[error.message.trim()] ?? "Документът не се издаде." };
  refresh();
  return { id: (data as { id: number }).id };
}

/** Грешна фактура се поправя с кредитно известие — не с презаписване */
export async function issueCreditNote(invoiceId: number, reason: string): Promise<{ id: number } | { error: string }> {
  const { db } = await requireStaff(["admin", "manager"]);
  const { data, error } = await db.rpc("issue_credit_note", { p_invoice_id: invoiceId, p_reason: reason });
  if (error) return { error: invoiceErrors[error.message.trim()] ?? "Кредитното известие не се издаде." };
  refresh();
  return { id: (data as { id: number }).id };
}

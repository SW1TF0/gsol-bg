"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { Constants, type Enums } from "@/lib/supabase/database.types";
import { getSettings } from "@/lib/settings-data";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/notify";
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

"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { Constants, type Enums } from "@/lib/supabase/database.types";

export type ActionState = { error?: string; ok?: boolean } | null;

export async function updateOrderStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db, user } = await requireStaff(["admin", "manager", "sales"]);
  const orderId = Number(form.get("order_id"));
  const status = String(form.get("status")) as Enums<"order_status">;
  if (!orderId || !Constants.public.Enums.order_status.includes(status)) return { error: "Невалиден статус." };

  const { data: before } = await db.from("orders").select("status").eq("id", orderId).single();
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
  refresh();
  return { ok: true };
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

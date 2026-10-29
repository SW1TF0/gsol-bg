"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { parseTags } from "@/lib/customers";

export type CustomerFormState = { ok?: boolean; error?: string; tags?: string[] } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function updateCustomer(_prev: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Невалиден клиент." };
  const note = String(form.get("note") ?? "").trim().slice(0, 4000);
  const tags = parseTags(String(form.get("tags") ?? ""));

  const { error } = await db.from("customers").update({ note: note || null, tags }).eq("id", id);
  if (error) return { error: "Промените не се записаха. Проверете дали имате права." };
  refresh();
  return { ok: true, tags };
}

/** Оттегляне на съгласието за маркетинг — по молба на клиента. Записване може да направи само клиентът. */
export async function unsubscribeCustomer(form: FormData) {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const id = String(form.get("id") ?? "");
  if (!UUID.test(id)) return;
  await db.from("customers").update({ marketing_opt_in: false }).eq("id", id);
  refresh();
}

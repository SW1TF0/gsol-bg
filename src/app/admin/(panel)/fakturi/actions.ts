"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";

export type InvoiceFormState = { ok?: boolean; error?: string } | null;

const text = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

export async function saveInvoiceSettings(_prev: InvoiceFormState, form: FormData): Promise<InvoiceFormState> {
  const { db } = await requireStaff(["admin"]);
  const { error } = await db.from("settings").upsert({
    key: "invoices",
    value: {
      mode: form.get("mode") === "on_delivered" ? "on_delivered" : "manual",
      composed_by: text(form, "composed_by", 120),
      place: text(form, "place", 80) || "Кърджали",
      mol: text(form, "mol", 120),
    },
  });
  if (error) return { error: "Настройките не се записаха." };
  refresh();
  return { ok: true };
}

const startErrors: Record<string, string> = {
  SERIES_LOCKED: "Вече има издаден документ в тази серия — началото е заключено.",
  INVALID_START: "Номерът е 10 цифри и трябва да е в диапазона на серията.",
};

/** „Започни от“ — само докато в серията няма издаден документ */
export async function setInvoiceStart(_prev: InvoiceFormState, form: FormData): Promise<InvoiceFormState> {
  const { db } = await requireStaff(["admin"]);
  const series = form.get("series") === "proforma" ? "proforma" : "invoice";
  const { error } = await db.rpc("set_invoice_start", { p_series: series, p_next: text(form, "next", 10) });
  if (error) return { error: startErrors[error.message.trim()] ?? "Началото не се записа." };
  refresh();
  return { ok: true };
}

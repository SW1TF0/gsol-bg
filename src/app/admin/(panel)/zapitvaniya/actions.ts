"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { Constants, type Enums } from "@/lib/supabase/database.types";

export type InquiryAdminState = { ok?: boolean; error?: string } | null;

export async function updateInquiry(_prev: InquiryAdminState, form: FormData): Promise<InquiryAdminState> {
  const { db, user } = await requireStaff();
  const id = Number(form.get("id"));
  const status = String(form.get("status")) as Enums<"inquiry_status">;
  const notes = String(form.get("notes") ?? "").trim().slice(0, 5000);
  if (!id || !Constants.public.Enums.inquiry_status.includes(status)) return { error: "Невалиден статус." };

  const { error } = await db
    .from("inquiries")
    .update({ status, notes: notes || null, handled_by: user.id })
    .eq("id", id);
  if (error) return { error: "Промените не се записаха." };
  refresh();
  return { ok: true };
}

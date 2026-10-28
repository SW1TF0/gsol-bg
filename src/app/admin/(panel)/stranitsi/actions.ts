"use server";

import { refresh, updateTag } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";

export type PageFormState = { ok?: boolean; error?: string } | null;

export async function updatePage(_prev: PageFormState, form: FormData): Promise<PageFormState> {
  const { db, user } = await requireStaff(["admin", "manager", "editor"]);
  const slug = String(form.get("slug") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const intro = String(form.get("intro") ?? "").trim();
  const body = String(form.get("body") ?? "");

  if (title.length < 2 || title.length > 120) return { error: "Заглавието трябва да е между 2 и 120 знака." };
  if (intro.length > 400) return { error: "Въведението е твърде дълго (до 400 знака)." };
  if (body.length > 60000) return { error: "Текстът е твърде дълъг." };

  const { error } = await db
    .from("pages")
    .update({ title, intro: intro || null, body, is_published: form.get("is_published") === "on", updated_by: user.id })
    .eq("slug", slug);
  if (error) return { error: "Промените не се записаха. Проверете дали имате права." };

  updateTag("pages");
  refresh();
  return { ok: true };
}

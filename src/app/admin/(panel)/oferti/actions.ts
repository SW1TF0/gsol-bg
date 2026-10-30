"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { hasStaffRole, requireStaff } from "@/lib/admin/auth";
import type { Json } from "@/lib/supabase/database.types";
import type { QuoteLine, QuoteStatus } from "@/lib/quotes";

const roles = ["admin", "manager", "sales"] as const;

const errors: Record<string, string> = {
  QUOTE_CONFLICT: "Офертата е променена в друг прозорец. Презаредете страницата — промените ви не са записани.",
  QUOTE_NOT_FOUND: "Офертата не съществува или е изтрита.",
  INVALID_QUOTE: "Проверете датата на валидност и статуса.",
  INVALID_LINE_NAME: "Всеки ред трябва да има име.",
  INVALID_LINE_QTY: "Количеството е цяло число от 1 до 9999.",
  INVALID_LINE_PRICE: "Цените са в евро с най-много две цифри след десетичната запетая.",
  TOO_MANY_LINES: "Най-много 200 реда в една оферта.",
  VERSION_NOT_FOUND: "Тази версия вече не се пази.",
  FORBIDDEN: "Нямате права за офертите.",
};
const message = (e: { message: string }) => errors[e.message.trim()] ?? "Записът не мина. Опитайте отново.";

type Item = { product_id: number; qty: number };

async function create(items: Item[], source: "admin" | "product" | "cart", url: string | null) {
  const { db } = await requireStaff([...roles]);
  const { data, error } = await db.rpc("create_quote", {
    p_items: items.slice(0, 50) as unknown as Json,
    p_source: source,
    p_source_url: url ?? undefined,
  });
  if (error) throw new Error(message(error));
  return (data as { id: number }).id;
}

/** Бутоните „Изготви оферта“ и „Оферта от количката“ се показват само на служителите с оферти */
export async function canMakeQuotes() {
  return hasStaffRole([...roles]);
}

/** От продуктовата страница или от количката (бутоните се виждат само на служители) */
export async function quoteFromShop(items: Item[], source: "product" | "cart", url: string): Promise<{ id: number } | { error: string }> {
  const clean = items
    .filter((i) => Number.isInteger(i.product_id) && i.product_id > 0)
    .map((i) => ({ product_id: i.product_id, qty: Math.max(1, Math.min(9999, Math.round(i.qty) || 1)) }));
  try {
    return { id: await create(clean, source, url.slice(0, 500)) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Офертата не се създаде." };
  }
}

export type NewQuoteState = { error?: string } | null;

/**
 * „Нова оферта за продукт“: адрес на продукта, SKU, ID или част от името. Празно поле — празна оферта
 * (за услуги и свободни редове).
 */
export async function newQuote(_prev: NewQuoteState, form: FormData): Promise<NewQuoteState> {
  const { db } = await requireStaff([...roles]);
  const raw = String(form.get("q") ?? "").trim();
  let productId: number | null = null;

  if (raw) {
    const slug = raw.match(/\/produkt\/([^/?#]+)/)?.[1];
    const id = /^\d+$/.test(raw) ? Number(raw) : null;
    const term = raw.replace(/[,()%*\\]/g, " ").trim();
    const { data } = slug
      ? await db.from("products").select("id").eq("slug", decodeURIComponent(slug)).limit(1)
      : id
        ? await db.from("products").select("id").eq("id", id).limit(1)
        : await db.from("products").select("id").or(`sku.ilike.${term},name.ilike.%${term}%`).order("is_active", { ascending: false }).limit(1);
    productId = data?.[0]?.id ?? null;
    if (!productId) return { error: "Няма такъв продукт — опитайте с адреса, SKU или част от името." };
  }

  let id: number;
  try {
    id = await create(productId ? [{ product_id: productId, qty: 1 }] : [], "admin", null);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Офертата не се създаде." };
  }
  redirect(`/admin/oferti/${id}`);
}

export type QuoteDraft = {
  status: QuoteStatus;
  client_name: string;
  client_company: string;
  client_eik: string;
  client_email: string;
  client_phone: string;
  valid_until: string;
  note: string;
  lines: QuoteLine[];
};

export async function saveQuote(id: number, version: number, draft: QuoteDraft): Promise<{ version: number } | { error: string }> {
  const { db } = await requireStaff([...roles]);
  const { data, error } = await db.rpc("save_quote", { p_id: id, p_version: version, p_data: draft as unknown as Json });
  if (error) return { error: message(error) };
  refresh();
  return { version: data as number };
}

export async function restoreQuote(id: number, fromVersion: number, version: number): Promise<{ version: number } | { error: string }> {
  const { db } = await requireStaff([...roles]);
  const { data, error } = await db.rpc("restore_quote", { p_id: id, p_from_version: fromVersion, p_version: version });
  if (error) return { error: message(error) };
  refresh();
  return { version: data as number };
}

export async function deleteQuote(id: number) {
  const { db } = await requireStaff([...roles]);
  await db.rpc("delete_quote", { p_id: id });
  redirect("/admin/oferti");
}

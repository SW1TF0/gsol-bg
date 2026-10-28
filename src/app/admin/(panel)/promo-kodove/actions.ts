"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { generateCodes, normalizeCode } from "@/lib/promo";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type PromoFormState = { error?: string; ok?: boolean } | null;

const MANAGERS = ["admin", "manager"] as const;

function cents(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

function int(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

function list(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Чете общите полета на формата; връща грешка или готов обект за базата. */
function readPromo(form: FormData): { error: string } | { values: Omit<TablesInsert<"promo_codes">, "code"> } {
  const type = String(form.get("discount_type"));
  if (!["percent", "fixed", "free_shipping"].includes(type)) return { error: "Изберете вид отстъпка." };

  const percent = type === "percent" ? Number(String(form.get("percent") ?? "").replace(",", ".")) : null;
  if (type === "percent" && (!percent || percent <= 0 || percent > 100)) return { error: "Процентът трябва да е между 0 и 100." };
  const amount = type === "fixed" ? cents(form.get("amount")) : null;
  if (type === "fixed" && (!amount || Number.isNaN(amount))) return { error: "Въведете сума на отстъпката." };

  const scope = String(form.get("scope") ?? "order");
  if (!["order", "categories", "brands", "products"].includes(scope)) return { error: "Невалиден обхват." };
  const categoryIds = form.getAll("scope_category_ids").map(Number).filter(Boolean);
  const brands = list(form.get("scope_brands"));
  const productIds = list(form.get("scope_product_ids")).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (scope === "categories" && !categoryIds.length) return { error: "Изберете поне една категория." };
  if (scope === "brands" && !brands.length) return { error: "Въведете поне една марка." };
  if (scope === "products" && !productIds.length) return { error: "Въведете поне един номер на продукт." };

  const minSubtotal = cents(form.get("min_subtotal"));
  const maxDiscount = cents(form.get("max_discount"));
  const usageLimit = int(form.get("usage_limit"));
  const perCustomer = int(form.get("per_customer_limit"));
  if ([minSubtotal, maxDiscount].some((v) => Number.isNaN(v))) return { error: "Проверете сумите." };
  if ([usageLimit, perCustomer].some((v) => Number.isNaN(v))) return { error: "Лимитите трябва да са цели положителни числа." };

  const startsAt = String(form.get("starts_at_iso") ?? "") || null;
  const endsAt = String(form.get("ends_at_iso") ?? "") || null;
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return { error: "Краят трябва да е след началото." };

  return {
    values: {
      description: String(form.get("description") ?? "").trim().slice(0, 300) || null,
      discount_type: type as TablesInsert<"promo_codes">["discount_type"],
      percent,
      amount_cents: amount,
      scope,
      scope_category_ids: scope === "categories" ? categoryIds : [],
      scope_brands: scope === "brands" ? brands : [],
      scope_product_ids: scope === "products" ? productIds : [],
      exclude_promo_items: form.get("exclude_promo_items") === "on",
      min_subtotal_cents: minSubtotal ?? 0,
      max_discount_cents: maxDiscount,
      starts_at: startsAt,
      ends_at: endsAt,
      usage_limit: usageLimit,
      per_customer_limit: perCustomer,
      first_order_only: form.get("first_order_only") === "on",
      allowed_emails: list(form.get("allowed_emails")).map((e) => e.toLowerCase()),
      partner: String(form.get("partner") ?? "").trim().slice(0, 80) || null,
      is_active: form.get("is_active") === "on",
    },
  };
}

export async function createPromo(_prev: PromoFormState, form: FormData): Promise<PromoFormState> {
  const { db, user } = await requireStaff([...MANAGERS]);
  const parsed = readPromo(form);
  if ("error" in parsed) return parsed;

  if (form.get("mode") === "bulk") {
    const count = Number(form.get("count"));
    if (!Number.isInteger(count) || count < 2 || count > 1000) return { error: "Броят кодове трябва да е между 2 и 1000." };
    const prefix = normalizeCode(String(form.get("prefix") ?? "")).replace(/[^A-Z0-9]/g, "").slice(0, 12);
    const batchId = crypto.randomUUID();

    // Генерираме, проверяваме за съвпадения в базата и заменяме дубликатите
    let codes = generateCodes(prefix, count, 6);
    const { data: taken } = await db.from("promo_codes").select("code").in("code", codes);
    if (taken?.length) {
      const takenSet = new Set(taken.map((t) => t.code));
      codes = [...codes.filter((c) => !takenSet.has(c)), ...generateCodes(prefix, taken.length, 6, new Set(codes))];
    }

    const rows = codes.map((code) => ({
      ...parsed.values,
      code,
      batch_id: batchId,
      usage_limit: parsed.values.usage_limit ?? 1,
      created_by: user.id,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from("promo_codes").insert(rows.slice(i, i + 500));
      if (error) return { error: "Кодовете не се записаха. Опитайте отново." };
    }
    redirect(`/admin/promo-kodove?partida=${batchId}`);
  }

  const code = normalizeCode(String(form.get("code") ?? ""));
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return { error: "Кодът трябва да е 3–32 знака: латински букви, цифри, - и _." };
  const { data, error } = await db
    .from("promo_codes")
    .insert({ ...parsed.values, code, created_by: user.id })
    .select("id")
    .single();
  if (error) {
    return { error: error.code === "23505" ? `Кодът ${code} вече съществува.` : "Кодът не се записа." };
  }
  redirect(`/admin/promo-kodove/${data.id}?nov=1`);
}

export async function updatePromo(_prev: PromoFormState, form: FormData): Promise<PromoFormState> {
  const { db } = await requireStaff([...MANAGERS]);
  const id = Number(form.get("id"));
  const parsed = readPromo(form);
  if ("error" in parsed) return parsed;
  const code = normalizeCode(String(form.get("code") ?? ""));
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return { error: "Кодът трябва да е 3–32 знака: латински букви, цифри, - и _." };

  const { error } = await db
    .from("promo_codes")
    .update({ ...parsed.values, code })
    .eq("id", id);
  if (error) return { error: error.code === "23505" ? `Кодът ${code} вече съществува.` : "Промените не се записаха." };
  refresh();
  return { ok: true };
}

export async function togglePromo(form: FormData) {
  const { db } = await requireStaff([...MANAGERS]);
  const id = Number(form.get("id"));
  const active = form.get("active") === "true";
  await db.from("promo_codes").update({ is_active: active }).eq("id", id);
  refresh();
}

export async function toggleBatch(form: FormData) {
  const { db } = await requireStaff([...MANAGERS]);
  const batch = String(form.get("batch"));
  const active = form.get("active") === "true";
  await db.from("promo_codes").update({ is_active: active }).eq("batch_id", batch);
  refresh();
}

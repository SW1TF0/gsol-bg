"use server";

import { refresh, updateTag } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";

export type ProductFormState = { error?: string; ok?: boolean } | null;

/** "1 234,50" или "1234.5" -> 123450 евроцента */
function toCents(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : NaN;
}

export async function updateProduct(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const { db } = await requireStaff(["admin", "manager", "editor"]);
  const id = Number(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  const price = toCents(form.get("price"));
  const regular = toCents(form.get("regular_price"));
  const stock = String(form.get("stock_status"));
  const categoryId = Number(form.get("category_id")) || null;
  const weightText = String(form.get("weight_kg") ?? "").replace(/\s/g, "").replace(",", ".");
  const weight = weightText ? Number(weightText) : null;

  if (!id) return { error: "Липсва продукт." };
  if (name.length < 3) return { error: "Името е твърде кратко." };
  if (price === null || Number.isNaN(price)) return { error: "Въведете цена." };
  if (Number.isNaN(regular)) return { error: "Невалидна стара цена." };
  if (regular !== null && regular < price) return { error: "Старата цена трябва да е по-висока от текущата." };
  if (!["in_stock", "on_request", "out_of_stock"].includes(stock)) return { error: "Невалидна наличност." };
  if (weight !== null && !(weight > 0 && weight <= 500)) return { error: "Теглото е в килограми — между 0,01 и 500." };

  const { error } = await db
    .from("products")
    .update({
      name,
      price_cents: price,
      regular_price_cents: regular && regular > price ? regular : null,
      stock_status: stock,
      delivery_days: String(form.get("delivery_days") ?? "1–7").trim().slice(0, 20) || "1–7",
      summary: String(form.get("summary") ?? "").trim().slice(0, 500) || null,
      category_id: categoryId,
      weight_kg: weight === null ? null : Math.round(weight * 100) / 100,
      is_active: form.get("is_active") === "on",
      is_promo: form.get("is_promo") === "on",
      free_windows: form.get("free_windows") === "on",
    })
    .eq("id", id);

  if (error) return { error: "Промените не се записаха. Проверете дали имате права." };
  updateTag("catalog");
  refresh();
  return { ok: true };
}

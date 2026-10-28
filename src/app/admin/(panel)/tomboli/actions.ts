"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { slugify } from "@/lib/raffles";
import { Constants, type Enums, type TablesInsert } from "@/lib/supabase/database.types";

export type RaffleFormState = { ok?: boolean; error?: string } | null;

const MANAGERS = ["admin", "manager"] as const;

function cents(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

function int(raw: FormDataEntryValue | null, min = 0) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isInteger(n) && n >= min ? n : NaN;
}

function readRaffle(form: FormData): { error: string } | { values: Omit<TablesInsert<"raffles">, "created_by"> } {
  const title = String(form.get("title") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || title);
  const startsAt = String(form.get("starts_at_iso") ?? "");
  const endsAt = String(form.get("ends_at_iso") ?? "");
  const status = String(form.get("status") ?? "draft") as Enums<"raffle_status">;

  if (title.length < 3) return { error: "Въведете заглавие." };
  if (slug.length < 3) return { error: "Адресът трябва да е поне 3 знака (латиница, цифри и тирета)." };
  if (!startsAt || !endsAt) return { error: "Изберете начало и край." };
  if (new Date(endsAt) <= new Date(startsAt)) return { error: "Краят трябва да е след началото." };
  if (!["draft", "active", "cancelled"].includes(status)) return { error: "Невалиден статус." };

  const minOrder = cents(form.get("min_order"));
  const perAmount = cents(form.get("per_amount"));
  const base = int(form.get("base_entries"));
  const bonus = int(form.get("bonus_entries"));
  const maxPerOrder = int(form.get("max_entries_per_order"), 1);
  const reserves = int(form.get("reserves_count"));
  if ([minOrder, perAmount].some((v) => Number.isNaN(v))) return { error: "Проверете сумите." };
  if ([base, bonus, maxPerOrder, reserves].some((v) => Number.isNaN(v))) return { error: "Участията и лимитите трябва да са цели числа." };
  if (perAmount === 0) return { error: "„Участие за всеки … €“ трябва да е повече от 0." };
  if ((reserves ?? 1) > 20) return { error: "Резервите са до 20." };

  const statuses = form
    .getAll("count_statuses")
    .map(String)
    .filter((s): s is Enums<"order_status"> => (Constants.public.Enums.order_status as readonly string[]).includes(s));
  if (!statuses.length) return { error: "Изберете поне един статус на поръчка, който се брои." };

  return {
    values: {
      title,
      slug,
      intro: String(form.get("intro") ?? "").trim().slice(0, 400) || null,
      rules: String(form.get("rules") ?? "").slice(0, 30000),
      image_url: String(form.get("image_url") ?? "").trim() || null,
      starts_at: startsAt,
      ends_at: endsAt,
      status,
      min_order_cents: minOrder ?? 0,
      base_entries: base ?? 1,
      per_amount_cents: perAmount,
      bonus_entries: bonus ?? 0,
      bonus_category_ids: form.getAll("bonus_category_ids").map(Number).filter(Boolean),
      bonus_product_ids: String(form.get("bonus_product_ids") ?? "")
        .split(/[\s,;]+/)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
      max_entries_per_order: maxPerOrder,
      count_statuses: statuses,
      reserves_count: reserves ?? 1,
    },
  };
}

export async function createRaffle(_prev: RaffleFormState, form: FormData): Promise<RaffleFormState> {
  const { db, user } = await requireStaff([...MANAGERS]);
  const parsed = readRaffle(form);
  if ("error" in parsed) return parsed;
  const { data, error } = await db
    .from("raffles")
    .insert({ ...parsed.values, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "Вече има томбола с този адрес." : "Томболата не се записа." };
  updateTag("raffles");
  redirect(`/admin/tomboli/${data.id}?nova=1`);
}

export async function updateRaffle(_prev: RaffleFormState, form: FormData): Promise<RaffleFormState> {
  const { db } = await requireStaff([...MANAGERS]);
  const id = Number(form.get("id"));
  const { data: current } = await db.from("raffles").select("status").eq("id", id).maybeSingle();
  if (!current) return { error: "Томболата не е намерена." };
  if (current.status === "drawn") return { error: "Изтеглена томбола не може да се променя." };
  const parsed = readRaffle(form);
  if ("error" in parsed) return parsed;
  const { error } = await db.from("raffles").update(parsed.values).eq("id", id);
  if (error) return { error: error.code === "23505" ? "Вече има томбола с този адрес." : "Промените не се записаха." };
  updateTag("raffles");
  refresh();
  return { ok: true };
}

export async function addPrize(_prev: RaffleFormState, form: FormData): Promise<RaffleFormState> {
  const { db } = await requireStaff([...MANAGERS]);
  const raffleId = Number(form.get("raffle_id"));
  const title = String(form.get("title") ?? "").trim();
  const quantity = Number(form.get("quantity") || 1);
  if (title.length < 2) return { error: "Въведете награда." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return { error: "Бройката е от 1 до 100." };

  const { count } = await db.from("raffle_prizes").select("id", { count: "exact", head: true }).eq("raffle_id", raffleId);
  const { error } = await db.from("raffle_prizes").insert({
    raffle_id: raffleId,
    title,
    description: String(form.get("description") ?? "").trim() || null,
    image_url: String(form.get("image_url") ?? "").trim() || null,
    quantity,
    position: (count ?? 0) + 1,
  });
  if (error) return { error: "Наградата не се записа." };
  updateTag("raffles");
  refresh();
  return { ok: true };
}

export async function deletePrize(form: FormData) {
  const { db } = await requireStaff([...MANAGERS]);
  await db.from("raffle_prizes").delete().eq("id", Number(form.get("id")));
  updateTag("raffles");
  refresh();
}

const drawErrors: Record<string, string> = {
  NOT_ENDED: "Томболата още не е приключила.",
  NOT_ACTIVE: "Само активна томбола може да бъде изтеглена.",
  NO_PRIZES: "Добавете поне една награда.",
  NO_ENTRIES: "Няма участия — няма кого да изтеглим.",
  FORBIDDEN: "Нямате права за теглене.",
};

export async function drawRaffle(_prev: RaffleFormState, form: FormData): Promise<RaffleFormState> {
  const { db } = await requireStaff([...MANAGERS]);
  if (form.get("confirm") !== "on") return { error: "Потвърдете, че искате да изтеглите сега." };
  const { error } = await db.rpc("draw_raffle", { p_raffle_id: Number(form.get("id")) });
  if (error) return { error: drawErrors[error.message] ?? "Тегленето не успя." };
  updateTag("raffles");
  refresh();
  return { ok: true };
}

export async function markNotified(form: FormData) {
  const { db } = await requireStaff([...MANAGERS]);
  await db.from("raffle_winners").update({ notified_at: new Date().toISOString() }).eq("id", Number(form.get("id")));
  refresh();
}

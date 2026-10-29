"use server";

import { refresh, updateTag } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { econtWorker } from "@/lib/econt";

export type EcontFormState = { ok?: boolean; error?: string; field?: string } | null;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Потребител и парола от e-econt → Vault (паролата не се показва повече никъде), после проверка */
export async function saveEcontAccess(_prev: EcontFormState, form: FormData): Promise<EcontFormState> {
  const { db } = await requireStaff(["admin"]);
  const username = text(form, "username");
  const password = String(form.get("password") ?? "");
  if (username.length < 2) return { error: "Въведете потребителя от e-econt.", field: "username" };
  if (password.length < 3) return { error: "Въведете паролата.", field: "password" };
  const { error } = await db.rpc("econt_set_access", { p_username: username, p_password: password });
  if (error) return { error: "Достъпът не се записа. Проверете дали имате права на администратор." };
  // Работникът проверява достъпа веднага; резултатът се вижда след опресняването
  await econtWorker({ action: "tick" }, 30000);
  refresh();
  return { ok: true };
}

export async function removeEcontAccess(): Promise<EcontFormState> {
  const { db } = await requireStaff(["admin"]);
  const { error } = await db.rpc("econt_set_access", { p_username: "", p_password: "" });
  if (error) return { error: "Достъпът не се изтри." };
  refresh();
  return { ok: true };
}

export async function testEcontAccess(): Promise<EcontFormState> {
  const { db } = await requireStaff(["admin"]);
  const { error } = await db.rpc("econt_request", { p_what: "test" });
  if (error) return { error: "Проверката не можа да започне." };
  await econtWorker({ action: "tick" }, 30000);
  refresh();
  return { ok: true };
}

/** Обновяването на списъците отнема около минута — будилникът го пуска до 5 минути */
export async function syncEcontLists(): Promise<EcontFormState> {
  const { db } = await requireStaff(["admin"]);
  const { error } = await db.rpc("econt_request", { p_what: "sync" });
  if (error) return { error: "Заявката не се записа." };
  refresh();
  return { ok: true };
}

export async function saveEcontSettings(_prev: EcontFormState, form: FormData): Promise<EcontFormState> {
  const { db } = await requireStaff(["admin"]);
  const env = text(form, "env") === "live" ? "live" : "demo";
  const office = text(form, "sender_office_code");
  const agent = text(form, "sender_agent").slice(0, 80);

  if (office) {
    const { data } = await db.from("econt_offices").select("code").eq("code", office).maybeSingle();
    if (!data) return { error: "Няма такъв офис в списъка на Еконт.", field: "sender_office_code" };
  }
  if (env === "live" && !office) return { error: "За реалната среда изберете офиса, от който изпращате.", field: "sender_office_code" };
  if (env === "live" && agent.length < 3)
    return { error: "Еконт изисква упълномощено лице за фирми — въведете име и фамилия.", field: "sender_agent" };

  const { error } = await db.from("settings").upsert({
    key: "econt",
    value: {
      env,
      sender_office_code: office,
      sender_agent: agent,
      auto_label: form.get("auto_label") === "on",
      declared_value: form.get("declared_value") === "on",
    },
  });
  if (error) return { error: "Настройките не се записаха." };
  refresh();
  return { ok: true };
}

/** Теглата по категории — от тях Еконт смята цената, когато продуктът няма свое тегло */
export async function saveWeights(_prev: EcontFormState, form: FormData): Promise<EcontFormState> {
  const { db } = await requireStaff(["admin"]);
  const { data: categories } = await db.from("categories").select("id, weight_kg");
  for (const c of categories ?? []) {
    const raw = text(form, `weight_${c.id}`).replace(/\s/g, "").replace(",", ".");
    const weight = raw ? Math.round(Number(raw) * 100) / 100 : null;
    if (weight !== null && !(weight > 0 && weight <= 500)) {
      return { error: "Теглото е в килограми — между 0,01 и 500.", field: `weight_${c.id}` };
    }
    if (weight === (c.weight_kg === null ? null : Number(c.weight_kg))) continue;
    const { error } = await db.from("categories").update({ weight_kg: weight }).eq("id", c.id);
    if (error) return { error: "Теглата не се записаха." };
  }
  updateTag("catalog");
  refresh();
  return { ok: true };
}

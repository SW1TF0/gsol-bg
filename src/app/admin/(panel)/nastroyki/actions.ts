"use server";

import { refresh, updateTag } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { isValidIban, normalizeIban, socialNetworks, type SettingKey } from "@/lib/settings";
import type { Json } from "@/lib/supabase/database.types";
import { getSettings } from "@/lib/settings-data";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/notify";
import { emailSamples, renderSample } from "./imeyli/samples";

export type SettingsFormState = { ok?: boolean; error?: string; field?: string } | null;

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function cents(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").replace(/\s/g, "").replace(",", ".");
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

async function save(key: SettingKey, value: Json): Promise<SettingsFormState> {
  // Настройките пише само администратор — същото пази и политиката в базата
  const { db } = await requireStaff(["admin"]);
  const { error } = await db.from("settings").upsert({ key, value });
  if (error) return { error: "Промените не се записаха. Проверете дали имате права на администратор." };
  updateTag("settings");
  refresh();
  return { ok: true };
}

export async function saveCompany(_prev: SettingsFormState, form: FormData): Promise<SettingsFormState> {
  const v = {
    brand: text(form, "brand"),
    legal_name: text(form, "legal_name"),
    eik: text(form, "eik").replace(/\s/g, ""),
    vat: text(form, "vat").replace(/\s/g, "").toUpperCase(),
    phone: text(form, "phone"),
    email: text(form, "email").toLowerCase(),
    address: text(form, "address"),
    hours: text(form, "hours"),
  };

  if (v.brand.length < 2 || v.brand.length > 40) return { error: "Марката трябва да е между 2 и 40 знака.", field: "brand" };
  if (v.legal_name.length < 3) return { error: "Въведете името на фирмата.", field: "legal_name" };
  if (!/^(\d{9}|\d{13})$/.test(v.eik)) return { error: "ЕИК трябва да е 9 или 13 цифри.", field: "eik" };
  if (v.vat && !/^BG\d{9,10}$/.test(v.vat)) return { error: "ДДС номерът е във формат BG и 9–10 цифри.", field: "vat" };
  if (v.phone.replace(/\D/g, "").length < 6) return { error: "Въведете телефон за връзка.", field: "phone" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return { error: "Невалиден имейл.", field: "email" };
  if (v.address.length < 5) return { error: "Въведете адрес.", field: "address" };

  const socials = [];
  for (const name of socialNetworks) {
    const href = text(form, `social_${name}`);
    if (!href) continue;
    if (!/^https:\/\/\S+\.\S+/.test(href)) return { error: `Връзката за ${name} трябва да започва с https://`, field: `social_${name}` };
    socials.push({ name, href });
  }

  return save("company", { ...v, socials });
}

export async function saveShipping(_prev: SettingsFormState, form: FormData): Promise<SettingsFormState> {
  const office = cents(form.get("econt_office"));
  const address = cents(form.get("econt_address"));
  const freeFrom = cents(form.get("free_from"));
  if ([office, address, freeFrom].some((n) => Number.isNaN(n))) return { error: "Проверете сумите — например 6,90." };
  if (office > 100000 || address > 100000) return { error: "Цената на доставката изглежда твърде висока." };
  if (freeFrom > 10000000) return { error: "Прагът за безплатна доставка е твърде висок.", field: "free_from" };

  return save("shipping", { econt_office_cents: office, econt_address_cents: address, free_from_cents: freeFrom });
}

export async function saveBank(_prev: SettingsFormState, form: FormData): Promise<SettingsFormState> {
  const v = {
    holder: text(form, "holder"),
    iban: normalizeIban(text(form, "iban")),
    bic: text(form, "bic").replace(/\s/g, "").toUpperCase(),
    bank_name: text(form, "bank_name"),
  };
  if (v.iban && !isValidIban(v.iban)) return { error: "IBAN не е валиден — проверете цифрите.", field: "iban" };
  if (v.bic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v.bic)) return { error: "BIC е 8 или 11 знака, напр. UNCRBGSF.", field: "bic" };
  if (v.iban && v.holder.length < 3) return { error: "Въведете титуляря на сметката.", field: "holder" };

  return save("bank", v);
}

export type TestEmailState = { result?: SendResult; to?: string } | null;

/** Изпраща избрания пример до имейла на влезлия администратор */
export async function sendTestEmail(_prev: TestEmailState, form: FormData): Promise<TestEmailState> {
  const { user } = await requireStaff(["admin"]);
  const id = String(form.get("vid") ?? "");
  const sample = emailSamples.find((s) => s.id === id) ?? emailSamples[0];
  if (!user.email) return { result: "failed" };
  const email = renderSample(sample.id, await getSettings(), await siteUrl());
  const result = await sendEmail(user.email, { ...email, subject: `[Тест] ${email.subject}` });
  return { result, to: user.email };
}

/** Оценката и броят отзиви от Google — пишат се на ръка (както в стария сайт); празно = без числа */
export async function saveReviews(_prev: SettingsFormState, form: FormData): Promise<SettingsFormState> {
  const rating = text(form, "rating").replace(".", ",");
  const countText = text(form, "count").replace(/\s/g, "");
  if (rating && !/^[1-5](,[0-9])?$/.test(rating)) return { error: "Оценката е от 1 до 5, напр. 4,9.", field: "rating" };
  if (countText && !/^\d{1,6}$/.test(countText)) return { error: "Броят е цяло число.", field: "count" };
  return save("reviews", { rating, count: countText ? Number(countText) : 0 });
}

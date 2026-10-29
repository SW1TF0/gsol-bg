"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { publicClient } from "@/lib/supabase/clients";
import type { Json } from "@/lib/supabase/database.types";
import { checkBuild, lineNames, pricingLine } from "@/lib/builder/compatibility";
import { partKinds, partLabels, type Build, type PartKind } from "@/lib/builder/parts";
import { getConfiguratorParts } from "@/lib/builder/public-data";
import { formatPrice } from "@/lib/format";
import { sendInquiryAlert, siteUrl } from "@/lib/email/notify";

export type Selection = Partial<Record<PartKind, number>>;
export type ConfigQuote = { price: number | null; line: string; lineName: string };

async function toBuild(selection: Selection) {
  const parts = await getConfiguratorParts();
  const byId = new Map(parts.map((p) => [p.id, p]));
  const build: Build = {};
  for (const kind of partKinds) {
    const id = selection[kind];
    const part = id ? byId.get(Number(id)) : undefined;
    if (part && part.kind === kind) (build as Record<PartKind, unknown>)[kind] = part;
  }
  return build;
}

/** Цена на конфигурацията — смята я базата (доставните цени не излизат от нея) */
export async function quoteConfiguration(selection: Selection): Promise<ConfigQuote | null> {
  const build = await toBuild(selection);
  if (checkBuild(build).length) return null;
  const line = pricingLine(build);
  const ids = partKinds.flatMap((k) => (build[k] ? [build[k]!.id] : []));
  const { data } = await publicClient().rpc("price_builds", { p_builds: [{ line, parts: ids }] as Json });
  const price = (data as (number | null)[] | null)?.[0] ?? null;
  return { price, line, lineName: lineNames[line] };
}

export type SubmitState = { ok?: boolean; error?: string; field?: string } | null;

export async function submitConfiguration(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  if (String(form.get("website") ?? "")) return { ok: true };
  const name = String(form.get("name") ?? "").trim();
  const contact = String(form.get("contact") ?? "").trim();
  const note = String(form.get("note") ?? "").trim().slice(0, 1500);
  let selection: Selection = {};
  try {
    selection = JSON.parse(String(form.get("selection") ?? "{}"));
  } catch {
    return { error: "Конфигурацията не се прочете. Опитайте отново." };
  }

  if (name.length < 2) return { error: "Въведете име.", field: "name" };
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact);
  const isPhone = /^\+?[0-9]{8,15}$/.test(contact.replace(/[\s()-]/g, ""));
  if (!isEmail && !isPhone) return { error: "Въведете телефон или имейл.", field: "contact" };
  if (form.get("privacy") !== "on") return { error: "Нужно е съгласие за обработка на данните.", field: "privacy" };

  const build = await toBuild(selection);
  const issues = checkBuild(build);
  if (issues.length) return { error: `Конфигурацията не е завършена: ${issues[0].message}` };
  const quote = await quoteConfiguration(selection);

  const lines = partKinds.flatMap((k) => (build[k] ? [`${partLabels[k]}: ${build[k]!.name}`] : []));
  const message = [
    `Конфигурация от сайта (${quote?.lineName ?? "свободна"}):`,
    ...lines.map((l) => `- ${l}`),
    "",
    `Цена по сайта: ${quote?.price ? formatPrice(quote.price) : "—"} с ДДС`,
    ...(note ? ["", `Бележка: ${note}`] : []),
  ].join("\n");

  const referer = (await headers()).get("referer") ?? "";
  const sourceUrl = referer ? new URL(referer).pathname.slice(0, 300) : "/konfigurator";
  const details = { line: quote?.lineName ?? "", price: quote?.price ? formatPrice(quote.price) : "" };
  const { error } = await publicClient()
    .from("inquiries")
    .insert({
      topic: "nov-kompyutar",
      name: name.slice(0, 100),
      contact: contact.slice(0, 120),
      message,
      details: { ...details, parts: selection } as unknown as Json,
      source_url: sourceUrl,
    });
  if (error) return { error: "Не се изпрати. Опитайте отново или ни се обадете." };

  const url = await siteUrl();
  after(() =>
    sendInquiryAlert({ topicLabel: "Конфигурация от конфигуратора", name, contact, message, details, sourceUrl }, url),
  );
  return { ok: true };
}

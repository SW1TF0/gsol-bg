"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import type { Json } from "@/lib/supabase/database.types";
import { loadInput, publish, runAndVerify } from "@/lib/builder/data";
import { readSpecs } from "@/lib/builder/fields";
import { partKinds, type PartKind } from "@/lib/builder/parts";
import { validatePricing, type PricingParams } from "@/lib/builder/pricing";
import { lines } from "@/lib/builder/policy";

const MANAGERS = ["admin", "manager"] as const;

export type RunSummary = {
  mode: "dry" | "publish";
  ok: boolean;
  reasons: string[];
  lines: { line: string; name: string; count: number; min: number; target: number; from: number | null; to: number | null; sample: { name: string; price: number }[] }[];
  repaired: number;
  withdrawn: number;
  quarantined: { name: string; reasons: string[] }[];
  samples: number;
  applied?: { created: number; kept: number; onRequest: number; drafts: number; deleted: number };
};
export type RunState = { summary?: RunSummary; error?: string } | null;

export async function runBuilderAction(_prev: RunState, form: FormData): Promise<RunState> {
  const { db, user } = await requireStaff([...MANAGERS]);
  const mode = form.get("mode") === "publish" ? "publish" : "dry";
  if (mode === "publish" && form.get("confirm") !== "on") return { error: "Отметнете потвърждението, за да публикувате." };

  const input = await loadInput(db);
  const result = await runAndVerify(db, input);
  const summary: RunSummary = {
    mode,
    ok: result.verdict.ok,
    reasons: result.verdict.reasons,
    lines: result.lines.map((l) => {
      const prices = l.machines.map((m) => m.priceCents);
      return {
        line: l.line,
        name: l.name,
        count: l.machines.length,
        min: l.shelf.min,
        target: l.shelf.target,
        from: prices.length ? Math.min(...prices) : null,
        to: prices.length ? Math.max(...prices) : null,
        sample: l.machines.slice(0, 4).map((m) => ({ name: m.name, price: m.priceCents })),
      };
    }),
    repaired: result.repaired.length,
    withdrawn: result.withdrawn.length,
    quarantined: result.quarantined.slice(0, 20).map((q) => ({ name: q.name, reasons: q.reasons })),
    samples: input.samples,
  };

  if (mode === "publish" && result.verdict.ok) {
    try {
      summary.applied = await publish(db, input, result);
    } catch (e) {
      return { summary, error: e instanceof Error ? e.message : "Публикуването не успя." };
    }
    updateTag("catalog");
    updateTag("builder");
  }
  await db.from("builder_runs").insert({ run_by: user.id, mode, ok: result.verdict.ok, summary: summary as unknown as Json });
  refresh();
  return { summary };
}

export type FormState = { ok?: boolean; error?: string } | null;

const euroCents = (raw: FormDataEntryValue | null) => {
  const n = Number(String(raw ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

export async function savePricing(_prev: FormState, form: FormData): Promise<FormState> {
  const { db } = await requireStaff(["admin"]);
  const fixedKeys = ["assembly", "windows", "drivers", "bios", "test", "packaging"];
  const params: PricingParams = {
    fixed_costs_cents: Object.fromEntries(fixedKeys.map((k) => [k, euroCents(form.get(`fixed_${k}`))])),
    warranty_pct: Number(String(form.get("warranty_pct")).replace(",", ".")),
    payment_fee_pct: Number(String(form.get("payment_fee_pct")).replace(",", ".")),
    markup_cents: Object.fromEntries(lines.map((l) => [l.id, euroCents(form.get(`markup_${l.id}`))])) as PricingParams["markup_cents"],
    line_addon_cents: Object.fromEntries(lines.map((l) => [l.id, euroCents(form.get(`addon_${l.id}`))])),
    labor: { min_cents: euroCents(form.get("labor_min")), pct: Number(String(form.get("labor_pct")).replace(",", ".")) },
    rounding: {
      threshold_eur: Number(form.get("round_threshold")),
      small_step_eur: Number(form.get("round_small")),
      large_step_eur: Number(form.get("round_large")),
    },
  };
  if (!validatePricing(params)) return { error: "Проверете стойностите — всички са числа, таксата е под 50%." };
  const { error } = await db.from("settings").upsert({ key: "builder_pricing", value: params as unknown as Json });
  if (error) return { error: "Не се записа. Нужни са права на администратор." };
  refresh();
  return { ok: true };
}

export async function savePart(_prev: FormState, form: FormData): Promise<FormState> {
  const { db } = await requireStaff([...MANAGERS]);
  const id = Number(form.get("id")) || null;
  const kind = String(form.get("kind")) as PartKind;
  if (!partKinds.includes(kind)) return { error: "Изберете вид на частта." };
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Въведете име." };
  const cost = euroCents(form.get("cost"));
  if (!cost || Number.isNaN(cost)) return { error: "Въведете доставна цена с ДДС." };
  const lead = Number(form.get("lead_days") || 3);
  if (!Number.isInteger(lead) || lead < 0 || lead > 60) return { error: "Срокът е от 0 до 60 работни дни." };
  const image = String(form.get("image_url") ?? "").trim();
  if (image && !/^https:\/\//.test(image)) return { error: "Снимката трябва да е https:// адрес." };
  const { specs, errors } = readSpecs(kind, (k) => form.get(k) as string | null, (k) => form.getAll(k).map(String));
  if (errors.length) return { error: errors.join(" ") };

  const values = {
    kind,
    name: name.slice(0, 200),
    brand: String(form.get("brand") ?? "").trim().slice(0, 60) || null,
    part_number: String(form.get("part_number") ?? "").trim().slice(0, 60) || null,
    supplier: String(form.get("supplier") ?? "").trim().slice(0, 60) || null,
    specs: specs as Json,
    cost_cents: cost,
    lead_days: lead,
    image_url: image || null,
    in_stock: form.get("in_stock") === "on",
    is_sample: false,
  };
  const { data, error } = id
    ? await db.from("components").update(values).eq("id", id).select("id").single()
    : await db.from("components").insert(values).select("id").single();
  if (error || !data) return { error: "Частта не се записа. Проверете дали имате права." };
  updateTag("builder");
  if (!id) redirect(`/admin/bildar/chasti/${data.id}?zapisana=1`);
  refresh();
  return { ok: true };
}

export async function togglePartStock(form: FormData) {
  const { db } = await requireStaff([...MANAGERS]);
  const id = Number(form.get("id"));
  if (!id) return;
  await db.from("components").update({ in_stock: form.get("in_stock") === "1" }).eq("id", id);
  updateTag("builder");
  refresh();
}

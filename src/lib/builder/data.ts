import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { slugify } from "@/lib/raffles";
import { partKinds, partLabels, type AnyPart, type Build, type PartKind } from "./parts";
import { lineById, lines, type LineId } from "./policy";
import { runBuilder, type ExistingMachine, type Machine, type RunResult } from "./generator";
import { validatePricing } from "./pricing";
import { builderPolicy } from "./policy";
import { fetchAll } from "@/lib/supabase/fetch-all";

// Връзката на билдъра с базата: чете частите и вчерашния рафт, пуска билдъра, сверява цените с базата
// и (при „Публикувай“) записва машините в каталога. Работи със сесията на мениджър/администратор (RLS).

type Db = SupabaseClient<Database>;
type ComponentRow = Database["public"]["Tables"]["components"]["Row"];

export function toPart(row: Pick<ComponentRow, "id" | "kind" | "name" | "brand" | "specs" | "image_url"> & Partial<ComponentRow>): AnyPart {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    brand: row.brand,
    specs: row.specs as never,
    image: row.image_url,
    cost_cents: row.cost_cents,
    lead_days: row.lead_days,
  } as AnyPart;
}

/** Кратко описание с конкретика: „Core i5-14400F · RTX 5060 8GB · 16 GB DDR5-6000 · 1 TB NVMe · 750 W 80+ Gold“ */
export function machineSummary(b: Build) {
  const gb = (n: number) => (n >= 1000 ? `${n / 1000} TB` : `${n} GB`);
  return [
    b.cpu?.name,
    b.gpu?.name ?? "вградена графика",
    b.ram && `${b.ram.specs.capacity_gb} GB ${b.ram.specs.type}-${b.ram.specs.speed_mhz}`,
    b.storage && `${gb(b.storage.specs.capacity_gb)} ${b.storage.specs.type}`,
    b.psu && `${b.psu.specs.watts} W ${b.psu.specs.efficiency}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function machineSpecs(b: Build) {
  return partKinds.flatMap((k) => (b[k] ? [{ k: partLabels[k], v: b[k]!.name }] : []));
}

function machineComponents(b: Build) {
  return Object.fromEntries(partKinds.flatMap((k) => (b[k] ? [[k, b[k]!.name]] : [])));
}

function machineSlug(m: Machine) {
  const id = `${m.build.cpu?.id ?? 0}-${m.build.gpu?.id ?? 0}-${m.build.case?.id ?? 0}`;
  return `${slugify(m.name).slice(0, 90)}-${id}`;
}

export type BuilderInput = Awaited<ReturnType<typeof loadInput>>;

/**
 * Всички редове на заявка, страница по страница. Базата връща най-много 1000 реда наведнъж —
 * без това машините идват „без части“ и билдърът ги сваля като непълни.
 */
export async function loadInput(db: Db) {
  const [rows, { data: pricingRow }, products] = await Promise.all([
    fetchAll((a, b) => db.from("components").select("*").eq("is_active", true).eq("in_stock", true).order("id").range(a, b)),
    db.from("settings").select("value").eq("key", "builder_pricing").maybeSingle(),
    fetchAll((a, b) =>
      db.from("products").select("id, slug, name, tier, is_active, updated_at").eq("source", "builder").order("id").range(a, b),
    ),
  ]);
  const pricing = validatePricing(pricingRow?.value);
  const [links, ordered] = products.length
    ? await Promise.all([
        fetchAll((a, b) =>
          db
            .from("machine_parts")
            .select("product_id, kind, component_id, products!inner(source)")
            .eq("products.source", "builder")
            .order("product_id")
            .order("kind")
            .range(a, b),
        ),
        fetchAll((a, b) =>
          db.from("order_items").select("product_id, products!inner(source)").eq("products.source", "builder").order("id").range(a, b),
        ),
      ])
    : [[], []];

  const orderedIds = new Set(ordered.map((o) => o.product_id));
  const partsByProduct = new Map<number, Partial<Record<PartKind, number>>>();
  for (const l of links) {
    const entry = partsByProduct.get(l.product_id) ?? {};
    entry[l.kind] = l.component_id;
    partsByProduct.set(l.product_id, entry);
  }
  const existing: ExistingMachine[] = products
    .filter((p) => p.tier && p.tier in lineById)
    .map((p) => ({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      line: p.tier as LineId,
      parts: partsByProduct.get(p.id) ?? {},
      ordered: orderedIds.has(p.id),
    }));
  const active = products.filter((p) => p.is_active).length;

  return {
    parts: rows.map(toPart),
    samples: rows.filter((r) => r.is_sample).length,
    pricing,
    existing,
    previousTotal: active || null,
    products,
    orderedIds,
  };
}

/** Пуска билдъра и сверява всяка цена с базата (private.machine_price) — разминаване спира прогона */
export async function runAndVerify(db: Db, input: BuilderInput): Promise<RunResult & { priceMismatches: number }> {
  if (!input.pricing) {
    return {
      lines: [],
      repaired: [],
      withdrawn: [],
      quarantined: [],
      verdict: { ok: false, reasons: ["Ценообразуването не е настроено (Билдър → Ценообразуване)."] },
      priceMismatches: 0,
    };
  }
  const result = runBuilder({ parts: input.parts, existing: input.existing, previousTotal: input.previousTotal, pricing: input.pricing });
  const machines = result.lines.flatMap((l) => l.machines);
  let mismatches = 0;
  for (let i = 0; i < machines.length; i += 500) {
    const chunk = machines.slice(i, i + 500);
    const { data, error } = await db.rpc("price_builds", {
      p_builds: chunk.map((m) => ({ line: m.line, parts: partKinds.flatMap((k) => (m.build[k] ? [m.build[k]!.id] : [])) })) as Json,
    });
    if (error) {
      mismatches += chunk.length;
      continue;
    }
    const prices = data as (number | null)[];
    chunk.forEach((m, j) => {
      if (prices[j] !== m.priceCents) mismatches++;
      if (prices[j]) m.priceCents = prices[j]!;
    });
  }
  if (mismatches) {
    result.verdict.ok = false;
    result.verdict.reasons.push(`Цената в базата се различава за ${mismatches} машини — проверете ценообразуването.`);
  }
  return { ...result, priceMismatches: mismatches };
}

/** Записва рафта в каталога: обновява ремонтираните, добавя новите, сваля изчезналите */
export async function publish(db: Db, input: BuilderInput, result: RunResult) {
  const { data: cats } = await db.from("categories").select("id, slug").in("slug", lines.map((l) => `gsol-${l.id}`));
  const categoryId = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  const machines = result.lines.flatMap((l) => l.machines);
  const row = (m: Machine) => ({
    name: m.name,
    brand: "GSOL",
    category_id: categoryId.get(`gsol-${m.line}`) ?? null,
    summary: machineSummary(m.build),
    specs: machineSpecs(m.build) as Json,
    images: m.image ? [m.image] : [],
    price_cents: m.priceCents,
    regular_price_cents: null,
    stock_status: "in_stock",
    delivery_days: `${m.leadDays}–${m.leadDays + builderPolicy.lifecycle.extra_lead_days}`,
    free_windows: true,
    is_active: true,
    tier: m.line,
    components: machineComponents(m.build) as Json,
    source: "builder",
  });

  // Запазените (ремонтирани) машини — адресът не се сменя
  const kept = machines.filter((m) => m.keep);
  for (let i = 0; i < kept.length; i += 100) {
    const chunk = kept.slice(i, i + 100);
    const { error } = await db.from("products").upsert(chunk.map((m) => ({ id: m.keep!.productId, slug: m.keep!.slug, ...row(m) })));
    if (error) throw new Error(`Записът на машините не успя: ${error.message}`);
  }
  // Новите
  const fresh = machines.filter((m) => !m.keep);
  const created: { id: number; m: Machine }[] = [];
  for (let i = 0; i < fresh.length; i += 100) {
    const chunk = fresh.slice(i, i + 100);
    const { data, error } = await db
      .from("products")
      .upsert(chunk.map((m) => ({ slug: machineSlug(m), ...row(m) })), { onConflict: "slug" })
      .select("id, slug");
    if (error) throw new Error(`Добавянето на машините не успя: ${error.message}`);
    const bySlug = new Map((data ?? []).map((d) => [d.slug, d.id]));
    for (const m of chunk) created.push({ id: bySlug.get(machineSlug(m))!, m });
  }

  // Частите на всяка машина — наново
  const all = [...kept.map((m) => ({ id: m.keep!.productId, m })), ...created];
  const ids = all.map((a) => a.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await db.from("machine_parts").delete().in("product_id", ids.slice(i, i + 200));
    if (error) throw new Error(`Частите не се записаха: ${error.message}`);
  }
  const links = all.flatMap(({ id, m }) =>
    partKinds.flatMap((kind) => (m.build[kind] ? [{ product_id: id, kind, component_id: m.build[kind]!.id }] : [])),
  );
  for (let i = 0; i < links.length; i += 500) {
    const { error } = await db.from("machine_parts").insert(links.slice(i, i + 500));
    if (error) throw new Error(`Частите не се записаха: ${error.message}`);
  }

  // Свалените: поръчваните остават като „проверете наличност“, другите стават чернова
  // Само активните — иначе всеки прогон пипа черновите и 21-те дни до изтриване никога не изтичат
  const activeIds = new Set(input.products.filter((p) => p.is_active).map((p) => p.id));
  const onRequest = result.withdrawn.filter((w) => w.ordered && activeIds.has(w.productId)).map((w) => w.productId);
  const drafts = result.withdrawn.filter((w) => !w.ordered && activeIds.has(w.productId)).map((w) => w.productId);
  if (onRequest.length) await db.from("products").update({ stock_status: "on_request" }).in("id", onRequest);
  if (drafts.length) await db.from("products").update({ is_active: false }).in("id", drafts);

  // Машина в чернова повече от N дни и непоръчвана — изтрива се
  const cutoff = Date.now() - builderPolicy.lifecycle.delete_after_days * 86_400_000;
  const stale = input.products
    .filter((p) => !p.is_active && !input.orderedIds.has(p.id) && new Date(p.updated_at).getTime() < cutoff)
    .map((p) => p.id);
  if (stale.length) await db.from("products").delete().in("id", stale);

  return { created: created.length, kept: kept.length, onRequest: onRequest.length, drafts: drafts.length, deleted: stale.length };
}

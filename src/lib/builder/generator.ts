import { byKind, partKinds, type AnyPart, type Build, type Part, type PartKind } from "./parts.ts";
import { builderPolicy, lines as defaultLines, type LineId, type LinePolicy } from "./policy.ts";
import { checkBuild, fits, lineFailures, needsCooler } from "./compatibility.ts";
import { machinePrice, type PricingParams } from "./pricing.ts";

// Нощният билдър: първо ремонтира вчерашните машини, после строи нови по линии и минава през портата.
// Всичко е чисто изчисление — записът в магазина е отделна стъпка, само ако портата пусне прогона.

export type ExistingMachine = {
  productId: number;
  slug: string;
  name: string;
  line: LineId;
  parts: Partial<Record<PartKind, number>>;
  /** Поръчвана машина никога не изчезва — минава в „проверете наличност“ */
  ordered: boolean;
};

export type Machine = {
  line: LineId;
  name: string;
  build: Build;
  partsCents: number;
  priceCents: number;
  /** Най-бавната част в работни дни */
  leadDays: number;
  image: string | null;
  /** При ремонт: коя машина се запазва (адресът остава) */
  keep?: { productId: number; slug: string; replaced: PartKind | null };
};

export type RunResult = {
  lines: { line: LineId; name: string; machines: Machine[]; shelf: LinePolicy["shelf"] }[];
  repaired: { slug: string; name: string; kind: PartKind; from: string | null; to: string }[];
  withdrawn: { productId: number; slug: string; name: string; reason: string; ordered: boolean }[];
  quarantined: { line: LineId; name: string; reasons: string[] }[];
  verdict: { ok: boolean; reasons: string[] };
};

type Input = {
  parts: AnyPart[];
  existing: ExistingMachine[];
  /** Колко машини имаше на рафта вчера (за портата); null при първи прогон */
  previousTotal: number | null;
  pricing: PricingParams;
};

const DEFAULT_LEAD = 3;
const cost = (p: AnyPart | null | undefined) => p?.cost_cents ?? 0;
const partsOf = (b: Build) => partKinds.map((k) => b[k]).filter((p): p is NonNullable<typeof p> => Boolean(p)) as AnyPart[];
const identity = (b: Build) => `${b.cpu?.id ?? 0}-${b.gpu?.id ?? 0}-${b.case?.id ?? 0}`;
/** Сърцевина: процесор + карта + памет + диск — около нея най-много N кутии (броят се и вчерашните) */
const coreKey = (b: Build) => `${b.cpu?.id ?? 0}-${b.gpu?.id ?? 0}-${b.ram?.id ?? 0}-${b.storage?.id ?? 0}`;

export function machineName(build: Build, line: LinePolicy) {
  return `${line.name} — ${build.cpu?.name} / ${build.gpu?.name ?? "вградена графика"} · ${build.case?.name}`;
}

/** Части, подходящи за линията сами по себе си (без да гледаме останалите) */
function kindOk(part: AnyPart, build: Build, line: LineId) {
  if (fits(part, build).length) return false;
  const next = { ...build, [part.kind]: part } as Build;
  return !lineFailures(next, line).some((f) => f.kinds.includes(part.kind));
}

function finish(build: Build, line: LinePolicy, pricing: PricingParams, keep?: Machine["keep"]): Machine {
  const parts = partsOf(build);
  const partsCents = parts.reduce((s, p) => s + cost(p), 0);
  return {
    line: line.id,
    name: machineName(build, line),
    build,
    partsCents,
    priceCents: machinePrice(partsCents, line.id, pricing),
    leadDays: Math.max(...parts.map((p) => p.lead_days ?? DEFAULT_LEAD)),
    image: build.case?.image ?? null,
    keep,
  };
}

/** Дяловете на картата и процесора в цената на частите — да няма слаб процесор пред флагманска карта */
function sharesOk(build: Build, line: LinePolicy) {
  if (!line.shares || !build.gpu) return true;
  const total = partsOf(build).reduce((s, p) => s + cost(p), 0);
  if (!total) return false;
  const g = cost(build.gpu) / total;
  const c = cost(build.cpu) / total;
  return g >= line.shares.gpu[0] && g <= line.shares.gpu[1] && c >= line.shares.cpu[0] && c <= line.shares.cpu[1];
}

function inBand(m: Machine, line: LinePolicy) {
  return m.priceCents >= line.price.min_cents && (line.price.max_cents === null || m.priceCents <= line.price.max_cents);
}

/** Гейтът за една машина: несъвместимост, непокрит стандарт, липсваща снимка, невалидна цена */
function machineProblems(m: Machine, checkStandard: boolean) {
  const reasons = checkBuild(m.build).map((i) => i.message);
  if (checkStandard) reasons.push(...lineFailures(m.build, m.line).map((i) => i.message));
  if (!m.image) reasons.push("Няма снимка (кутията е без снимка).");
  if (!Number.isFinite(m.priceCents) || m.priceCents <= 0) reasons.push("Невалидна цена.");
  return reasons;
}

export function runBuilder(input: Input, options: { lines?: LinePolicy[]; policy?: typeof builderPolicy } = {}): RunResult {
  const lines = options.lines ?? defaultLines;
  const policy = options.policy ?? builderPolicy;
  const stock = byKind(input.parts);
  const byId = new Map(input.parts.map((p) => [p.id, p]));
  const result: RunResult = { lines: [], repaired: [], withdrawn: [], quarantined: [], verdict: { ok: true, reasons: [] } };
  const names = new Set<string>();

  for (const line of lines) {
    const usage = new Map<number, number>();
    const cap = Math.max(1, Math.floor(policy.diversity.max_part_share * line.shelf.target));
    const countUsage = (b: Build) => partsOf(b).forEach((p) => usage.set(p.id, (usage.get(p.id) ?? 0) + 1));
    const underCap = (b: Build) => partsOf(b).every((p) => (usage.get(p.id) ?? 0) < cap);
    const taken = new Set<string>();
    const perCore = new Map<string, number>();
    const addCore = (b: Build) => perCore.set(coreKey(b), (perCore.get(coreKey(b)) ?? 0) + 1);
    const machines: Machine[] = [];

    /** Най-малко използваната от най-евтините годни части */
    const pick = <K extends PartKind>(kind: K, build: Build, extra?: (p: Part<K>) => boolean): Part<K> | null => {
      const valid = (stock[kind] as Part<K>[])
        .filter((p) => kindOk(p as AnyPart, build, line.id) && (!extra || extra(p)))
        .sort((a, b) => cost(a as AnyPart) - cost(b as AnyPart))
        .slice(0, policy.diversity.cheapest_pool);
      valid.sort((a, b) => (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0) || cost(a as AnyPart) - cost(b as AnyPart));
      return valid[0] ?? null;
    };

    // 1. Ремонт на вчерашните машини от тази линия
    for (const ex of input.existing.filter((e) => e.line === line.id)) {
      const build: Build = {};
      const missing: PartKind[] = [];
      for (const kind of partKinds) {
        const id = ex.parts[kind];
        if (!id) continue;
        const part = byId.get(id);
        if (part && part.kind === kind) (build as Record<PartKind, AnyPart>)[kind] = part;
        else missing.push(kind);
      }
      let replaced: PartKind | null = null;
      if (missing.length === 1) {
        const kind = missing[0];
        const sub = pick(kind, build);
        if (sub) {
          (build as Record<PartKind, AnyPart>)[kind] = sub as AnyPart;
          replaced = kind;
          result.repaired.push({ slug: ex.slug, name: ex.name, kind, from: null, to: sub.name });
        }
      }
      // Публикувана машина под днешния стандарт не се сваля — проверяваме само съвместимостта
      if ((missing.length && !replaced) || checkBuild(build).length) {
        result.withdrawn.push({
          productId: ex.productId,
          slug: ex.slug,
          name: ex.name,
          ordered: ex.ordered,
          reason: missing.length > 1 ? `Липсват ${missing.length} части` : missing.length ? "Няма съвместим заместник" : "Несъвместима след промяна",
        });
        continue;
      }
      const m = finish(build, line, input.pricing, { productId: ex.productId, slug: ex.slug, replaced });
      taken.add(identity(build));
      names.add(m.name);
      countUsage(build);
      addCore(build);
      machines.push(m);
    }

    // 2. Нови машини до целта на рафта: сърцевини процесор + карта, редувани по карти за разнообразие
    const cpus = stock.cpu.filter((c) => kindOk(c, {}, line.id) && (line.standard.gpu !== "none" || c.specs.igpu));
    const gpus = line.standard.gpu === "none" ? [null] : stock.gpu.filter((g) => kindOk(g, {}, line.id));
    const groups = gpus.map((gpu) =>
      cpus
        .filter((cpu) => !gpu || !fits(gpu, { cpu }).length)
        .sort((a, b) => cost(a) - cost(b))
        .map((cpu) => ({ cpu, gpu })),
    );
    const cores: { cpu: Part<"cpu">; gpu: Part<"gpu"> | null }[] = [];
    for (let i = 0; groups.some((g) => i < g.length); i++) for (const g of groups) if (g[i]) cores.push(g[i]);

    for (const core of cores) {
      if (machines.length >= line.shelf.target) break;
      const base: Build = { cpu: core.cpu, gpu: core.gpu };
      const mb = pick("motherboard", base);
      if (!mb) continue;
      base.motherboard = mb;
      const ram = pick("ram", base);
      const storage = pick("storage", base);
      if (!ram || !storage) continue;
      Object.assign(base, { ram, storage });
      const wantsCooler = line.standard.cooler !== "always" && line.standard.cooler !== "aio" && typeof line.standard.cooler === "object"
        ? needsCooler(base) || core.cpu.specs.tdp_w >= line.standard.cooler.boxed_below_tdp_w
        : true;
      if (wantsCooler) {
        const cooler = pick("cooler", base);
        if (!cooler) continue;
        base.cooler = cooler;
      }
      const psu = pick("psu", base);
      if (!psu) continue;
      base.psu = psu;

      // До N кутии около една сърцевина: годни, най-евтини, най-малко използвани
      const cases = stock.case
        .filter((c) => kindOk(c, base, line.id))
        .sort((a, b) => cost(a) - cost(b))
        .slice(0, policy.diversity.cheapest_pool * 2)
        .sort((a, b) => (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0) || cost(a) - cost(b));

      for (const box of cases) {
        if (machines.length >= line.shelf.target) break;
        if ((perCore.get(coreKey(base)) ?? 0) >= policy.diversity.cases_per_core) break;
        const build: Build = { ...base, case: box };
        if (taken.has(identity(build)) || !underCap(build) || !sharesOk(build, line)) continue;
        const m = finish(build, line, input.pricing);
        if (!inBand(m, line)) continue;
        const problems = machineProblems(m, true);
        if (names.has(m.name)) problems.push("Дублирано име.");
        if (problems.length) {
          result.quarantined.push({ line: line.id, name: m.name, reasons: problems });
          continue;
        }
        taken.add(identity(build));
        names.add(m.name);
        countUsage(build);
        addCore(build);
        machines.push(m);
      }
    }

    result.lines.push({ line: line.id, name: line.name, machines, shelf: line.shelf });
  }

  // 3. Портата за целия прогон: срив в данните → нищо не се пипа, магазинът остава на вчерашния рафт
  const total = result.lines.reduce((s, l) => s + l.machines.length, 0);
  const reasons: string[] = [];
  if (!input.parts.length) reasons.push("Каталогът с части е празен.");
  if (input.previousTotal && total < input.previousTotal * policy.gate.min_shelf_vs_yesterday) {
    reasons.push(`Рафтът е ${total} машини — под ${Math.round(policy.gate.min_shelf_vs_yesterday * 100)}% от вчерашните ${input.previousTotal}.`);
  }
  for (const l of result.lines) {
    if (l.machines.length < l.shelf.min) reasons.push(`${l.name}: ${l.machines.length} машини при минимум ${l.shelf.min}.`);
  }
  // Свалени = в карантина + махнати от вчерашния рафт (поръчваните остават, затова не се броят)
  const dropped = result.quarantined.length + result.withdrawn.filter((w) => !w.ordered).length;
  if (dropped && dropped / (total + dropped) > policy.gate.max_quarantine_share) {
    reasons.push(`Свалени са ${dropped} от ${total + dropped} машини — над ${Math.round(policy.gate.max_quarantine_share * 100)}%.`);
  }
  result.verdict = { ok: reasons.length === 0, reasons };
  return result;
}

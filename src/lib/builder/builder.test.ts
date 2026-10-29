import { test } from "node:test";
import assert from "node:assert/strict";
import type { AnyPart, Build, Part } from "./parts.ts";
import { checkBuild, classifyLine, fits, lineFailures, requiredWatts } from "./compatibility.ts";
import { machinePrice, roundToNine, validatePricing, type PricingParams } from "./pricing.ts";
import { runBuilder, type ExistingMachine } from "./generator.ts";
import { lines, type LinePolicy } from "./policy.ts";

// ---------------------------------------------------------------- части за тестовете
let nextId = 1;
const part = <K extends AnyPart["kind"]>(kind: K, name: string, specs: Part<K>["specs"], cost: number, extra: Partial<Part<K>> = {}) =>
  ({ id: nextId++, kind, name, brand: null, specs, cost_cents: cost * 100, image: kind === "case" ? `/${name}.jpg` : null, ...extra }) as Part<K>;

const i5 = part("cpu", "Core i5-14400F", { socket: "LGA1700", class: 5, cores: 10, tdp_w: 65, igpu: false, boxed_cooler: true, memory: ["DDR4", "DDR5"], release_year: 2024 }, 140);
const i3old = part("cpu", "Core i3-10100F", { socket: "LGA1200", class: 3, cores: 4, tdp_w: 65, igpu: false, boxed_cooler: true, memory: ["DDR4"], release_year: 2020 }, 70);
const i5igpu = part("cpu", "Core i5-14400", { socket: "LGA1700", class: 5, cores: 10, tdp_w: 65, igpu: true, boxed_cooler: true, memory: ["DDR4", "DDR5"], release_year: 2024 }, 180);
const i7k = part("cpu", "Core i7-14700K", { socket: "LGA1700", class: 7, cores: 20, tdp_w: 125, igpu: true, boxed_cooler: false, memory: ["DDR4", "DDR5"], release_year: 2023 }, 380);
const b760 = part("motherboard", "B760M DDR5", { socket: "LGA1700", chipset: "B760", tier: "B", memory_type: "DDR5", form_factor: "mATX" }, 130);
const h610 = part("motherboard", "H610M DDR4", { socket: "LGA1700", chipset: "H610", tier: "H", memory_type: "DDR4", form_factor: "mATX" }, 80);
const ddr5 = part("ram", "32GB DDR5-6000", { type: "DDR5", form: "DIMM", capacity_gb: 32, speed_mhz: 6000 }, 110);
const ddr4 = part("ram", "16GB DDR4-3200", { type: "DDR4", form: "DIMM", capacity_gb: 16, speed_mhz: 3200 }, 40);
const sodimm = part("ram", "16GB DDR4 SO-DIMM", { type: "DDR4", form: "SO-DIMM", capacity_gb: 16, speed_mhz: 3200 }, 38);
const rtx4060 = part("gpu", "RTX 4060", { tier: 5, vram_gb: 8, tdp_w: 115, length_mm: 240, release_year: 2023, current_gen: true }, 320);
const rtx5090 = part("gpu", "RTX 5090", { tier: 10, vram_gb: 32, tdp_w: 575, length_mm: 336, release_year: 2025, current_gen: true }, 2400);
const nvme1 = part("storage", "1TB NVMe", { type: "NVMe", capacity_gb: 1000 }, 70);
const psu650 = part("psu", "650W Bronze", { watts: 650, efficiency: "80+ Bronze", branded: true }, 60);
const psu450 = part("psu", "450W", { watts: 450, efficiency: "80+", branded: false }, 30);
const glass = part("case", "Glass mATX", { form_factors: ["ATX", "mATX"], glass: true, max_gpu_mm: 330, max_cooler_mm: 165, radiators_mm: [240, 360] }, 70);
const air = part("cooler", "Tower 180W", { type: "air", tdp_w: 180, sockets: ["LGA1700", "AM5"], height_mm: 155 }, 35);

const good: Build = { cpu: i5, motherboard: b760, ram: ddr5, gpu: rtx4060, storage: nvme1, psu: psu650, case: glass, cooler: air };
const codes = (b: Build) => checkBuild(b).map((i) => i.code);

// ---------------------------------------------------------------- капаните от документа
test("капан 1: SO-DIMM (лаптопна) памет в настолен компютър", () => {
  assert.ok(codes({ ...good, motherboard: h610, ram: sodimm }).includes("RAM_SODIMM"));
  assert.ok(fits(sodimm, { cpu: i5, motherboard: h610 }).some((i) => i.code === "RAM_SODIMM"));
});

test("капан 2: стар или слаб процесор пред флагманска карта", () => {
  const b: Build = { ...good, cpu: i3old, gpu: rtx5090 };
  const c = codes(b);
  assert.ok(c.includes("BALANCE_CPU"));
  assert.ok(c.includes("BALANCE_OLD_CPU"));
  assert.ok(fits(rtx5090, { cpu: i5 }).some((i) => i.code === "BALANCE_CPU"), "i5 е слаб за клас 10");
});

test("капан 3: офис машина с процесор без вградена графика", () => {
  assert.ok(codes({ ...good, gpu: null }).includes("NO_GRAPHICS"));
  assert.ok(!codes({ ...good, cpu: i5igpu, gpu: null }).includes("NO_GRAPHICS"));
});

test("капан 4: проверка, която минава, когато частта липсва", () => {
  // i7-14700K е без кутиен охладител — без отделен охладител трябва да е грешка, не „съвместимо“
  assert.ok(codes({ ...good, cpu: i7k, cooler: null }).includes("NO_COOLER"));
  // липсващо дъно е грешка, а не пропусната проверка за сокет
  const noBoard = codes({ ...good, motherboard: null });
  assert.ok(noBoard.includes("MISSING_MOTHERBOARD"));
  assert.deepEqual(codes({}).sort(), ["MISSING_CASE", "MISSING_CPU", "MISSING_MOTHERBOARD", "MISSING_PSU", "MISSING_RAM", "MISSING_STORAGE"]);
});

// ---------------------------------------------------------------- съвместимост и стандарти
test("пълна съвместима конфигурация няма проблеми", () => {
  assert.deepEqual(checkBuild(good), []);
});

test("сокет, тип памет, кутия, видеокарта, захранване", () => {
  assert.ok(codes({ ...good, cpu: i3old }).includes("SOCKET"));
  assert.ok(codes({ ...good, ram: ddr4 }).includes("RAM_TYPE"));
  assert.ok(codes({ ...good, case: { ...glass, specs: { ...glass.specs, form_factors: ["ITX"] } } }).includes("CASE_FORM"));
  assert.ok(codes({ ...good, case: { ...glass, specs: { ...glass.specs, max_gpu_mm: 200 } } }).includes("GPU_LENGTH"));
  assert.equal(requiredWatts({ cpu: i5, gpu: rtx4060 }), 400);
  assert.ok(codes({ ...good, cpu: i5, gpu: rtx5090, psu: psu450 }).includes("PSU_POWER"));
});

test("стандартите на линиите и класификация", () => {
  // 650 W не стига за „Избор“ (иска 750 W марково) — остава Basic Gaming
  assert.equal(classifyLine(good), "basic");
  assert.ok(lineFailures(good, "izbor").some((f) => f.code === "LINE_PSU"));
  const psu750 = part("psu", "750W Gold", { watts: 750, efficiency: "80+ Gold", branded: true }, 95);
  assert.equal(classifyLine({ ...good, psu: psu750 }), "izbor");
  assert.ok(lineFailures({ ...good, psu: psu750 }, "premium").some((f) => f.code === "LINE_AIO"));
  const office: Build = { cpu: i5igpu, motherboard: h610, ram: ddr4, storage: nvme1, psu: psu450, case: glass };
  assert.deepEqual(lineFailures(office, "office"), []);
  assert.equal(classifyLine(office), "office");
});

// ---------------------------------------------------------------- цена
const pricing: PricingParams = {
  fixed_costs_cents: { assembly: 1000, test: 500 },
  warranty_pct: 2,
  payment_fee_pct: 2,
  markup_cents: { office: 10000, basic: 10000, izbor: 15000, premium: 20000 },
  line_addon_cents: { izbor: 2000 },
  labor: { min_cents: 3000, pct: 4 },
  rounding: { threshold_eur: 1999, small_step_eur: 10, large_step_eur: 100 },
};

test("закръгляне на …9", () => {
  const r = pricing.rounding;
  assert.equal(roundToNine(1234, r), 1239);
  assert.equal(roundToNine(1239, r), 1239);
  assert.equal(roundToNine(1240, r), 1249);
  assert.equal(roundToNine(1995, r), 1999);
  assert.equal(roundToNine(2000, r), 2099);
  assert.equal(roundToNine(2345, r), 2399);
});

test("цена на машина: части + фиксирани разходи + надценка + труд + такса", () => {
  // 1000 € части: 1000 + 15 + 20 (2%) + 150 + 20 + 40 (4% > 30) = 1245 € → /0.98 = 1270,41 → 1271 → 1279
  assert.equal(machinePrice(100000, "izbor", pricing), 127900);
  // офис: без добавка; трудът е минималният
  assert.equal(machinePrice(50000, "office", pricing), roundToNine(Math.ceil(Math.ceil((50000 + 1500 + 1000 + 10000 + 3000) / 0.98) / 100), pricing.rounding) * 100);
  assert.ok(validatePricing(pricing));
  assert.equal(validatePricing({ ...pricing, payment_fee_pct: -1 }), null);
});

// ---------------------------------------------------------------- билдър и порта
const smallLines: LinePolicy[] = lines.map((l) => ({ ...l, shelf: { min: 1, target: 6, max: 10 }, price: { min_cents: 0, max_cents: null }, shares: undefined }));
const cases = Array.from({ length: 7 }, (_, i) =>
  part("case", `Case ${i + 1}`, { form_factors: ["ATX", "mATX"], glass: true, max_gpu_mm: 330, max_cooler_mm: 165, radiators_mm: [240] }, 60 + i),
);
const catalog: AnyPart[] = [i5, i5igpu, b760, h610, ddr5, ddr4, rtx4060, nvme1, psu650, psu450, air, ...cases];

test("билдърът строи съвместими машини, най-много 5 кутии около една сърцевина", () => {
  const r = runBuilder({ parts: catalog, existing: [], previousTotal: null, pricing }, { lines: smallLines });
  const basic = r.lines.find((l) => l.line === "basic")!;
  assert.ok(basic.machines.length > 0);
  for (const m of basic.machines) assert.deepEqual(checkBuild(m.build), [], m.name);
  const perCore = new Map<string, number>();
  for (const m of basic.machines) {
    const key = `${m.build.cpu?.id}-${m.build.gpu?.id}`;
    perCore.set(key, (perCore.get(key) ?? 0) + 1);
  }
  assert.ok([...perCore.values()].every((n) => n <= 5));
  // имената са уникални
  const all = r.lines.flatMap((l) => l.machines.map((m) => m.name));
  assert.equal(new Set(all).size, all.length);
});

test("5 кутии около сърцевина — броят се и вчерашните машини", () => {
  const first = runBuilder({ parts: catalog, existing: [], previousTotal: null, pricing }, { lines: smallLines });
  // вчерашният рафт = този прогон; втори прогон не бива да добавя кутии над 5 около същата сърцевина
  const existing: ExistingMachine[] = first.lines.flatMap((l) =>
    l.machines.map((m, i) => ({
      productId: 1000 + i + l.line.length * 100,
      slug: `m-${l.line}-${i}`,
      name: m.name,
      line: l.line,
      parts: Object.fromEntries(Object.entries(m.build).filter(([, p]) => p).map(([k, p]) => [k, p!.id])),
      ordered: false,
    })),
  );
  const second = runBuilder({ parts: catalog, existing, previousTotal: existing.length, pricing }, { lines: smallLines.map((l) => ({ ...l, shelf: { ...l.shelf, target: 50 } })) });
  for (const l of second.lines) {
    const perCore = new Map<string, number>();
    for (const m of l.machines) {
      const key = `${m.build.cpu?.id}-${m.build.gpu?.id}-${m.build.ram?.id}-${m.build.storage?.id}`;
      perCore.set(key, (perCore.get(key) ?? 0) + 1);
    }
    assert.ok([...perCore.values()].every((n) => n <= 5), `${l.name}: ${JSON.stringify([...perCore])}`);
  }
});

test("една част носи най-много 30% от рафта на линията", () => {
  const r = runBuilder({ parts: catalog, existing: [], previousTotal: null, pricing }, { lines: smallLines.map((l) => ({ ...l, shelf: { min: 1, target: 10, max: 10 } })) });
  for (const l of r.lines) {
    const count = new Map<number, number>();
    for (const m of l.machines) for (const p of Object.values(m.build)) if (p) count.set(p.id, (count.get(p.id) ?? 0) + 1);
    for (const [, n] of count) assert.ok(n <= 3, `${l.name}: част в ${n} машини`);
  }
});

test("ремонт: една свършила част получава заместник, адресът остава; две — машината се сваля", () => {
  const goneCase = part("case", "Изчерпана кутия", glass.specs, 50);
  const existing: ExistingMachine[] = [
    { productId: 1, slug: "masina-1", name: "Машина 1", line: "izbor", parts: { cpu: i5.id, motherboard: b760.id, ram: ddr5.id, gpu: rtx4060.id, storage: nvme1.id, psu: psu650.id, case: goneCase.id, cooler: air.id }, ordered: false },
    { productId: 2, slug: "masina-2", name: "Машина 2", line: "izbor", parts: { cpu: 999, motherboard: 998, ram: ddr5.id }, ordered: true },
  ];
  const r = runBuilder({ parts: catalog, existing, previousTotal: null, pricing }, { lines: smallLines });
  const kept = r.lines.find((l) => l.line === "izbor")!.machines.find((m) => m.keep?.slug === "masina-1");
  assert.ok(kept, "ремонтираната машина пази адреса си");
  assert.equal(kept!.keep!.replaced, "case");
  const gone = r.withdrawn.find((w) => w.slug === "masina-2")!;
  assert.ok(gone && gone.ordered, "поръчваната машина се отбелязва — не изчезва");
});

test("портата: празен каталог, рафт под 60% от вчерашния, линия под минимума", () => {
  assert.equal(runBuilder({ parts: [], existing: [], previousTotal: null, pricing }, { lines: smallLines }).verdict.ok, false);
  const big = smallLines.map((l) => ({ ...l, shelf: { min: 50, target: 60, max: 70 } }));
  const r = runBuilder({ parts: catalog, existing: [], previousTotal: 1000, pricing }, { lines: big });
  assert.equal(r.verdict.ok, false);
  assert.ok(r.verdict.reasons.some((x) => x.includes("60%")));
  assert.ok(r.verdict.reasons.some((x) => x.includes("минимум")));
});

test("портата: над 10% свалени от вчерашния рафт спира прогона", () => {
  // 10 вчерашни машини, всяка с липсващи 2 части → всички се свалят
  const existing: ExistingMachine[] = Array.from({ length: 10 }, (_, i) => ({
    productId: 100 + i,
    slug: `stara-${i}`,
    name: `Стара ${i}`,
    line: "basic",
    parts: { cpu: 9000 + i, motherboard: 9100 + i, ram: ddr4.id },
    ordered: false,
  }));
  const r = runBuilder({ parts: catalog, existing, previousTotal: 10, pricing }, { lines: smallLines });
  assert.equal(r.withdrawn.length, 10);
  assert.equal(r.verdict.ok, false);
  assert.ok(r.verdict.reasons.some((x) => x.includes("Свалени са")));
});

test("кутия без снимка отива в карантина", () => {
  const noImage = cases.map((c) => ({ ...c, image: null }));
  const r = runBuilder({ parts: [...catalog.filter((p) => p.kind !== "case"), ...noImage], existing: [], previousTotal: null, pricing }, { lines: smallLines });
  assert.ok(r.quarantined.length > 0);
  assert.ok(r.quarantined.every((q) => q.reasons.some((x) => x.includes("снимка"))));
  assert.equal(r.verdict.ok, false);
});

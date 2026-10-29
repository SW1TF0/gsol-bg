import type { PartKind } from "./parts.ts";

// Полетата на спецификациите по вид част — за формата в админа и за проверката при запис.

export type SpecField =
  | { key: string; label: string; type: "number"; min?: number; max?: number; optional?: boolean }
  | { key: string; label: string; type: "text" }
  | { key: string; label: string; type: "bool" }
  | { key: string; label: string; type: "select"; options: (string | number)[]; optional?: boolean }
  | { key: string; label: string; type: "multi"; options: (string | number)[] };

const SOCKETS = ["LGA1700", "LGA1851", "AM4", "AM5"];

export const specFields: Record<PartKind, SpecField[]> = {
  cpu: [
    { key: "socket", label: "Сокет", type: "select", options: SOCKETS },
    { key: "class", label: "Клас (i3/R3 = 3 … i9/R9 = 9)", type: "select", options: [3, 5, 7, 9] },
    { key: "cores", label: "Ядра", type: "number", min: 1, max: 128 },
    { key: "tdp_w", label: "TDP (W)", type: "number", min: 1, max: 500 },
    { key: "release_year", label: "Година", type: "number", min: 2010, max: 2100 },
    { key: "memory", label: "Памет", type: "multi", options: ["DDR4", "DDR5"] },
    { key: "igpu", label: "Вградена графика", type: "bool" },
    { key: "boxed_cooler", label: "С кутиен охладител", type: "bool" },
  ],
  motherboard: [
    { key: "socket", label: "Сокет", type: "select", options: SOCKETS },
    { key: "chipset", label: "Чипсет", type: "text" },
    { key: "tier", label: "Клас на чипсета", type: "select", options: ["A", "H", "B", "Z", "X"] },
    { key: "memory_type", label: "Памет", type: "select", options: ["DDR4", "DDR5"] },
    { key: "form_factor", label: "Форм фактор", type: "select", options: ["ATX", "mATX", "ITX"] },
  ],
  ram: [
    { key: "type", label: "Тип", type: "select", options: ["DDR4", "DDR5"] },
    { key: "form", label: "Модул", type: "select", options: ["DIMM", "SO-DIMM"] },
    { key: "capacity_gb", label: "Капацитет (GB)", type: "number", min: 1, max: 512 },
    { key: "speed_mhz", label: "Честота (MHz)", type: "number", min: 1000, max: 12000 },
  ],
  gpu: [
    { key: "tier", label: "Клас на производителност (1–10)", type: "number", min: 1, max: 10 },
    { key: "vram_gb", label: "Памет (GB)", type: "number", min: 1, max: 128 },
    { key: "tdp_w", label: "Консумация (W)", type: "number", min: 1, max: 1000 },
    { key: "length_mm", label: "Дължина (мм)", type: "number", min: 100, max: 500 },
    { key: "release_year", label: "Година", type: "number", min: 2010, max: 2100 },
    { key: "current_gen", label: "Текущо поколение", type: "bool" },
  ],
  storage: [
    { key: "type", label: "Тип", type: "select", options: ["NVMe", "SATA", "HDD"] },
    { key: "capacity_gb", label: "Капацитет (GB)", type: "number", min: 64, max: 100000 },
  ],
  psu: [
    { key: "watts", label: "Мощност (W)", type: "number", min: 200, max: 3000 },
    { key: "efficiency", label: "Сертификат", type: "select", options: ["80+", "80+ Bronze", "80+ Gold", "80+ Platinum"] },
    { key: "branded", label: "Марков производител", type: "bool" },
  ],
  case: [
    { key: "form_factors", label: "Побира дъна", type: "multi", options: ["ATX", "mATX", "ITX"] },
    { key: "max_gpu_mm", label: "Видеокарта до (мм)", type: "number", min: 100, max: 600 },
    { key: "max_cooler_mm", label: "Охладител до (мм)", type: "number", min: 30, max: 250 },
    { key: "radiators_mm", label: "Радиатори", type: "multi", options: [240, 280, 360] },
    { key: "glass", label: "Стъклен страничен панел", type: "bool" },
  ],
  cooler: [
    { key: "type", label: "Тип", type: "select", options: ["air", "aio"] },
    { key: "tdp_w", label: "Охлажда до (W)", type: "number", min: 30, max: 600 },
    { key: "sockets", label: "Сокети", type: "multi", options: SOCKETS },
    { key: "height_mm", label: "Височина (мм, при въздушен)", type: "number", min: 20, max: 250, optional: true },
    { key: "radiator_mm", label: "Радиатор (мм, при воден)", type: "select", options: [240, 280, 360], optional: true },
  ],
};

/** Чете полетата от формата → спецификации или списък с грешки */
export function readSpecs(kind: PartKind, get: (key: string) => string | null, getAll: (key: string) => string[]) {
  const specs: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const f of specFields[kind]) {
    const name = `spec_${f.key}`;
    if (f.type === "bool") {
      specs[f.key] = get(name) === "on";
    } else if (f.type === "multi") {
      const numeric = typeof f.options[0] === "number";
      const values = getAll(name).filter((v) => f.options.map(String).includes(v));
      if (!values.length && f.key !== "radiators_mm") errors.push(`${f.label}: изберете поне едно.`);
      specs[f.key] = numeric ? values.map(Number) : values;
    } else if (f.type === "number") {
      const raw = (get(name) ?? "").trim();
      if (!raw && f.optional) continue;
      const n = Number(raw.replace(",", "."));
      if (!raw || !Number.isFinite(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        errors.push(`${f.label}: невалидна стойност.`);
      } else specs[f.key] = n;
    } else if (f.type === "select") {
      const raw = get(name) ?? "";
      if (!raw && f.optional) continue;
      const match = f.options.find((o) => String(o) === raw);
      if (match === undefined) errors.push(`${f.label}: изберете стойност.`);
      else specs[f.key] = match;
    } else {
      const raw = (get(name) ?? "").trim();
      if (!raw) errors.push(`${f.label}: попълнете.`);
      else specs[f.key] = raw.slice(0, 40);
    }
  }
  if (kind === "cooler" && specs.type === "air" && !specs.height_mm) errors.push("Въздушен охладител: въведете височина.");
  if (kind === "cooler" && specs.type === "aio" && !specs.radiator_mm) errors.push("Воден охладител: изберете радиатор.");
  return { specs, errors };
}

/** Кратък ред със спецификациите — за таблицата с части */
export function specLine(kind: PartKind, specs: Record<string, unknown>) {
  return specFields[kind]
    .filter((f) => specs[f.key] !== undefined && specs[f.key] !== false)
    .map((f) => {
      const v = specs[f.key];
      if (v === true) return f.label;
      return Array.isArray(v) ? v.join("/") : String(v);
    })
    .join(" · ");
}

/** Ред за клиента в конфигуратора: „AM5 · 6 ядра · 65 W · DDR5 · вградена графика“ */
export function partSummary(kind: PartKind, s: Record<string, unknown>) {
  const gb = (n: unknown) => (Number(n) >= 1000 ? `${Number(n) / 1000} TB` : `${n} GB`);
  const list = (v: unknown) => (Array.isArray(v) ? v.join("/") : "");
  switch (kind) {
    case "cpu":
      return [s.socket, `${s.cores} ядра`, `${s.tdp_w} W`, list(s.memory), s.igpu && "вградена графика", s.boxed_cooler && "с охладител"]
        .filter(Boolean)
        .join(" · ");
    case "motherboard":
      return [s.socket, s.chipset, s.memory_type, s.form_factor].join(" · ");
    case "ram":
      return `${s.capacity_gb} GB ${s.type}-${s.speed_mhz}${s.form === "SO-DIMM" ? " · SO-DIMM (за лаптоп)" : ""}`;
    case "gpu":
      return [`${s.vram_gb} GB`, `${s.tdp_w} W`, `${s.length_mm} мм`, s.current_gen ? "текущо поколение" : null].filter(Boolean).join(" · ");
    case "storage":
      return `${gb(s.capacity_gb)} ${s.type}`;
    case "psu":
      return [`${s.watts} W`, s.efficiency, s.branded ? "марково" : null].filter(Boolean).join(" · ");
    case "case":
      return [list(s.form_factors), `карта до ${s.max_gpu_mm} мм`, s.glass && "стъкло", Array.isArray(s.radiators_mm) && s.radiators_mm.includes(360) && "радиатор 360"]
        .filter(Boolean)
        .join(" · ");
    case "cooler":
      return s.type === "aio" ? `Воден ${s.radiator_mm} мм · до ${s.tdp_w} W` : `Въздушен · до ${s.tdp_w} W · ${s.height_mm} мм`;
  }
}

import { partLabels, type AnyPart, type Build, type PartKind } from "./parts.ts";
import { builderPolicy, lineById, lines, type LineId } from "./policy.ts";

// Съвместимост и стандарти на линиите. Едни и същи правила за нощния билдър, портата и конфигуратора.
// Капаните от реални провали имат свои тестове: SO-DIMM в настолен компютър, стар процесор пред флагманска
// карта, офис машина без вградена графика и проверка, която „минава“, когато частта липсва.

export type Issue = { code: string; message: string; kinds: PartKind[] };

const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;

/** Нужни ватове: процесор + карта + останалото, с запас */
export function requiredWatts(build: Build, policy = builderPolicy) {
  const draw = (build.cpu?.specs.tdp_w ?? 0) + (build.gpu?.specs.tdp_w ?? 0) + policy.power.base_w;
  return roundUp(draw * policy.power.headroom, 50);
}

/** Нужен ли е отделен охладител (липсващата част е грешка, не „минава“) */
export function needsCooler(build: Build) {
  return !build.cpu?.specs.boxed_cooler;
}

/** Нужна ли е видеокарта: без вградена графика — задължително */
export function needsGpu(build: Build) {
  return !build.cpu?.specs.igpu;
}

/**
 * Всички проблеми на една конфигурация. Празен списък = съвместима и пълна.
 * Липсваща задължителна част винаги е грешка — никоя проверка не минава „защото частта я няма“.
 */
export function checkBuild(build: Build, policy = builderPolicy): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, message: string, kinds: PartKind[]) => issues.push({ code, message, kinds });
  const { cpu, motherboard: mb, ram, gpu, psu, case: box, cooler } = build;

  for (const kind of ["cpu", "motherboard", "ram", "storage", "psu", "case"] as const) {
    if (!build[kind]) add(`MISSING_${kind.toUpperCase()}`, `Изберете ${partLabels[kind].toLowerCase()}.`, [kind]);
  }
  if (cpu && !gpu && !cpu.specs.igpu) {
    add("NO_GRAPHICS", "Процесорът няма вградена графика — нужна е видеокарта.", ["cpu", "gpu"]);
  }
  if (cpu && !cooler && !cpu.specs.boxed_cooler) {
    add("NO_COOLER", "Процесорът е без кутиен охладител — изберете охладител.", ["cpu", "cooler"]);
  }

  if (cpu && mb && cpu.specs.socket !== mb.specs.socket) {
    add("SOCKET", `Сокетът не съвпада: процесор ${cpu.specs.socket}, дъно ${mb.specs.socket}.`, ["cpu", "motherboard"]);
  }
  if (cpu && mb && !cpu.specs.memory.includes(mb.specs.memory_type)) {
    add("CPU_MEMORY", `Процесорът не работи с ${mb.specs.memory_type}.`, ["cpu", "motherboard"]);
  }
  if (ram && ram.specs.form === "SO-DIMM") {
    add("RAM_SODIMM", "SO-DIMM е лаптопна памет — в настолен компютър е нужна DIMM.", ["ram"]);
  }
  if (ram && mb && ram.specs.type !== mb.specs.memory_type) {
    add("RAM_TYPE", `Дъното е за ${mb.specs.memory_type}, а паметта е ${ram.specs.type}.`, ["ram", "motherboard"]);
  }
  if (mb && box && !box.specs.form_factors.includes(mb.specs.form_factor)) {
    add("CASE_FORM", `Кутията не побира ${mb.specs.form_factor} дъно.`, ["case", "motherboard"]);
  }
  if (gpu && box && gpu.specs.length_mm > box.specs.max_gpu_mm) {
    add("GPU_LENGTH", `Видеокартата (${gpu.specs.length_mm} мм) не влиза в кутията (до ${box.specs.max_gpu_mm} мм).`, ["gpu", "case"]);
  }
  if (psu && cpu) {
    const need = requiredWatts(build, policy);
    if (psu.specs.watts < need) add("PSU_POWER", `Захранването е ${psu.specs.watts} W, нужни са поне ${need} W.`, ["psu"]);
  }
  if (cooler && cpu) {
    if (!cooler.specs.sockets.includes(cpu.specs.socket)) {
      add("COOLER_SOCKET", `Охладителят не поддържа сокет ${cpu.specs.socket}.`, ["cooler", "cpu"]);
    }
    if (cooler.specs.tdp_w < cpu.specs.tdp_w) {
      add("COOLER_TDP", `Охладителят е за ${cooler.specs.tdp_w} W, процесорът е ${cpu.specs.tdp_w} W.`, ["cooler", "cpu"]);
    }
  }
  if (cooler && box) {
    if (cooler.specs.type === "air" && (cooler.specs.height_mm ?? 0) > box.specs.max_cooler_mm) {
      add("COOLER_HEIGHT", `Охладителят е ${cooler.specs.height_mm} мм, кутията побира до ${box.specs.max_cooler_mm} мм.`, ["cooler", "case"]);
    }
    if (cooler.specs.type === "aio" && !box.specs.radiators_mm.includes(cooler.specs.radiator_mm ?? 0)) {
      add("COOLER_RADIATOR", `Кутията няма място за радиатор ${cooler.specs.radiator_mm} мм.`, ["cooler", "case"]);
    }
  }

  // Баланс: силна карта иска съответен процесор, и то не стар
  if (cpu && gpu) {
    const rule = policy.balance.min_cpu_class.find((r) => gpu.specs.tier >= r.gpu_tier);
    if (rule && cpu.specs.class < rule.cpu_class) {
      add("BALANCE_CPU", "Процесорът е слаб за тази видеокарта — ще я спира.", ["cpu", "gpu"]);
    }
    const age = policy.balance.max_cpu_age_years;
    if (gpu.specs.tier >= age.gpu_tier && gpu.specs.release_year - cpu.specs.release_year > age.years) {
      add("BALANCE_OLD_CPU", "Процесорът е твърде стар за тази видеокарта.", ["cpu", "gpu"]);
    }
  }
  return issues;
}

/** Къде конфигурацията не покрива стандарта на линията */
export function lineFailures(build: Build, lineId: LineId): Issue[] {
  const s = lineById[lineId].standard;
  const out: Issue[] = [];
  const add = (code: string, message: string, kinds: PartKind[]) => out.push({ code, message, kinds });
  const { cpu, motherboard: mb, ram, gpu, storage, psu, case: box, cooler } = build;

  if (s.gpu === "none" && gpu) add("LINE_NO_GPU", "Линията е с вградена графика.", ["gpu"]);
  if (s.gpu === "required" && !gpu) add("LINE_GPU", "Линията изисква видеокарта.", ["gpu"]);
  if (s.gpu_current_gen && gpu && !gpu.specs.current_gen) add("LINE_GPU_GEN", "Видеокартата не е от текущо поколение.", ["gpu"]);
  if (s.cpu_min_class && cpu && cpu.specs.class < s.cpu_min_class) add("LINE_CPU", `Нужен е процесор клас ${s.cpu_min_class}+.`, ["cpu"]);
  if (ram && ram.specs.capacity_gb < s.ram_min_gb) add("LINE_RAM", `Нужни са поне ${s.ram_min_gb} GB памет.`, ["ram"]);
  if (s.ram_type && ram && ram.specs.type !== s.ram_type) add("LINE_RAM_TYPE", `Нужна е ${s.ram_type} памет.`, ["ram"]);
  if (s.ram_min_mhz && ram && ram.specs.speed_mhz < s.ram_min_mhz) add("LINE_RAM_MHZ", `Паметта трябва да е поне ${s.ram_min_mhz} MHz.`, ["ram"]);
  if (storage && storage.specs.capacity_gb < s.storage_min_gb) add("LINE_STORAGE", `Нужен е диск поне ${s.storage_min_gb} GB.`, ["storage"]);
  if (s.storage_nvme && storage && storage.specs.type !== "NVMe") add("LINE_NVME", "Нужен е NVMe диск.", ["storage"]);
  if (psu && psu.specs.watts < s.psu_min_w) add("LINE_PSU", `Нужно е захранване поне ${s.psu_min_w} W.`, ["psu"]);
  if (s.psu_gold && psu && !/Gold|Platinum/.test(psu.specs.efficiency)) add("LINE_PSU_GOLD", "Нужно е захранване 80+ Gold.", ["psu"]);
  if (s.psu_branded && psu && !psu.specs.branded) add("LINE_PSU_BRAND", "Нужно е захранване от марков производител.", ["psu"]);
  if (s.board_tiers && mb && !s.board_tiers.includes(mb.specs.tier)) add("LINE_CHIPSET", `Нужен е чипсет ${s.board_tiers.join("/")}.`, ["motherboard"]);
  if (s.glass_case && box && !box.specs.glass) add("LINE_GLASS", "Линията е със стъклена кутия.", ["case"]);
  if (s.cooler === "always" && !cooler) add("LINE_COOLER", "Линията е с отделен охладител.", ["cooler"]);
  if (s.cooler === "aio" && cooler?.specs.type !== "aio") add("LINE_AIO", "Линията е с водно охлаждане.", ["cooler"]);
  if (typeof s.cooler === "object" && cpu && !cooler && cpu.specs.tdp_w >= s.cooler.boxed_below_tdp_w) {
    add("LINE_COOLER_TDP", `Над ${s.cooler.boxed_below_tdp_w} W е нужен отделен охладител.`, ["cooler"]);
  }
  if (s.cooler_min_tdp_w && cooler && cooler.specs.tdp_w < s.cooler_min_tdp_w) add("LINE_COOLER_CLASS", "Нужно е по-силно охлаждане.", ["cooler"]);
  return out;
}

/** Най-високата линия, чийто стандарт конфигурацията покрива (за цената в конфигуратора) */
export function classifyLine(build: Build): LineId | null {
  for (const id of ["premium", "izbor", "basic", "office"] as const) {
    if (!lineFailures(build, id).length) return id;
  }
  return null;
}

/** Линията, по която се смята цената на свободна конфигурация */
export function pricingLine(build: Build): LineId {
  return classifyLine(build) ?? (build.gpu ? "basic" : "office");
}

/**
 * Може ли тази част да влезе в текущата конфигурация — проверяват се само конфликтите, в които участва
 * самата част (липсващите други части не я изключват).
 */
export function fits(part: AnyPart, build: Build) {
  const next = { ...build, [part.kind]: part } as Build;
  return checkBuild(next).filter((i) => !i.code.startsWith("MISSING_") && !["NO_GRAPHICS", "NO_COOLER"].includes(i.code) && i.kinds.includes(part.kind));
}

export const lineNames = Object.fromEntries(lines.map((l) => [l.id, l.name])) as Record<LineId, string>;

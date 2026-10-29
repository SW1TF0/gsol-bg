// Частите за машините и техните спецификации. Спецификациите идват от доставчиците (разчетени от текста)
// или се въвеждат от админа; доставната цена (cost_cents) е само за сървъра и админа — никога за клиента.

export type PartKind = "cpu" | "motherboard" | "ram" | "gpu" | "storage" | "psu" | "case" | "cooler";
export type FormFactor = "ATX" | "mATX" | "ITX";
export type MemoryType = "DDR4" | "DDR5";

export const partKinds: PartKind[] = ["cpu", "motherboard", "ram", "gpu", "storage", "cooler", "psu", "case"];

export const partLabels: Record<PartKind, string> = {
  cpu: "Процесор",
  motherboard: "Дънна платка",
  ram: "Памет",
  gpu: "Видеокарта",
  storage: "Диск",
  cooler: "Охладител",
  psu: "Захранване",
  case: "Кутия",
};

export type CpuSpecs = {
  socket: string;
  /** Клас: 3 (i3/Ryzen 3), 5, 7, 9 */
  class: 3 | 5 | 7 | 9;
  cores: number;
  tdp_w: number;
  igpu: boolean;
  boxed_cooler: boolean;
  memory: MemoryType[];
  release_year: number;
};
export type BoardSpecs = {
  socket: string;
  chipset: string;
  /** Клас на чипсета: A/H (основен), B (среден), Z/X (горен) */
  tier: "A" | "H" | "B" | "Z" | "X";
  memory_type: MemoryType;
  form_factor: FormFactor;
};
export type RamSpecs = { type: MemoryType; form: "DIMM" | "SO-DIMM"; capacity_gb: number; speed_mhz: number };
export type GpuSpecs = {
  /** Клас на производителност 1–10 (10 = флагман) */
  tier: number;
  vram_gb: number;
  tdp_w: number;
  length_mm: number;
  release_year: number;
  current_gen: boolean;
};
export type StorageSpecs = { type: "NVMe" | "SATA" | "HDD"; capacity_gb: number };
export type PsuSpecs = { watts: number; efficiency: "80+" | "80+ Bronze" | "80+ Gold" | "80+ Platinum"; branded: boolean };
export type CaseSpecs = {
  form_factors: FormFactor[];
  glass: boolean;
  max_gpu_mm: number;
  max_cooler_mm: number;
  radiators_mm: number[];
};
export type CoolerSpecs = { type: "air" | "aio"; tdp_w: number; sockets: string[]; height_mm?: number; radiator_mm?: number };

export type SpecsByKind = {
  cpu: CpuSpecs;
  motherboard: BoardSpecs;
  ram: RamSpecs;
  gpu: GpuSpecs;
  storage: StorageSpecs;
  psu: PsuSpecs;
  case: CaseSpecs;
  cooler: CoolerSpecs;
};

export type Part<K extends PartKind = PartKind> = {
  id: number;
  kind: K;
  name: string;
  brand: string | null;
  specs: SpecsByKind[K];
  image?: string | null;
  /** Доставна цена с ДДС — само в админа и билдъра */
  cost_cents?: number;
  /** Срок на доставчика в работни дни */
  lead_days?: number;
};

export type AnyPart = { [K in PartKind]: Part<K> }[PartKind];
export type Build = { [K in PartKind]?: Part<K> | null };

/** Подрежда части по вид — удобно за билдъра и конфигуратора */
export function byKind(parts: AnyPart[]) {
  const out = Object.fromEntries(partKinds.map((k) => [k, [] as AnyPart[]])) as { [K in PartKind]: Part<K>[] };
  for (const p of parts) (out[p.kind] as AnyPart[]).push(p);
  return out;
}

// Политиката на билдъра — данни, не код. Билдърът, портата и конфигураторът четат едно и също.
// Цените и надценките НЕ са тук (хранилището е публично) — те са в базата, в „Билдър → Ценообразуване“.

export type LineId = "office" | "basic" | "izbor" | "premium";

export type LinePolicy = {
  id: LineId;
  name: string;
  /** Рафт: минимум / цел / максимум машини */
  shelf: { min: number; target: number; max: number };
  /** Ценова лента с ДДС, в евроцента */
  price: { min_cents: number; max_cents: number | null };
  standard: {
    gpu: "none" | "required";
    gpu_current_gen?: boolean;
    cpu_min_class?: number;
    ram_min_gb: number;
    ram_type?: "DDR5";
    ram_min_mhz?: number;
    storage_min_gb: number;
    storage_nvme?: boolean;
    psu_min_w: number;
    psu_gold?: boolean;
    psu_branded?: boolean;
    board_tiers?: ("A" | "H" | "B" | "Z" | "X")[];
    /** Отделен охладител: always / aio / when_tdp_over (кутиен е достатъчен под прага) */
    cooler: "always" | "aio" | { boxed_below_tdp_w: number };
    cooler_min_tdp_w?: number;
    glass_case?: boolean;
  };
  /** Дял на видеокартата и процесора от цената на частите */
  shares?: { gpu: [number, number]; cpu: [number, number] };
};

export const lines: LinePolicy[] = [
  {
    id: "office",
    name: "GSOL Office",
    shelf: { min: 30, target: 90, max: 120 },
    price: { min_cents: 0, max_cents: 110000 },
    standard: {
      gpu: "none",
      ram_min_gb: 16,
      storage_min_gb: 500,
      psu_min_w: 400,
      cooler: { boxed_below_tdp_w: 80 },
    },
  },
  {
    id: "basic",
    name: "GSOL Basic Gaming",
    shelf: { min: 100, target: 180, max: 230 },
    price: { min_cents: 0, max_cents: 146000 },
    standard: {
      gpu: "required",
      gpu_current_gen: true,
      ram_min_gb: 16,
      storage_min_gb: 500,
      psu_min_w: 500,
      cooler: "always",
      glass_case: true,
    },
    shares: { gpu: [0.3, 0.45], cpu: [0.11, 0.19] },
  },
  {
    id: "izbor",
    name: "GSOL Избор",
    shelf: { min: 120, target: 220, max: 280 },
    price: { min_cents: 100000, max_cents: 270000 },
    standard: {
      gpu: "required",
      cpu_min_class: 5,
      ram_min_gb: 16,
      ram_min_mhz: 3200,
      storage_min_gb: 1000,
      storage_nvme: true,
      psu_min_w: 750,
      psu_branded: true,
      board_tiers: ["B", "Z", "X"],
      cooler: "always",
      cooler_min_tdp_w: 150,
      glass_case: true,
    },
    shares: { gpu: [0.3, 0.45], cpu: [0.11, 0.19] },
  },
  {
    id: "premium",
    name: "GSOL Премиум",
    shelf: { min: 50, target: 110, max: 130 },
    price: { min_cents: 230000, max_cents: null },
    standard: {
      gpu: "required",
      cpu_min_class: 7,
      ram_min_gb: 32,
      ram_type: "DDR5",
      storage_min_gb: 1000,
      storage_nvme: true,
      psu_min_w: 750,
      psu_gold: true,
      psu_branded: true,
      board_tiers: ["Z", "X"],
      cooler: "aio",
      glass_case: true,
    },
    shares: { gpu: [0.3, 0.45], cpu: [0.11, 0.19] },
  },
];

export const lineById = Object.fromEntries(lines.map((l) => [l.id, l])) as Record<LineId, LinePolicy>;

export const builderPolicy = {
  power: {
    /** Дъно, памет, дискове и вентилатори */
    base_w: 75,
    /** Запас над изчислената консумация */
    headroom: 1.4,
  },
  balance: {
    /** Видеокарта от този клас нагоре иска поне такъв процесор */
    min_cpu_class: [
      { gpu_tier: 8, cpu_class: 7 },
      { gpu_tier: 6, cpu_class: 5 },
    ],
    /** При карта от клас 6+ процесорът не може да е с повече от толкова години по-стар */
    max_cpu_age_years: { gpu_tier: 6, years: 3 },
  },
  diversity: {
    /** Най-много кутии около една сърцевина (процесор + карта + памет + диск) */
    cases_per_core: 5,
    /** Една част — най-много този дял от рафта на линията */
    max_part_share: 0.3,
    /** От колко от най-евтините годни части се избира най-малко използваната */
    cheapest_pool: 4,
  },
  gate: {
    /** Целият прогон се отказва при рафт под този дял от вчерашния */
    min_shelf_vs_yesterday: 0.6,
    /** …или при повече от толкова свалени машини */
    max_quarantine_share: 0.1,
  },
  lifecycle: {
    /** Машина без зареждане толкова дни се изтрива (ако не е поръчвана) */
    delete_after_days: 21,
    /** Срок на машината = най-бавната част + толкова дни */
    extra_lead_days: 2,
  },
} as const;

export type BuilderPolicy = typeof builderPolicy;

// Типове и търсене за списъците на Еконт — ползват се и в браузъра (избор на град и офис).

export type EcontCity = { id: number; name: string; region: string; postCode: string; offices: number };
export type EcontOffice = { code: string; name: string; cityId: number; address: string };
export type EcontDirectory = { cities: EcontCity[]; offices: EcontOffice[] };

/** Без главни букви и без „гр.“/„с.“ отпред — „гр. Кърджали“ и „кърджали“ са едно и също */
export function normalizeQuery(q: string) {
  return q
    .trim()
    .toLocaleLowerCase("bg")
    .replace(/^(гр|с|кв)\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Градовете по търсене: първо тези, чието име започва с търсеното, после останалите съвпадения.
 * При равенство — повече офиси (по-голям град) напред.
 */
export function searchCities(cities: EcontCity[], query: string, limit = 30) {
  const q = normalizeQuery(query);
  if (!q) return [...cities].sort((a, b) => b.offices - a.offices).slice(0, limit);
  const scored: { c: EcontCity; rank: number }[] = [];
  for (const c of cities) {
    const name = c.name.toLocaleLowerCase("bg");
    const rank = name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : c.postCode.startsWith(q) ? 3 : -1;
    if (rank >= 0) scored.push({ c, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank || b.c.offices - a.c.offices || a.c.name.localeCompare(b.c.name, "bg"))
    .slice(0, limit)
    .map((s) => s.c);
}

/** Офисите в града — по търсене в името и адреса */
export function searchOffices(offices: EcontOffice[], cityId: number | null, query: string) {
  const q = normalizeQuery(query);
  return offices
    .filter((o) => cityId === null || o.cityId === cityId)
    .filter((o) => !q || `${o.name} ${o.address}`.toLocaleLowerCase("bg").includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, "bg"));
}

/** „бул. Цар Борис III“ → „цар борис iii“: без вида отпред и без тирета — за търсене по самото име */
export function streetKey(s: string) {
  return s
    .trim()
    .toLocaleLowerCase("bg")
    .replace(/^(ул|бул|пл|кв|ж\.\s?к|жк|м-ст|в\.\s?з|пр)(\.\s*|\s+)/, "")
    .replace(/[-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Улици или квартали по търсене: точно име, после начало, после начало на дума, после съвпадение */
export function searchNames(names: string[], query: string, limit = 50) {
  const q = streetKey(query);
  if (!q) return names.slice(0, limit);
  const scored: { name: string; rank: number }[] = [];
  for (const name of names) {
    const key = streetKey(name);
    const rank =
      key === q ? 0 : key.startsWith(q) ? 1 : key.split(" ").some((w) => w.startsWith(q)) ? 2 : key.includes(q) ? 3 : -1;
    if (rank >= 0) scored.push({ name, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "bg"))
    .slice(0, limit)
    .map((s) => s.name);
}

// ---------------------------------------------------------------- настройки и пратки (за админа)

export type EcontSettings = {
  env: "demo" | "live";
  senderOfficeCode: string;
  senderAgent: string;
  autoLabel: boolean;
  declaredValue: boolean;
};

export function parseEcontSettings(value: unknown): EcontSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    env: v.env === "live" ? "live" : "demo",
    senderOfficeCode: typeof v.sender_office_code === "string" ? v.sender_office_code : "",
    senderAgent: typeof v.sender_agent === "string" ? v.sender_agent : "",
    autoLabel: v.auto_label !== false,
    declaredValue: v.declared_value !== false,
  };
}

/** Какво връща econt_overview — без паролата */
export type EcontOverview = {
  username: string | null;
  has_password: boolean;
  cities: number;
  offices: number;
  synced_at: string | null;
  sync_error: string | null;
  sync_pending: boolean;
  test_ok: boolean | null;
  test_message: string | null;
  tested_at: string | null;
  test_pending: boolean;
  ticked_at: string | null;
  worker: boolean;
};

export const shipmentStateLabels: Record<string, string> = {
  queued: "Чака създаване",
  sending: "Създава се…",
  created: "Създадена",
  failed: "Неуспешна",
  cancelling: "Анулира се…",
  cancelled: "Анулирана",
};

export const econtEnvLabels = { demo: "Тестова среда (демо)", live: "Реална среда (договорът на GSOL)" } as const;

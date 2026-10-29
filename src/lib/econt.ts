import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicClient } from "@/lib/supabase/clients";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { EcontDirectory } from "./econt-shared";

// Еконт откъм сайта: списъците с градове и офиси (обновяват се всяка нощ в базата) и будене на
// работника (Edge Function „econt“), който говори с Еконт. Цените и товарителниците решава базата.

export async function getEcontDirectory(): Promise<EcontDirectory> {
  "use cache";
  cacheLife("days");
  cacheTag("econt");
  const db = publicClient();
  const [cities, offices] = await Promise.all([
    fetchAll((a, b) => db.from("econt_cities").select("id, name, post_code, region, offices").order("id").range(a, b)),
    fetchAll((a, b) => db.from("econt_offices").select("code, name, city_id, address").order("code").range(a, b)),
  ]);
  return {
    cities: cities.map((c) => ({ id: c.id, name: c.name, region: c.region, postCode: c.post_code, offices: c.offices })),
    offices: offices.map((o) => ({ code: o.code, name: o.name, cityId: o.city_id, address: o.address })),
  };
}

// Справочниците на Еконт за улици и квартали и проверката на адрес са публични (без потребител),
// затова сайтът ги пита направо — работникът е само за цени и товарителници.
const econtPublicApi = "https://ee.econt.com/services/";

async function econtPublic(path: string, body: unknown, timeoutMs: number) {
  const res = await fetch(econtPublicApi + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // HTML при грешка в шлюза
  }
  return { status: res.status, json };
}

/** Съобщенията на Еконт са вложени (innerErrors) — взимаме непразните */
function econtMessage(body: unknown): string {
  const out: string[] = [];
  const walk = (e: unknown) => {
    if (!e || typeof e !== "object") return;
    const { message, innerErrors } = e as { message?: string; innerErrors?: unknown[] };
    const m = (message ?? "").trim().replace(/:$/, "");
    if (m) out.push(m);
    for (const i of innerErrors ?? []) walk(i);
  };
  walk(body);
  return out.join(" ");
}

export type EcontAddressBook = { streets: string[]; quarters: string[] };

/** Улиците и кварталите на населено място. При грешка хвърля — да не се кешира празен списък за дни. */
export async function getEcontAddressBook(cityId: number): Promise<EcontAddressBook> {
  "use cache";
  cacheLife("days");
  cacheTag("econt");
  const [streets, quarters] = await Promise.all([
    econtPublic("Nomenclatures/NomenclaturesService.getStreets.json", { cityID: cityId }, 10000),
    econtPublic("Nomenclatures/NomenclaturesService.getQuarters.json", { cityID: cityId }, 10000),
  ]);
  if (streets.status !== 200 || quarters.status !== 200) throw new Error("Еконт не върна улиците и кварталите.");
  const names = (list: { name?: string }[] | undefined) =>
    [...new Set((list ?? []).map((x) => (x.name ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "bg"));
  return {
    streets: names((streets.json as { streets?: { name?: string }[] }).streets),
    quarters: names((quarters.json as { quarters?: { name?: string }[] }).quarters),
  };
}

export type EcontAddressParts = { street?: string; num?: string; quarter?: string; other?: string };

/**
 * Пита Еконт дали знае адреса: ok, или съобщението му защо не; null — Еконт не отговори (тогава
 * поръчката минава, а товарителницата показва грешката, ако има). Нормализирания адрес на Еконт не
 * ползваме за показване — той смесва английски съкращения („fl.“, „apt.“).
 */
export async function checkEcontAddress(
  city: { name: string; postCode: string },
  parts: EcontAddressParts,
): Promise<{ ok: true } | { ok: false; message: string } | null> {
  try {
    const { status, json } = await econtPublic(
      "Nomenclatures/AddressService.validateAddress.json",
      { address: { city: { country: { code3: "BGR" }, name: city.name, postCode: city.postCode }, ...parts } },
      6000,
    );
    if (status === 200) return { ok: true };
    // 517 е отговорът на Еконт за невалидни данни; друга грешка е техническа — не спираме поръчката
    const message = status === 517 || status === 400 ? econtMessage(json) : "";
    return message ? { ok: false, message } : null;
  } catch {
    return null;
  }
}

type WorkerBody =
  | { action: "tick" }
  | { action: "price"; items: { product_id: number; qty: number }[]; code: string | null; shipping: Record<string, unknown> };

/**
 * Буди работника. Функцията изисква JWT, затова изпращаме публичния anon ключ (същият е и в браузъра).
 * Грешка тук никога не спира поръчка — базата има резервна цена, а будилникът опитва отново до 5 минути.
 */
export async function econtWorker<T = unknown>(body: WorkerBody, timeoutMs = 8000): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/functions/v1/econt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

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

// Еконт работник: единственото място, което говори с API-то на Еконт по HTTPS
// (клиентът на базата не се разбира с TLS-а им, затова базата не вика Еконт директно).
//
// Работникът не решава нищо сам: базата казва какво да изпрати (функциите econt_worker_*,
// достъпни само със секретния ключ, който Supabase дава на функцията), той го изпраща и
// връща отговора обратно в базата. Затова няма какво да се злоупотреби отвън:
//   price — цена за количка (базата я изчислява, кешира и ограничава броя заявки);
//   tick  — изпълнява чакащото: товарителници, анулиране, статуси, проверка на достъпа,
//           обновяване на градовете и офисите.

import { createClient } from "npm:@supabase/supabase-js@2";

const hosts = {
  live: "https://ee.econt.com/services/",
  demo: "https://demo.econt.com/ee/services/",
} as const;
type Env = keyof typeof hosts;

// Публичните демо данни от документацията на Еконт (ee.econt.com/services) — само за тестовата среда
const demoAuth = "Basic " + btoa("iasp-dev:1Asp-dev");

const secretKey =
  (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>).default ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Access = { env: Env; username: string | null; password: string | null };

function basic(user: string, pass: string) {
  const bytes = new TextEncoder().encode(`${user}:${pass}`);
  return "Basic " + btoa(String.fromCharCode(...bytes));
}

async function access(): Promise<{ env: Env; auth: string | null }> {
  const { data, error } = await db.rpc("econt_worker_access");
  if (error) throw new Error(error.message);
  const a = data as Access;
  if (a.env === "demo") return { env: "demo", auth: demoAuth };
  return { env: "live", auth: a.username && a.password ? basic(a.username, a.password) : null };
}

/** Съобщенията на Еконт са вложени (innerErrors) — събираме непразните */
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
  return out.join(": ") || "Еконт върна грешка.";
}

async function call(env: Env, auth: string | null, path: string, body: unknown, timeoutMs = 15000) {
  const res = await fetch(hosts[env] + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // HTML при грешка в шлюза
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error("Еконт отказа достъпа — проверете потребителя и паролата.");
    throw new Error(json ? econtMessage(json) : `Еконт отговори с ${res.status}.`);
  }
  return json as Record<string, unknown>;
}

const failure = (e: unknown) =>
  e instanceof Error ? (e.name === "TimeoutError" ? "Еконт не отговори навреме." : e.message) : String(e);

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------- цена
async function price(input: { items?: unknown; code?: unknown; shipping?: unknown }) {
  const job = (await rpc("econt_worker_price", {
    p_items: input.items ?? [],
    p_code: typeof input.code === "string" ? input.code : null,
    p_shipping: input.shipping ?? {},
  })) as { key?: string; request?: unknown; cents?: number; skip?: string };
  if (!job.key || !job.request) return { cents: job.cents ?? null, skip: job.skip ?? null };

  const { env, auth } = await access();
  try {
    const res = await call(env, auth, "Shipments/LabelService.createLabel.json", job.request, 6000);
    const label = res.label as { totalPrice?: number; currency?: string } | undefined;
    if (typeof label?.totalPrice !== "number" || label.currency !== "EUR") throw new Error("Еконт не върна цена в евро.");
    const cents = Math.round(label.totalPrice * 100);
    await rpc("econt_worker_price_store", { p_key: job.key, p_cents: cents, p_error: null });
    return { cents };
  } catch (e) {
    await rpc("econt_worker_price_store", { p_key: job.key, p_cents: null, p_error: failure(e) });
    return { cents: null, error: failure(e) };
  }
}

// ---------------------------------------------------------------- чакащите задачи
type Claim = {
  labels: { shipment_id: number; request: unknown }[];
  cancels: { shipment_id: number; number: string }[];
  statuses: string[];
  test: boolean;
  sync: boolean;
};

async function tick() {
  const claim = (await rpc("econt_worker_claim", {})) as Claim;
  const done = { labels: 0, cancels: 0, statuses: 0, test: false, sync: false, errors: [] as string[] };
  const busy = claim.labels.length || claim.cancels.length || claim.statuses.length || claim.test || claim.sync;
  if (!busy) return done;

  const { env, auth } = await access();
  const needsAuth = claim.labels.length || claim.cancels.length || claim.statuses.length || claim.test;
  if (needsAuth && !auth) {
    const msg = "Няма въведен потребител и парола за Еконт (Настройки → Еконт).";
    for (const l of claim.labels) await rpc("econt_worker_label_done", { p_shipment_id: l.shipment_id, p_label: null, p_error: msg });
    for (const c of claim.cancels) await rpc("econt_worker_cancel_done", { p_shipment_id: c.shipment_id, p_error: msg });
    if (claim.test) await rpc("econt_worker_test_done", { p_ok: false, p_message: msg });
    done.errors.push(msg);
  } else {
    for (const l of claim.labels) {
      try {
        const res = await call(env, auth, "Shipments/LabelService.createLabel.json", l.request);
        await rpc("econt_worker_label_done", { p_shipment_id: l.shipment_id, p_label: res.label ?? null, p_error: null });
        done.labels++;
      } catch (e) {
        await rpc("econt_worker_label_done", { p_shipment_id: l.shipment_id, p_label: null, p_error: failure(e) });
        done.errors.push(failure(e));
      }
    }

    for (const c of claim.cancels) {
      try {
        const res = await call(env, auth, "Shipments/LabelService.deleteLabels.json", { shipmentNumbers: [c.number] });
        const result = (res.results as { error?: unknown }[] | undefined)?.[0];
        await rpc("econt_worker_cancel_done", {
          p_shipment_id: c.shipment_id,
          p_error: result?.error ? econtMessage(result.error) : null,
        });
        done.cancels++;
      } catch (e) {
        await rpc("econt_worker_cancel_done", { p_shipment_id: c.shipment_id, p_error: failure(e) });
        done.errors.push(failure(e));
      }
    }

    if (claim.statuses.length) {
      try {
        const res = await call(env, auth, "Shipments/ShipmentService.getShipmentStatuses.json", {
          shipmentNumbers: claim.statuses,
        });
        const statuses = ((res.shipmentStatuses as { status?: unknown }[] | undefined) ?? [])
          .map((s) => s.status)
          .filter(Boolean);
        await rpc("econt_worker_status_done", { p_statuses: statuses });
        done.statuses = statuses.length;
      } catch (e) {
        done.errors.push(failure(e));
      }
    }

    if (claim.test) {
      try {
        const res = await call(env, auth, "Profile/ProfileService.getClientProfiles.json", {});
        const client = (res.profiles as { client?: { name?: string; clientNumber?: string } }[] | undefined)?.[0]?.client;
        await rpc("econt_worker_test_done", {
          p_ok: true,
          p_message: client?.name ? `${client.name}${client.clientNumber ? ` (${client.clientNumber.trim()})` : ""}` : "Достъпът работи.",
        });
        done.test = true;
      } catch (e) {
        await rpc("econt_worker_test_done", { p_ok: false, p_message: failure(e) });
      }
    }
  }

  // Градовете и офисите са публични — теглим ги от реалната среда, без потребител
  if (claim.sync) {
    try {
      const [cities, offices] = await Promise.all([
        call("live", null, "Nomenclatures/NomenclaturesService.getCities.json", { countryCode: "BGR" }, 30000),
        call("live", null, "Nomenclatures/NomenclaturesService.getOffices.json", { countryCode: "BGR" }, 30000),
      ]);
      type City = { id: number; name: string; postCode?: string; regionName?: string };
      type Office = {
        code: string;
        name: string;
        isAPS?: boolean;
        address?: { fullAddress?: string; city?: { id: number; name: string; postCode?: string } };
      };
      const slimCities = ((cities.cities as City[]) ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        post_code: c.postCode ?? "",
        region: c.regionName ?? "",
      }));
      // Еконтоматите (APS) не приемат големи пратки като компютрите — не ги предлагаме
      const slimOffices = ((offices.offices as Office[]) ?? [])
        .filter((o) => !o.isAPS && o.address?.city?.id)
        .map((o) => ({
          code: o.code,
          name: o.name,
          city_id: o.address!.city!.id,
          city_name: o.address!.city!.name,
          post_code: o.address!.city!.postCode ?? "",
          address: (o.address!.fullAddress ?? "").trim(),
        }));
      await rpc("econt_worker_sync_done", { p_cities: slimCities, p_offices: slimOffices, p_error: null });
      done.sync = true;
    } catch (e) {
      await rpc("econt_worker_sync_done", { p_cities: null, p_offices: null, p_error: failure(e) });
      done.errors.push(failure(e));
    }
  }

  return done;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: { action?: string; items?: unknown; code?: unknown; shipping?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  try {
    if (body.action === "price") return Response.json(await price(body));
    if (body.action === "tick") return Response.json(await tick());
    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: failure(e) }, { status: 500 });
  }
});

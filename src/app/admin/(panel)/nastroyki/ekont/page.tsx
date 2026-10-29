import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert } from "lucide-react";
import { AdminHeader, Panel, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { getEcontDirectory } from "@/lib/econt";
import { econtEnvLabels, parseEcontSettings, type EcontOverview } from "@/lib/econt-shared";
import AdminLoading from "@/app/admin/(panel)/loading";
import { AccessForm, SendingForm, StatusActions, WeightsForm } from "./forms";

export const metadata = { title: "Еконт" };

export default function EcontPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EcontContent />
    </Suspense>
  );
}

async function EcontContent() {
  const { db } = await requireStaff(["admin"]);
  const [{ data: overviewRaw }, { data: row }, { data: categories }, { data: counts }, directory] = await Promise.all([
    db.rpc("econt_overview"),
    db.from("settings").select("value").eq("key", "econt").maybeSingle(),
    db.from("categories").select("id, name, parent_id, weight_kg, sort_order").order("sort_order"),
    db.rpc("catalog_menu"),
    getEcontDirectory(),
  ]);
  const overview = overviewRaw as EcontOverview | null;
  const settings = parseEcontSettings(row?.value);

  // Офисите по градове — Кърджали най-отгоре, останалите по азбучен ред
  const cityNames = new Map(directory.cities.map((c) => [c.id, c.name]));
  const byCity = new Map<string, { code: string; label: string }[]>();
  for (const o of directory.offices) {
    const city = cityNames.get(o.cityId) ?? "—";
    byCity.set(city, [...(byCity.get(city) ?? []), { code: o.code, label: `${o.name} — ${o.address}` }]);
  }
  const offices = [...byCity.entries()]
    .sort(([a], [b]) => (a === "Кърджали" ? -1 : b === "Кърджали" ? 1 : a.localeCompare(b, "bg")))
    .map(([city, items]) => ({ city, items: items.sort((a, b) => a.label.localeCompare(b.label, "bg")) }));
  const sender = directory.offices.find((o) => o.code === settings.senderOfficeCode);

  const productsIn = new Map<number, number>();
  for (const c of counts ?? []) productsIn.set(c.category_id, (productsIn.get(c.category_id) ?? 0) + c.products);
  const weight = (w: number | null) => (w === null ? null : Number(w));
  const groups = (categories ?? [])
    .filter((c) => c.parent_id === null)
    .map((g) => ({
      id: g.id,
      name: g.name,
      weight: weight(g.weight_kg),
      children: (categories ?? [])
        .filter((c) => c.parent_id === g.id)
        .map((c) => ({ id: c.id, name: c.name, weight: weight(c.weight_kg), products: productsIn.get(c.id) ?? 0 })),
    }));

  // Какво липсва за реалната среда
  const missing = [
    !overview?.has_password && "потребител и парола от e-econt",
    !settings.senderOfficeCode && "офис за изпращане",
    settings.senderAgent.trim().length < 3 && "упълномощено лице",
  ].filter(Boolean) as string[];

  return (
    <>
      <Link href="/admin/nastroyki" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Настройки
      </Link>
      <AdminHeader title="Еконт" subtitle="Жива цена на доставката, товарителници и статус на пратките" />

      {settings.env === "live" && missing.length > 0 && (
        <p className="mb-6 bg-danger/10 px-4 py-3 text-[14px] text-text ring-1 ring-danger/30">
          Реалната среда не е готова — липсва: {missing.join(", ")}. Дотогава доставката се смята по резервните цени от
          „Настройки“, а товарителници не се създават.
        </p>
      )}
      {settings.env === "demo" && (
        <p className="mb-6 bg-accent/10 px-4 py-3 text-[14px] text-text ring-1 ring-accent/30">
          Работи тестовата среда на Еконт: цените са по общата тарифа, а товарителниците са пробни. Когато въведете
          достъпа, офиса и упълномощеното лице, превключете на „{econtEnvLabels.live}“.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Състояние">
            <dl className="space-y-2.5 text-[14px]">
              <Line label="Среда" value={econtEnvLabels[settings.env]} />
              <Line label="Изпращане от" value={sender ? `${sender.name} — ${sender.address}` : "не е избран офис"} />
              <Line
                label="Достъп"
                value={
                  overview?.has_password
                    ? `${overview.username ?? "—"}`
                    : settings.env === "demo"
                      ? "демо достъпът на Еконт"
                      : "не е въведен"
                }
              />
              {overview?.tested_at && (
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-muted">Проверка</dt>
                  <dd className={`flex items-start gap-1.5 text-right ${overview.test_ok ? "text-ok" : "text-danger"}`}>
                    {overview.test_ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> : <CircleAlert className="mt-0.5 h-4 w-4 flex-none" />}
                    <span>
                      {settings.env === "demo" && overview.test_ok ? `Демо профилът на Еконт работи (${overview.test_message})` : overview.test_message}
                      <span className="block text-[12px] text-dim">{formatDate(overview.tested_at)}</span>
                    </span>
                  </dd>
                </div>
              )}
              {overview?.test_pending && <Line label="Проверка" value="предстои…" />}
              <Line
                label="Списъци"
                value={`${overview?.cities ?? 0} места, ${overview?.offices ?? 0} офиса${
                  overview?.synced_at ? ` · обновени ${formatDate(overview.synced_at)}` : ""
                }${overview?.sync_pending ? " · обновяване до 5 мин." : ""}`}
              />
              {overview?.sync_error && <Line label="Грешка при обновяване" value={overview.sync_error} tone="danger" />}
              <Line label="Работник" value={overview?.ticked_at ? `последна връзка ${formatDate(overview.ticked_at)}` : "още не е работил"} />
            </dl>
            <StatusActions canTest={settings.env === "demo" || Boolean(overview?.has_password)} />
          </Panel>

          <AccessForm username={overview?.username ?? null} hasPassword={Boolean(overview?.has_password)} />
          <SendingForm settings={settings} offices={offices} />
        </div>

        <WeightsForm groups={groups} />
      </div>
    </>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right ${tone === "danger" ? "text-danger" : "text-white"}`}>{value}</dd>
    </div>
  );
}

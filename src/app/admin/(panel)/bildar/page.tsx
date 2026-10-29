import Link from "next/link";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { AdminHeader, Panel, Stat, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { partKinds, partLabels } from "@/lib/builder/parts";
import { lines } from "@/lib/builder/policy";
import { validatePricing } from "@/lib/builder/pricing";
import { PricingForm, RunPanel } from "./forms";
import type { RunSummary } from "./actions";

export const metadata = { title: "Билдър" };

export default async function BuilderPage() {
  const { db, staff } = await requireStaff(["admin", "manager"]);
  const [{ data: parts }, { data: machines }, { data: runs }, { data: pricingRow }] = await Promise.all([
    db.from("components").select("kind, in_stock, is_sample").eq("is_active", true),
    db.from("products").select("tier, is_active, stock_status").eq("source", "builder"),
    db.from("builder_runs").select("id, mode, ok, summary, created_at").order("created_at", { ascending: false }).limit(5),
    db.from("settings").select("value").eq("key", "builder_pricing").maybeSingle(),
  ]);
  const pricing = validatePricing(pricingRow?.value);
  const inStock = (parts ?? []).filter((p) => p.in_stock);
  const samples = (parts ?? []).filter((p) => p.is_sample).length;
  const active = (machines ?? []).filter((m) => m.is_active);

  return (
    <>
      <AdminHeader
        title="Билдър"
        subtitle="Сглобява машините от наличните части по стандарта на всяка линия, проверява съвместимостта и слага цена"
        actions={
          <>
            <Link href="/admin/bildar/chasti" className="btn btn-sm btn-ghost">
              Части
            </Link>
            <Link href="/konfigurator" target="_blank" className="btn btn-sm btn-ghost">
              <ExternalLink className="h-4 w-4" /> Конфигуратор
            </Link>
          </>
        }
      />

      {samples > 0 && (
        <p className="mb-6 flex items-start gap-3 bg-accent/10 px-4 py-3 text-[14px] text-text ring-1 ring-accent/30">
          <TriangleAlert className="mt-0.5 h-5 w-5 flex-none text-accent-ink" />
          <span>
            {samples} от частите са <b className="font-medium text-white">примерни</b>: моделите са истински, но доставните цени
            са приблизителни. Заменят се автоматично, когато се свърже вносът от доставчиците (Vali, MOST).
          </span>
        </p>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {lines.map((l) => {
          const count = active.filter((m) => m.tier === l.id).length;
          return (
            <Stat
              key={l.id}
              label={l.name}
              value={String(count)}
              hint={`на рафта · мин. ${l.shelf.min} · цел ${l.shelf.target}`}
              href={`/katalog/kompyutri?sub=gsol-${l.id}`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Прогон">
            {!pricing && (
              <p className="mb-4 text-[14px] text-danger">Попълнете ценообразуването, преди да пуснете билдъра.</p>
            )}
            <RunPanel canRun={Boolean(pricing) && inStock.length > 0} />
          </Panel>

          <Panel title="Последни прогони">
            {runs?.length ? (
              <ul className="divide-y divide-line-soft text-[14px]">
                {runs.map((r) => {
                  const s = r.summary as unknown as RunSummary;
                  return (
                    <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-3 py-2.5">
                      <span className="text-muted">
                        {formatDate(r.created_at)} · {r.mode === "publish" ? "публикуване" : "проба"}
                      </span>
                      <span className={r.ok ? "text-ok" : "text-danger"}>
                        {r.ok ? `${s.lines?.reduce((n, l) => n + l.count, 0) ?? 0} машини` : "спрян от портата"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">Още няма прогони.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Налични части">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[14px]">
              {partKinds.map((k) => (
                <li key={k} className="flex justify-between gap-3">
                  <Link href={`/admin/bildar/chasti?vid=${k}`} className="text-muted hover:text-white">
                    {partLabels[k]}
                  </Link>
                  <span className="text-white">{inStock.filter((p) => p.kind === k).length}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Правила (от политиката)">
            <ul className="space-y-2 text-[13px] text-muted">
              <li>Най-много 5 кутии около една сърцевина (процесор + карта + памет + диск).</li>
              <li>Една част — най-много 30% от рафта на линията; избира се най-малко използваната от най-евтините годни.</li>
              <li>Видеокарта 30–45% и процесор 11–19% от цената на частите при гейминг линиите.</li>
              <li>Ремонт: една свършила част получава съвместим заместник, адресът остава; две — машината отива в чернова.</li>
              <li>Поръчвана машина никога не изчезва — минава в „проверете наличност“. Чернова над 21 дни се изтрива.</li>
              <li>Портата отказва целия прогон при празен каталог, рафт под 60% от вчерашния, линия под минимума или над 10% свалени.</li>
            </ul>
          </Panel>

          {staff.role === "admin" ? (
            <Panel title="Ценообразуване">
              <p className="mb-4 text-[13px] text-muted">
                Цена = частите по доставна цена + разходите + надценката и добавката на линията + труда, после такса за
                плащане и закръгляне на …9. Вижда се само тук — в сайта излиза само крайната цена.
              </p>
              <PricingForm params={pricing} lines={lines} />
            </Panel>
          ) : (
            <Panel title="Ценообразуване">
              <p className="text-[14px] text-muted">Само администратор променя надценките.</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

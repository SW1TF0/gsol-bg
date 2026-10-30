"use client";

import { useActionState } from "react";
import { Check, Cpu, FlaskConical, Rocket, TriangleAlert } from "lucide-react";
import { keepValues } from "@/lib/forms";
import { formatPrice } from "@/lib/format";
import type { PricingParams } from "@/lib/builder/pricing";
import type { LinePolicy } from "@/lib/builder/policy";
import { runBuilderAction, savePricing, type FormState, type RunState } from "./actions";

export function RunPanel({ canRun }: { canRun: boolean }) {
  const [state, action, pending] = useActionState<RunState, FormData>(runBuilderAction, null);
  const s = state?.summary;
  return (
    <div className="space-y-5">
      <form method="post" onSubmit={keepValues(action)} className="flex flex-wrap items-center gap-3">
        <button type="submit" name="mode" value="dry" className="btn btn-sm btn-ghost" disabled={pending || !canRun}>
          <FlaskConical className="h-4 w-4" /> {pending ? "Строя…" : "Пробен прогон"}
        </button>
        <button type="submit" name="mode" value="publish" className="btn btn-sm btn-primary" disabled={pending || !canRun}>
          <Rocket className="h-4 w-4" /> Строй и публикувай
        </button>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" name="confirm" className="h-4 w-4 accent-accent" />
          Потвърждавам публикуването в магазина
        </label>
      </form>
      <p className="text-[13px] text-muted">
        Пробният прогон само показва какво би се построило — магазинът не се пипа. Публикуването става само ако
        портата пусне прогона.
      </p>

      {state?.error && (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      )}

      {s && (
        <div className="space-y-4" role="status">
          <div className={`flex items-start gap-3 p-4 text-[14px] ring-1 ${s.ok ? "bg-ok/10 ring-ok/30" : "bg-danger/10 ring-danger/30"}`}>
            {s.ok ? <Check className="mt-0.5 h-5 w-5 flex-none text-ok" /> : <TriangleAlert className="mt-0.5 h-5 w-5 flex-none text-danger" />}
            <div>
              <div className="text-white">
                {s.ok
                  ? s.mode === "publish"
                    ? "Портата пусна прогона — рафтът е публикуван."
                    : "Портата би пуснала прогона."
                  : "Портата спря прогона — магазинът остава на вчерашния рафт."}
              </div>
              {s.reasons.map((r) => (
                <div key={r} className="text-muted">
                  {r}
                </div>
              ))}
              {s.applied && (
                <div className="mt-1 text-muted">
                  Нови {s.applied.created} · обновени {s.applied.kept} · „проверете наличност“ {s.applied.onRequest} · в чернова{" "}
                  {s.applied.drafts} · изтрити {s.applied.deleted}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {s.lines.map((l) => (
              <div key={l.line} className="bg-bg-deep p-4 text-[14px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display uppercase tracking-wide text-white">{l.name}</span>
                  <span className={l.count >= l.min ? "text-ok" : "text-danger"}>
                    {l.count} / цел {l.target}
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-dim">
                  мин. {l.min} · {l.from ? `${formatPrice(l.from)} – ${formatPrice(l.to!)}` : "няма машини"}
                </div>
                <ul className="mt-2 space-y-1 text-[12px] text-muted">
                  {l.sample.map((m) => (
                    <li key={m.name} className="flex justify-between gap-3">
                      <span className="truncate">{m.name.split(" — ")[1]}</span>
                      <span className="whitespace-nowrap text-white">{formatPrice(m.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-[13px] text-muted">
            Ремонтирани {s.repaired} · свалени {s.withdrawn} · в карантина {s.quarantined.length}
            {s.samples > 0 && <> · от примерни части: {s.samples}</>}
          </div>
          {s.quarantined.length > 0 && (
            <ul className="space-y-1 text-[12px] text-muted">
              {s.quarantined.map((q) => (
                <li key={q.name}>
                  <span className="text-white">{q.name}</span> — {q.reasons.join(" ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const eur = (cents: number | undefined) => (cents ? (cents / 100).toFixed(2).replace(".", ",") : "0");

const fixedLabels: Record<string, string> = {
  assembly: "Сглобяване",
  windows: "Windows (инсталиране)",
  drivers: "Драйвери",
  bios: "BIOS",
  test: "Тест",
  packaging: "Опаковка",
};

export function PricingForm({ params, lines }: { params: PricingParams | null; lines: LinePolicy[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePricing, null);
  const num = (name: string, label: string, value: string, suffix: string) => (
    <label key={name} className="block">
      <span className="mb-1.5 block text-[12px] uppercase tracking-wide text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <input name={name} defaultValue={value} inputMode="decimal" className="input !h-9 text-[14px]" />
        <span className="text-[13px] text-dim">{suffix}</span>
      </span>
    </label>
  );
  return (
    <form method="post" onSubmit={keepValues(action)} className="space-y-5">
      <fieldset>
        <legend className="mb-2 flex items-center gap-2 text-[13px] text-white">
          <Cpu className="h-4 w-4 text-accent-ink" /> Разходи на всяка машина
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.keys(fixedLabels).map((k) => num(`fixed_${k}`, fixedLabels[k], eur(params?.fixed_costs_cents[k]), "€"))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] text-white">Надценка и добавка по линия</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {lines.map((l) => (
            <div key={l.id} className="grid grid-cols-2 gap-2">
              {num(`markup_${l.id}`, `${l.name}`, eur(params?.markup_cents[l.id]), "€")}
              {num(`addon_${l.id}`, "добавка", eur(params?.line_addon_cents[l.id]), "€")}
            </div>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-4">
        {num("labor_min", "Труд — минимум", eur(params?.labor.min_cents), "€")}
        {num("labor_pct", "Труд — % от частите", String(params?.labor.pct ?? 0), "%")}
        {num("warranty_pct", "Гаранционен резерв", String(params?.warranty_pct ?? 0), "%")}
        {num("payment_fee_pct", "Такса за плащане", String(params?.payment_fee_pct ?? 0), "%")}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {num("round_threshold", "Закръгляне: праг", String(params?.rounding.threshold_eur ?? 1999), "€")}
        {num("round_small", "стъпка до прага", String(params?.rounding.small_step_eur ?? 10), "€")}
        {num("round_large", "стъпка над прага", String(params?.rounding.large_step_eur ?? 100), "€")}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
          {pending ? "Записване…" : "Запиши"}
        </button>
        {state?.ok && (
          <span className="flex items-center gap-2 text-[14px] text-ok">
            <Check className="h-4 w-4" /> Записано — важи от следващия прогон
          </span>
        )}
        {state?.error && (
          <span role="alert" className="text-[14px] text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

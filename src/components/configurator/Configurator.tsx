"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, CircleCheck, Cpu, Loader2, RotateCcw, Send } from "lucide-react";
import { keepValues } from "@/lib/forms";
import { formatPrice } from "@/lib/format";
import { partSummary } from "@/lib/builder/fields";
import { checkBuild, classifyLine, fits, lineNames, needsCooler, needsGpu, requiredWatts } from "@/lib/builder/compatibility";
import { partKinds, partLabels, type AnyPart, type Build, type PartKind } from "@/lib/builder/parts";
import { quoteConfiguration, submitConfiguration, type ConfigQuote, type Selection, type SubmitState } from "@/app/(shop)/konfigurator/actions";

const optionalWhen: Partial<Record<PartKind, (b: Build) => boolean>> = {
  gpu: (b) => !needsGpu(b),
  cooler: (b) => !needsCooler(b),
};

export function Configurator({ parts, initial, phone, phoneHref }: { parts: AnyPart[]; initial: Selection; phone: string; phoneHref: string }) {
  const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const byKind = useMemo(() => {
    const m = new Map<PartKind, AnyPart[]>();
    for (const k of partKinds) m.set(k, parts.filter((p) => p.kind === k));
    return m;
  }, [parts]);

  const [selection, setSelection] = useState<Selection>(() =>
    Object.fromEntries(Object.entries(initial).filter(([k, id]) => byId.get(Number(id))?.kind === k)),
  );
  const [active, setActive] = useState<PartKind>(() => partKinds.find((k) => !initial[k]) ?? "cpu");
  const [quote, setQuote] = useState<ConfigQuote | null>(null);
  const [pricing, startPricing] = useTransition();

  const build = useMemo(() => {
    const b: Build = {};
    for (const k of partKinds) {
      const p = selection[k] ? byId.get(selection[k]!) : undefined;
      if (p) (b as Record<PartKind, AnyPart>)[k] = p;
    }
    return b;
  }, [selection, byId]);

  const issues = checkBuild(build);
  const conflicts = issues.filter((i) => !i.code.startsWith("MISSING_") && !["NO_GRAPHICS", "NO_COOLER"].includes(i.code));
  const missing = issues.filter((i) => i.code.startsWith("MISSING_") || ["NO_GRAPHICS", "NO_COOLER"].includes(i.code));
  const complete = issues.length === 0;
  const line = complete ? classifyLine(build) : null;

  // Цената идва от сървъра (базата) — само за пълна и съвместима конфигурация
  const key = JSON.stringify(selection);
  useEffect(() => {
    if (!complete) return;
    let cancelled = false;
    const t = setTimeout(() => {
      startPricing(async () => {
        const q = await quoteConfiguration(selection);
        if (!cancelled) setQuote(q);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // key обобщава selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, complete]);

  const choose = (part: AnyPart) => {
    setSelection((s) => ({ ...s, [part.kind]: part.id }));
    // При конфликт отиваме направо на частта, която трябва да се смени; иначе — на следващата празна стъпка
    const nextBuild = { ...build, [part.kind]: part } as Build;
    const clash = checkBuild(nextBuild)
      .filter((i) => !i.code.startsWith("MISSING_") && i.kinds.includes(part.kind))
      .flatMap((i) => i.kinds)
      .find((k) => k !== part.kind && nextBuild[k]);
    const next = clash ?? partKinds.slice(partKinds.indexOf(part.kind) + 1).find((k) => !selection[k]);
    if (next) setActive(next);
  };
  const clear = (kind: PartKind) =>
    setSelection((s) => {
      const next = { ...s };
      delete next[kind];
      return next;
    });

  const options = (byKind.get(active) ?? [])
    .map((p) => ({ part: p, problems: fits(p, build) }))
    .sort((a, b) => Number(a.problems.length > 0) - Number(b.problems.length > 0));
  const isOptional = optionalWhen[active]?.(build) ?? false;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        {/* Стъпките */}
        <ol className="mb-6 flex flex-wrap gap-2" aria-label="Стъпки">
          {partKinds.map((k, i) => {
            const chosen = Boolean(selection[k]);
            const optional = optionalWhen[k]?.(build) ?? false;
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => setActive(k)}
                  aria-current={active === k ? "step" : undefined}
                  className="chip"
                  data-active={active === k}
                >
                  {chosen ? <Check className="h-3.5 w-3.5" /> : <span className="text-[11px] opacity-70">{i + 1}</span>}
                  {partLabels[k]}
                  {!chosen && optional && <span className="text-[11px] opacity-70">· по желание</span>}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="h-display text-[22px]">{partLabels[active]}</h2>
            <p className="mt-1 text-[14px] text-muted">
              {active === "gpu" && isOptional
                ? "Процесорът има вградена графика — видеокартата е по желание."
                : active === "cooler" && isOptional
                  ? "Процесорът идва с кутиен охладител — отделният е по желание."
                  : active === "psu" && build.cpu
                    ? `За тази конфигурация са нужни поне ${requiredWatts(build)} W.`
                    : "Показваме първо частите, които пасват на вече избраното."}
            </p>
          </div>
          {selection[active] && (
            <button type="button" onClick={() => clear(active)} className="flex items-center gap-1.5 text-[13px] text-muted hover:text-white">
              <RotateCcw className="h-3.5 w-3.5" /> Без {partLabels[active].toLowerCase()}
            </button>
          )}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {options.map(({ part, problems }) => {
            const selected = selection[active] === part.id;
            return (
              <li key={part.id}>
                <button
                  type="button"
                  onClick={() => choose(part)}
                  aria-pressed={selected}
                  className={`flex h-full w-full items-start gap-3 p-4 text-left ring-1 transition ${
                    selected
                      ? "bg-accent/10 ring-accent"
                      : problems.length
                        ? "bg-surface-2 opacity-60 ring-line hover:opacity-90"
                        : "bg-surface-2 ring-line hover:ring-dim"
                  }`}
                >
                  {part.image ? (
                    <span className="relative h-14 w-14 flex-none bg-plate">
                      <Image src={part.image} alt="" fill sizes="56px" className="object-contain p-1" />
                    </span>
                  ) : (
                    <Cpu className={`mt-0.5 h-5 w-5 flex-none ${selected ? "text-accent-ink" : "text-dim"}`} strokeWidth={1.5} />
                  )}
                  <span className="min-w-0">
                    <span className="block text-[15px] text-white">{part.name}</span>
                    {part.brand && <span className="block text-[12px] uppercase tracking-wide text-dim">{part.brand}</span>}
                    <span className="mt-1 block text-[12px] text-muted">{partSummary(part.kind, part.specs as Record<string, unknown>)}</span>
                    {problems.length > 0 && (
                      <span className="mt-1.5 flex items-start gap-1.5 text-[12px] text-danger">
                        <AlertTriangle className="mt-px h-3.5 w-3.5 flex-none" /> {problems[0].message}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!options.length && <p className="text-[14px] text-muted">В момента няма налични части от този вид.</p>}
      </div>

      {/* Обобщение */}
      <aside className="h-fit space-y-4 lg:sticky lg:top-[94px]">
        <div className="cut-frame">
          <div className="cut-inner space-y-4 bg-surface-2 p-6">
            <h2 className="h-display text-[18px]">Вашата конфигурация</h2>
            <dl className="space-y-2 text-[14px]">
              {partKinds.map((k) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-dim">{partLabels[k]}</dt>
                  <dd className="min-w-0 text-right">
                    <button type="button" onClick={() => setActive(k)} className="text-left text-white hover:text-accent-ink">
                      {build[k]?.name ?? <span className="text-muted">{optionalWhen[k]?.(build) ? "по желание" : "избери"}</span>}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>

            {conflicts.length > 0 && (
              <ul className="space-y-1.5 bg-danger/10 p-3 text-[13px] text-text ring-1 ring-danger/30">
                {conflicts.map((c) => (
                  <li key={c.code} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-danger" /> {c.message}
                  </li>
                ))}
              </ul>
            )}
            {!conflicts.length && missing.length > 0 && (
              <p className="text-[13px] text-muted">
                Остава: {missing.map((m) => m.message.replace(/^Изберете /, "").replace(/\.$/, "")).join(", ")}.
              </p>
            )}

            {complete && (
              <div className="space-y-1 border-t border-line pt-4">
                <div className="flex items-center gap-2 text-[13px] text-ok">
                  <CircleCheck className="h-4 w-4" /> Съвместима конфигурация
                  {line && <span className="text-muted">· покрива стандарта {lineNames[line]}</span>}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-white">Цена с ДДС</span>
                  <span className="font-display text-[26px] text-white">
                    {pricing ? <Loader2 className="h-5 w-5 animate-spin" /> : quote?.price ? formatPrice(quote.price) : "—"}
                  </span>
                </div>
                <p className="text-[12px] text-dim">
                  Сглобяване, тест под натоварване и настройка на Windows са включени. Лицензът не е включен.
                </p>
              </div>
            )}
          </div>
        </div>

        {complete && quote?.price ? <SubmitForm selection={selection} phone={phone} phoneHref={phoneHref} /> : null}
        {line && (
          <Link href={`/katalog/kompyutri?sub=gsol-${line}`} className="flex items-center justify-between bg-surface-2 p-4 text-[14px] ring-1 ring-line hover:ring-dim">
            <span>Готови машини {lineNames[line]}</span>
            <ChevronRight className="h-4 w-4 text-dim" />
          </Link>
        )}
      </aside>
    </div>
  );
}

function SubmitForm({ selection, phone, phoneHref }: { selection: Selection; phone: string; phoneHref: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitConfiguration, null);
  if (state?.ok) {
    return (
      <div className="bg-ok/10 p-5 text-[14px] text-text ring-1 ring-ok/30">
        <CircleCheck className="mb-2 h-6 w-6 text-ok" />
        Изпратено! Ще проверим наличността на всяка част и ще ви се обадим с потвърждение и срок. Ако е спешно —{" "}
        <a href={phoneHref} className="text-white underline underline-offset-2">
          {phone}
        </a>
        .
      </div>
    );
  }
  return (
    <form method="post" onSubmit={keepValues(action)} className="space-y-3 bg-surface-2 p-5 ring-1 ring-line">
      <h3 className="font-display text-[15px] uppercase tracking-wide text-white">Поръчайте след потвърждение</h3>
      <p className="text-[13px] text-muted">GSOL проверява частите и се обажда, преди да се обвържете.</p>
      <input type="hidden" name="selection" value={JSON.stringify(selection)} />
      <div className="hidden" aria-hidden="true">
        <label>
          Сайт <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label htmlFor="cfg-name" className="sr-only">
        Име
      </label>
      <input id="cfg-name" name="name" placeholder="Име" required className={`input ${state?.field === "name" ? "!border-danger" : ""}`} />
      <label htmlFor="cfg-contact" className="sr-only">
        Телефон или имейл
      </label>
      <input
        id="cfg-contact"
        name="contact"
        placeholder="Телефон или имейл"
        required
        className={`input ${state?.field === "contact" ? "!border-danger" : ""}`}
      />
      <label htmlFor="cfg-note" className="sr-only">
        Бележка
      </label>
      <textarea id="cfg-note" name="note" rows={2} placeholder="Бележка (по желание): за какво ще се ползва, срок…" className="input !h-auto py-2.5 text-[14px]" />
      <label className="flex items-start gap-2.5 text-[12px] text-muted">
        <input type="checkbox" name="privacy" className="mt-0.5 h-4 w-4 accent-accent" />
        <span>
          Съгласен съм данните да се използват, за да се свържете с мен по тази конфигурация (
          <Link href="/poveritelnost" className="underline underline-offset-2">
            поверителност
          </Link>
          ).
        </span>
      </label>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        <Send className="h-4 w-4" /> {pending ? "Изпращане…" : "Изпрати конфигурацията"}
      </button>
      {state?.error && (
        <p role="alert" className="text-[13px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Cctv, Check, Cpu, Globe, Headphones, Laptop, Loader2, Phone, Wrench } from "lucide-react";
import type { FacetKey } from "@/lib/facets";
import type { InquiryTopic } from "@/lib/inquiries";
import { InquiryForm } from "@/components/InquiryForm";
import { funnelPreview, type FunnelPreview } from "./actions";
import { shelves } from "./shelves";

// „Избери решение“: при продукт всяка стъпка приема няколко отговора, живият брояч показва колко
// продукта отговарят, а краят води в точния филтриран каталог. Цената е първият въпрос.
// При услуга: тип на задачата → форма.

const starts = [
  { id: "computers", kind: "product", label: "Компютри и лаптопи", hint: "Гейминг, офис, настолни и мобилни машини", icon: Laptop },
  { id: "parts", kind: "product", label: "Компоненти и периферия", hint: "Части, монитори и аксесоари", icon: Cpu },
  { id: "servis", kind: "service", label: "Сервиз на компютри и лаптопи", hint: "Диагностика, ремонт и профилактика", icon: Wrench },
  { id: "it", kind: "service", label: "IT поддръжка за фирми", hint: "Потребители, устройства и ежедневни проблеми", icon: Headphones },
  { id: "video", kind: "service", label: "Видеонаблюдение и IP камери", hint: "Оглед, монтаж, настройка и ремонт", icon: Cctv },
  { id: "drugo", kind: "service", label: "Уебсайтове и хостинг", hint: "Изработка, онлайн магазини и поддръжка", icon: Globe },
] as const;

const serviceTypes = [
  { id: "urgent", label: "Спешен проблем", hint: "Работата е спряна или има риск" },
  { id: "once", label: "Еднократна услуга", hint: "Ремонт, настройка или конкретен проблем" },
  { id: "subscription", label: "Абонаментна поддръжка", hint: "Постоянна грижа за фирмената среда" },
  { id: "project", label: "Нов проект или оферта", hint: "Планиране, доставка и внедряване" },
];

type Start = (typeof starts)[number];

export function Funnel({ phone, phoneHref }: { phone: string; phoneHref: string }) {
  const [start, setStart] = useState<Start | null>(null);
  const [shelfId, setShelfId] = useState<string | null>(null);
  const [ranges, setRanges] = useState<number[]>([]);
  const [facets, setFacets] = useState<Partial<Record<FacetKey, string[]>>>({});
  const [step, setStep] = useState(0);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [preview, setPreview] = useState<FunnelPreview | null>(null);
  const [loading, startLoading] = useTransition();

  // Живият брояч — при всяка промяна в избора
  useEffect(() => {
    if (!shelfId) return;
    let active = true;
    startLoading(async () => {
      const p = await funnelPreview(shelfId, ranges, facets);
      if (active) setPreview(p);
    });
    return () => {
      active = false;
    };
  }, [shelfId, ranges, facets]);

  const reset = () => {
    setStart(null);
    setShelfId(null);
    setRanges([]);
    setFacets({});
    setStep(0);
    setServiceType(null);
    setPreview(null);
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // Стъпките на продукта: 1 какво, 2 рафт, 3 цена, после техническите въпроси, накрая резултатът
  const facetSteps = preview?.steps ?? [];
  const totalSteps = start?.kind === "service" ? 3 : 3 + facetSteps.length + 1;
  const current = !start ? 1 : start.kind === "service" ? (serviceType ? 3 : 2) : !shelfId ? 2 : 3 + step;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <p className="mb-6 text-[13px] uppercase tracking-wide text-dim">
          Стъпка {current} от {Math.max(current, totalSteps)}
        </p>

        {!start && (
          <Step title="Какво търсите?" hint="Изберете най-близкия отговор. На следващия екран ще уточните само необходимото.">
            <div className="grid gap-3 sm:grid-cols-2">
              {starts.map((s) => (
                <Option key={s.id} onClick={() => setStart(s)} icon={s.icon} label={s.label} hint={s.hint} />
              ))}
            </div>
          </Step>
        )}

        {start?.kind === "product" && !shelfId && (
          <Step title={start.id === "computers" ? "Какъв тип компютър търсите?" : "Какво оборудване търсите?"} hint="Всеки избор води към отделен каталог с подходящите продукти и филтри.">
            <div className="grid gap-3 sm:grid-cols-2">
              {shelves
                .filter((s) => s.group === start.id)
                .map((s) => (
                  <Option key={s.id} onClick={() => setShelfId(s.id)} label={s.label} hint={s.hint} />
                ))}
            </div>
            <Back onClick={reset} label="Промени основния избор" />
          </Step>
        )}

        {start?.kind === "product" && shelfId && preview && step === 0 && (
          <Step title="Какъв е бюджетът?" hint="Може да изберете повече от един диапазон.">
            <div className="flex flex-wrap gap-2">
              {preview.ranges.map((r) => (
                <Chip key={r.index} active={ranges.includes(r.index)} count={r.count} onClick={() => setRanges((x) => toggle(x, r.index))}>
                  {r.label}
                </Chip>
              ))}
            </div>
            <Nav onBack={() => setShelfId(null)} onNext={() => setStep(1)} nextLabel={ranges.length ? "Напред" : "Всякакъв бюджет"} />
          </Step>
        )}

        {start?.kind === "product" && shelfId && preview && step > 0 && step <= facetSteps.length && (
          <Step title={facetSteps[step - 1].label} hint="Може да изберете повече от един отговор — или да прескочите.">
            <div className="flex flex-wrap gap-2">
              {facetSteps[step - 1].values.map((v) => {
                const key = facetSteps[step - 1].key;
                const active = facets[key]?.includes(v.value) ?? false;
                return (
                  <Chip
                    key={v.value}
                    active={active}
                    count={v.count}
                    onClick={() => setFacets((f) => ({ ...f, [key]: toggle(f[key] ?? [], v.value) }))}
                  >
                    {v.value}
                  </Chip>
                );
              })}
            </div>
            <Nav onBack={() => setStep((s) => s - 1)} onNext={() => setStep((s) => s + 1)} nextLabel="Напред" />
          </Step>
        )}

        {start?.kind === "product" && shelfId && preview && step > facetSteps.length && (
          <Step title={preview.total ? `${preview.total} подходящи продукта` : "Няма продукт с тази комбинация"} hint={preview.total ? "Каталогът се отваря с избраните филтри — може да ги промените там." : "Махнете някой от отговорите или ни пишете — ще намерим подходящ вариант."}>
            <div className="flex flex-wrap gap-3">
              {preview.total > 0 && (
                <Link href={preview.href} className="btn btn-primary">
                  Покажи продуктите ({preview.total}) <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/zapitvane?tema=nov-kompyutar" className="btn btn-ghost">
                Изпрати запитване
              </Link>
            </div>
            <Back onClick={() => setStep((s) => s - 1)} label="Назад" />
          </Step>
        )}

        {start?.kind === "service" && !serviceType && (
          <Step title="Как да помогнем?" hint="Уточнете вида на задачата. Не е нужно да знаете техническата причина.">
            <div className="grid gap-3 sm:grid-cols-2">
              {serviceTypes.map((t) => (
                <Option key={t.id} onClick={() => setServiceType(t.label)} label={t.label} hint={t.hint} />
              ))}
            </div>
            <Back onClick={reset} label="Промени основния избор" />
          </Step>
        )}

        {start?.kind === "service" && serviceType && (
          <Step title="Нека уточним задачата." hint="Опишете накратко проблема и ще получите конкретна следваща стъпка.">
            <a href={phoneHref} className="btn btn-primary mb-6">
              <Phone className="h-4 w-4" /> Обадете се: {phone}
            </a>
            <InquiryForm
              topic={start.id as InquiryTopic}
              defaultMessage={`${start.label} · ${serviceType}\n`}
              submitLabel="Изпрати кратко запитване"
            />
            <Back onClick={() => setServiceType(null)} label="Назад" />
          </Step>
        )}
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--header-sticky)+24px)] lg:self-start">
        <div className="cut-frame [--frame:var(--color-accent)]">
          <div className="cut-inner bg-surface-2 p-6">
            {start?.kind === "product" && shelfId && preview ? (
              <>
                <p className="tagline">Подходящи продукти</p>
                <p className="mt-2 flex items-center gap-3 font-display text-[44px] leading-none text-white" aria-live="polite">
                  {preview.total}
                  {loading && <Loader2 className="h-5 w-5 animate-spin text-dim" />}
                </p>
                <p className="mt-2 text-[13px] text-muted">{shelves.find((s) => s.id === shelfId)?.label}</p>
                {preview.total > 0 && (
                  <Link href={preview.href} className="btn btn-sm btn-ghost mt-5 w-full">
                    Покажи сега
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className="tagline">Без регистрация</p>
                <p className="mt-2 text-[14px] text-muted">
                  Реални цени и наличности за продуктите; конкретно уточнение преди оферта за услуга.
                </p>
              </>
            )}
            <button type="button" onClick={reset} className="mt-5 text-[12px] uppercase tracking-wide text-dim hover:text-white">
              Започнете отначало
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Step({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="h-display text-[24px]">{title}</h2>
      <p className="mt-2 text-muted">{hint}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Option({ onClick, label, hint, icon: Icon }: { onClick: () => void; label: string; hint: string; icon?: typeof Laptop }) {
  return (
    <button type="button" onClick={onClick} className="flex items-start gap-4 bg-surface-2 p-5 text-left ring-1 ring-line hover:ring-accent">
      {Icon && <Icon className="mt-0.5 h-6 w-6 flex-none text-accent-ink" strokeWidth={1.5} />}
      <span>
        <span className="block text-[16px] font-medium text-white">{label}</span>
        <span className="block text-[13px] text-muted">{hint}</span>
      </span>
    </button>
  );
}

function Chip({ active, count, onClick, children }: { active: boolean; count: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={!count && !active}
      className="chip disabled:cursor-not-allowed disabled:opacity-40"
      data-active={active}
    >
      {active && <Check className="h-3.5 w-3.5" />} {children} <span className="text-dim">{count}</span>
    </button>
  );
}

function Nav({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Назад
      </button>
      <button type="button" onClick={onNext} className="btn btn-sm btn-primary">
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="mt-8 flex items-center gap-2 text-[13px] text-muted hover:text-white">
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}

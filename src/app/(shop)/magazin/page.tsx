import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { getMenu } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Магазин",
  description: "Целият каталог на GSOL: лаптопи, компютри, компоненти, периферия и реновирана техника.",
};

export default async function StorePage() {
  const { departments } = await getMenu();
  return (
    <>
      <PageHeader title="Магазин" tagline="Целият каталог — изберете отдел или използвайте помощника за избор" crumbs={[{ label: "Магазин" }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          <Link href="/izberi-reshenie" className="flex items-center gap-4 bg-accent/10 p-5 ring-1 ring-accent/40 hover:ring-accent">
            <Sparkles className="h-7 w-7 flex-none text-accent-ink" strokeWidth={1.5} />
            <span>
              <span className="block text-[16px] font-medium text-white">Избери решение</span>
              <span className="block text-[13px] text-muted">Няколко въпроса — и стигате до подходящите продукти</span>
            </span>
          </Link>
          <Link href="/konfigurator" className="flex items-center gap-4 bg-surface-2 p-5 ring-1 ring-line hover:ring-accent">
            <SlidersHorizontal className="h-7 w-7 flex-none text-accent-ink" strokeWidth={1.5} />
            <span>
              <span className="block text-[16px] font-medium text-white">Конфигуратор</span>
              <span className="block text-[13px] text-muted">Изберете всяка част сами — съвместимостта се проверява веднага</span>
            </span>
          </Link>
        </div>

        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <li key={d.slug} className="cut-frame [--frame:var(--color-line-soft)] hover:[--frame:var(--color-accent)]">
              <div className="cut-inner h-full bg-surface-2 p-6">
                <Link href={d.href} className="group flex items-baseline justify-between gap-3">
                  <span className="h-display text-[20px] group-hover:text-accent-ink">{d.label}</span>
                  <span className="text-[13px] text-dim">{d.count}</span>
                </Link>
                {d.subs.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {d.subs.map((s) => (
                      <li key={s.href}>
                        <Link href={s.href} className="flex justify-between gap-3 text-[14px] text-text hover:text-accent-ink">
                          {s.label} <span className="text-[12px] text-dim">{s.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={d.href} className="mt-5 flex items-center gap-1.5 font-display text-[12px] uppercase tracking-wide text-accent-ink">
                  Всички <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

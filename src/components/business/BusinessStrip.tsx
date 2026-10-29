import Link from "next/link";
import { ArrowRight, Building2, FileText, Landmark, Receipt } from "lucide-react";

// Лента „За фирми“ — само в режим „за бизнеса“ (вариант business:, без JS и без проблясване).
// Само неща, които сайтът наистина прави: фактура на фирма, банков превод, оферта за повече бройки.

const points = [
  { icon: Receipt, text: "Фактура на фирма — ЕИК, ДДС № и МОЛ при поръчката" },
  { icon: Landmark, text: "Банков превод с данните след потвърждението" },
  { icon: FileText, text: "Оферта за няколко броя или друга конфигурация" },
];

export function BusinessStrip({ offerHref = "/zapitvane?tema=kompyutar", className = "" }: { offerHref?: string; className?: string }) {
  return (
    <aside
      aria-label="За фирми"
      className={`hidden flex-wrap items-center gap-x-8 gap-y-3 border-l-2 border-accent bg-surface-2 px-5 py-4 business:flex ${className}`}
    >
      <span className="flex items-center gap-2 font-display text-[13px] uppercase tracking-wide text-white">
        <Building2 className="h-4 w-4 text-accent-ink" /> За фирми
      </span>
      <ul className="flex flex-1 flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2">
            <Icon className="h-4 w-4 flex-none text-dim" strokeWidth={1.75} /> {text}
          </li>
        ))}
      </ul>
      <Link
        href={offerHref}
        className="flex items-center gap-2 font-display text-[12px] uppercase tracking-wide text-accent-ink hover:underline"
      >
        Фирмена оферта <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </aside>
  );
}

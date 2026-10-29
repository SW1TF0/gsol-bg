import Link from "next/link";
import { Check } from "lucide-react";

const steps = [
  { n: 1, label: "Количка", href: "/kolichka" },
  { n: 2, label: "Данни и доставка", href: "/porachka" },
  { n: 3, label: "Потвърждение", href: null },
];

/** Поръчката е в три стъпки, без задължителна регистрация */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]" aria-label="Стъпки на поръчката">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        const body = (
          <span className={`flex items-center gap-2 ${active ? "text-white" : done ? "text-muted hover:text-white" : "text-dim"}`}>
            <span
              className={`flex h-6 w-6 items-center justify-center font-display text-[12px] ${
                active ? "bg-accent text-on-accent" : done ? "bg-ok/20 text-ok" : "bg-surface text-dim"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : s.n}
            </span>
            <span className="uppercase tracking-wide">{s.label}</span>
          </span>
        );
        return (
          <li key={s.n} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
            {done && s.href ? <Link href={s.href}>{body}</Link> : body}
            {i < steps.length - 1 && <span className="h-px w-6 bg-line sm:w-10" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

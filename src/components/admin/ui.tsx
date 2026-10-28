import Link from "next/link";
import { orderStatusLabels } from "@/lib/orders";

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-display text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-surface-2 p-5 ring-1 ring-line-soft ${className}`}>
      {title && <h2 className="mb-4 font-display text-[14px] uppercase tracking-[1.5px] text-muted">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <div className="cut-frame cut-sm h-full [--frame:var(--color-line-soft)] hover:[--frame:var(--color-accent)]">
      <div className="cut-inner bg-gradient-to-br from-surface-2 from-50% to-accent/10 p-5">
        <div className="text-[12px] uppercase tracking-[1.5px] text-dim">{label}</div>
        <div className="mt-2 font-display text-[28px] text-white">{value}</div>
        {hint && <div className="mt-1 text-[12px] text-muted">{hint}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const statusTone: Record<string, string> = {
  new: "bg-accent text-white",
  confirmed: "bg-[#2563eb] text-white",
  processing: "bg-[#a855f7] text-white",
  shipped: "bg-[#f59e0b] text-black",
  delivered: "bg-ok text-black",
  cancelled: "bg-surface text-dim",
  returned: "bg-surface text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center px-2.5 font-display text-[11px] uppercase tracking-wide ${statusTone[status] ?? "bg-surface"}`}
    >
      {orderStatusLabels[status] ?? status}
    </span>
  );
}

export function Pill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center px-2.5 text-[12px] ${on ? "bg-ok/15 text-ok" : "bg-surface text-dim"}`}
    >
      {children}
    </span>
  );
}

/** Таблица с еднакъв стил за всички списъци в админа */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto bg-surface-2 ring-1 ring-line-soft">
      <table className="w-full min-w-[720px] text-left text-[14px]">
        <thead>
          <tr className="border-b border-line text-[12px] uppercase tracking-wide text-dim">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="bg-surface-2 p-10 text-center text-muted ring-1 ring-line-soft">{children}</div>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Страници" className="mt-6 flex items-center justify-between text-[14px]">
      <span className="text-muted">
        Страница {page} от {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="chip">
            ← Предишна
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="chip">
            Следваща →
          </Link>
        )}
      </div>
    </nav>
  );
}

const dateFmt = new Intl.DateTimeFormat("bg-BG", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Sofia",
});

export function formatDate(iso: string | null | undefined) {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  accent,
  tagline,
  crumbs,
}: {
  title: string;
  accent?: string;
  tagline?: string;
  crumbs: { label: string; href?: string }[];
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-bg-alt to-bg pb-10 pt-10">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      <div className="relative mx-auto max-w-[1200px] px-4">
        <nav aria-label="Път до страницата">
          <ol className="flex flex-wrap items-center gap-1.5 text-[12px] uppercase tracking-wide text-dim">
            <li>
              <Link href="/" className="hover:text-white">
                Начало
              </Link>
            </li>
            {crumbs.map((c) => (
              <li key={c.label} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" />
                {c.href ? (
                  <Link href={c.href} className="hover:text-white">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-muted" aria-current="page">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {title && (
          <h1 className="h-display mt-5 text-[32px] sm:text-[40px]">
            {title} {accent && <span className="text-accent-ink">{accent}</span>}
          </h1>
        )}
        {tagline && <p className="tagline mt-2">{tagline}</p>}
      </div>
    </div>
  );
}

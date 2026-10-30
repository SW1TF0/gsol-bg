import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { formatDay } from "@/lib/format";
import { getPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Съвети",
  description: "Практични съвети за компютри, лаптопи, принтери, мрежи и IT за фирми — от сервиза на GSOL.",
};

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <>
      <PageHeader title="Съвети" tagline="От сервиза и IT поддръжката на GSOL — проверки, цени и решения без излишни термини" crumbs={[{ label: "Съвети" }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/${p.slug}`} className="cut-frame group block h-full hover:[--frame:var(--color-accent)]">
                <article className="cut-inner flex h-full flex-col gap-3 bg-surface-2 p-6">
                  {p.published_at && (
                    <span className="flex items-center gap-1.5 text-[12px] text-dim">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDay(p.published_at)}
                    </span>
                  )}
                  <h2 className="text-[17px] font-medium leading-snug text-white group-hover:text-accent-ink">{p.title}</h2>
                  {p.intro && <p className="line-clamp-4 text-[14px] text-muted">{p.intro}</p>}
                  <span className="mt-auto flex items-center gap-1.5 pt-2 font-display text-[12px] uppercase tracking-wide text-accent-ink">
                    Прочетете <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

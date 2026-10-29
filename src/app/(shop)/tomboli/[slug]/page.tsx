import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Gift, ShieldCheck, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { Prose } from "@/components/Prose";
import { Countdown } from "@/components/raffle/Countdown";
import { ButtonLink } from "@/components/ui";
import { formatDate, plural } from "@/lib/format";
import { getRaffle } from "@/lib/raffle-data";
import { describeEntryRules } from "@/lib/raffles";

export async function generateMetadata(props: PageProps<"/tomboli/[slug]">): Promise<Metadata> {
  const raffle = await getRaffle((await props.params).slug);
  return raffle ? { title: raffle.title, description: raffle.intro ?? undefined } : {};
}

export default function RafflePage(props: PageProps<"/tomboli/[slug]">) {
  return (
    <Suspense fallback={<div className="h-[70vh]" aria-busy="true" />}>
      <RaffleContent params={props.params} />
    </Suspense>
  );
}

async function RaffleContent({ params }: Pick<PageProps<"/tomboli/[slug]">, "params">) {
  const raffle = await getRaffle((await params).slug);
  if (!raffle) notFound();
  const drawn = raffle.status === "drawn";
  const prizeCount = raffle.prizes.reduce((s, p) => s + p.quantity, 0);

  return (
    <>
      <PageHeader
        title={raffle.title}
        tagline={raffle.intro ?? undefined}
        crumbs={[{ label: "Томболи", href: "/tomboli" }, { label: raffle.title }]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <section className="cut-frame cut-lg">
          <div className="cut-inner relative grid gap-8 overflow-hidden bg-bg-deep p-8 md:grid-cols-[1.2fr_1fr] md:p-12">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-[100px]" />
            <div className="relative space-y-6">
              {drawn ? (
                <p className="flex items-center gap-3 font-display text-[20px] uppercase tracking-wide text-ok">
                  <Trophy className="h-6 w-6" /> Победителите са изтеглени
                </p>
              ) : (
                <Countdown to={raffle.ends_at} label={`Край: ${formatDate(raffle.ends_at)}`} />
              )}
              <div className="flex flex-wrap gap-6 text-[14px] text-muted">
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-accent-ink" /> {plural(prizeCount, "награда", "награди")}
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent-ink" /> {plural(raffle.stats.participants, "участник", "участници")} ·{" "}
                  {plural(raffle.stats.entries, "участие", "участия")}
                </span>
              </div>
              {!drawn && (
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/promocii" size="lg">
                    Пазарувай и участвай
                  </ButtonLink>
                  <ButtonLink href="/profil" variant="outline" className="[--section-bg:var(--color-bg-deep)]">
                    Моите участия
                  </ButtonLink>
                </div>
              )}
            </div>
            {raffle.image_url && (
              <div className="relative min-h-[220px]">
                <Image src={raffle.image_url} alt="" fill sizes="(min-width: 768px) 420px, 90vw" className="object-contain" unoptimized />
              </div>
            )}
          </div>
        </section>

        {drawn && raffle.winners && (
          <section className="mt-12" aria-labelledby="winners">
            <h2 id="winners" className="h-display text-[26px] font-normal">
              Печеливши
            </h2>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {raffle.winners.map((w) => (
                <li key={w.position} className="flex items-center gap-4 bg-surface-2 p-4 ring-1 ring-ok/30">
                  <span className="font-display text-[24px] text-ok">#{w.position}</span>
                  <span>
                    <span className="block text-white">{w.name}</span>
                    {w.prize && <span className="block text-[13px] text-muted">{w.prize}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {raffle.seed && (
              <p className="mt-4 flex items-start gap-2 break-all text-[12px] text-dim">
                <ShieldCheck className="h-4 w-4 flex-none" /> Тегленето е случайно и проверимо. Код за проверка:{" "}
                <span className="font-mono text-muted">{raffle.seed}</span>
              </p>
            )}
          </section>
        )}

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr]">
          <section aria-labelledby="prizes">
            <h2 id="prizes" className="h-display text-[24px] font-normal">
              <span className="text-accent-ink">Награди</span>
            </h2>
            <ul className="mt-6 space-y-3">
              {raffle.prizes.map((p, i) => (
                <li key={i} className="flex gap-4 bg-surface-2 p-4 ring-1 ring-line-soft">
                  {p.image_url ? (
                    <span className="relative h-16 w-16 flex-none bg-plate">
                      <Image src={p.image_url} alt="" fill sizes="64px" className="object-contain p-1 mix-blend-multiply" unoptimized />
                    </span>
                  ) : (
                    <Gift className="h-8 w-8 flex-none text-accent-ink" strokeWidth={1.5} />
                  )}
                  <div>
                    <div className="text-[16px] text-white">
                      {p.title} {p.quantity > 1 && <span className="text-accent-ink">× {p.quantity}</span>}
                    </div>
                    {p.description && <p className="mt-1 text-[14px] text-muted">{p.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="how">
            <h2 id="how" className="h-display text-[24px] font-normal">
              Как се <span className="text-accent-ink">участва</span>
            </h2>
            <ul className="mt-6 space-y-3">
              {describeEntryRules(raffle, raffle.bonus_items.map((b) => b.name)).map((line) => (
                <li key={line} className="flex gap-3 text-[15px] text-text">
                  <Check className="mt-0.5 h-5 w-5 flex-none text-accent-ink" /> {line}
                </li>
              ))}
            </ul>
            {raffle.bonus_entries > 0 && raffle.bonus_items.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-[12px] uppercase tracking-[1.5px] text-dim">С бонус участия</div>
                <div className="flex flex-wrap gap-2">
                  {raffle.bonus_items.map((b) => (
                    <Link key={b.href} href={b.href} className="chip hover:text-white">
                      {b.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-6 text-[14px] text-muted">
              Броят на участията ви виждате в количката преди поръчка и в{" "}
              <Link href="/profil" className="text-white underline underline-offset-2">
                Моите поръчки
              </Link>
              .
            </p>
          </section>
        </div>

        {raffle.rules.trim() && (
          <section className="mt-16" aria-labelledby="rules">
            <h2 id="rules" className="h-display mb-8 text-[24px] font-normal">
              Официални <span className="text-accent-ink">правила</span>
            </h2>
            <Prose>{raffle.rules}</Prose>
          </section>
        )}
      </div>
    </>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Ticket } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { formatDate, plural } from "@/lib/format";
import { listRaffles } from "@/lib/raffle-data";

export const metadata: Metadata = {
  title: "Томболи",
  description: "Томболи с награди от GSOL — всяка потвърдена поръчка ви носи участия.",
};

export default function RafflesPage() {
  return (
    <>
      <PageHeader title="GSOL" accent="томболи" tagline="Поръчвате — участвате автоматично" crumbs={[{ label: "Томболи" }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <Suspense fallback={<div className="h-64 animate-pulse bg-surface-2" />}>
          <RaffleList />
        </Suspense>
      </div>
    </>
  );
}

async function RaffleList() {
  const raffles = await listRaffles();
  if (!raffles.length) {
    return (
      <div className="bg-surface-2 p-10 text-center">
        <Ticket className="mx-auto h-10 w-10 text-accent-ink" strokeWidth={1.5} />
        <p className="h-display mt-4 text-[20px]">Скоро нова томбола</p>
        <p className="mt-2 text-muted">Абонирайте се за оферти при следващата си поръчка, за да научите първи.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {raffles.map((r) => {
        const prizes = r.raffle_prizes.reduce((s, p) => s + p.quantity, 0);
        return (
          <Link
            key={r.slug}
            href={`/tomboli/${r.slug}`}
            className="cut-frame cut-lg group [--frame:var(--color-line-soft)] hover:[--frame:var(--color-accent)]"
          >
            <div className="cut-inner flex h-full flex-col bg-gradient-to-br from-surface-2 from-50% to-accent/15 p-8">
              <span
                className={`w-fit px-2.5 py-1 font-display text-[11px] uppercase tracking-wide ${r.status === "drawn" ? "bg-ok text-black" : "bg-accent text-on-accent"}`}
              >
                {r.status === "drawn" ? "Изтеглена" : "Активна"}
              </span>
              <h2 className="h-display mt-5 text-[24px] group-hover:text-accent-ink">{r.title}</h2>
              {r.intro && <p className="mt-2 text-muted">{r.intro}</p>}
              <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-6 text-[13px] text-muted">
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-accent-ink" /> {plural(prizes, "награда", "награди")}
                </span>
                <span>до {formatDate(r.ends_at)}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

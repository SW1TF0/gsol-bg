"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cpu, Gamepad2, Crown, Briefcase } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { Product, Tier } from "@/lib/catalog";

const tabs: { tier: Tier; label: string; icon: typeof Cpu }[] = [
  { tier: "basic", label: "Basic Gaming", icon: Gamepad2 },
  { tier: "izbor", label: "GSOL Избор", icon: Cpu },
  { tier: "premium", label: "GSOL Премиум", icon: Crown },
  { tier: "office", label: "GSOL Office", icon: Briefcase },
];

type TierData = { name: string; blurb: string; products: Product[]; from: number | null };

export function ConfigTabs({ data }: { data: Record<Tier, TierData> }) {
  const [active, setActive] = useState<Tier>("izbor");
  const current = data[active];
  const hero = current.products[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-center">
      <div role="tablist" aria-label="Нива на конфигурациите" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {tabs.map(({ tier, label, icon: Icon }) => {
          const selected = tier === active;
          return (
            <button
              key={tier}
              role="tab"
              id={`tab-${tier}`}
              aria-selected={selected}
              aria-controls="config-panel"
              onClick={() => setActive(tier)}
              className={`flex h-11 flex-none items-center gap-3 px-4 font-display text-[13px] uppercase tracking-wide transition-colors lg:w-full ${
                selected ? "bg-accent text-white" : "bg-surface text-text hover:bg-[#303036]"
              }`}
              style={{ clipPath: "polygon(0 100%, 0 10px, 10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%)" }}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
      </div>

      <div id="config-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="cut-frame cut-lg">
        <div className="cut-inner relative grid min-h-[420px] overflow-hidden bg-bg-deep md:grid-cols-[1.1fr_1fr]">
          <div className="relative z-10 flex flex-col justify-center gap-5 p-8 md:p-12">
            <p className="tagline flex items-center gap-2.5 !text-[13px]">
              <span className="marker" /> {current.products.length} готови конфигурации
            </p>
            <h3 className="h-display text-[28px]">{current.name}</h3>
            <p className="max-w-md text-muted">{current.blurb}</p>
            {hero?.components && (
              <dl className="grid max-w-md grid-cols-[48px_1fr] gap-x-3 gap-y-2 text-[14px]">
                <dt className="font-display text-accent">CPU</dt>
                <dd className="text-white">{hero.components.cpu}</dd>
                <dt className="font-display text-accent">GPU</dt>
                <dd className="text-white">{hero.components.gpu}</dd>
                <dt className="font-display text-accent">Кутия</dt>
                <dd className="text-white">{hero.components.case}</dd>
              </dl>
            )}
            <div className="flex flex-wrap items-end gap-6">
              {current.from !== null && (
                <div>
                  <div className="text-[12px] uppercase tracking-[1.5px] text-dim">Цени от</div>
                  <div className="font-display text-[30px] text-white">{formatPrice(current.from)}</div>
                </div>
              )}
              <Link href={`/katalog/kompyutri?sub=gsol-${active}`} className="btn btn-primary">
                Виж всички
              </Link>
            </div>
          </div>
          {hero?.images[0] && (
            <div className="relative min-h-[260px] bg-plate">
              <Image
                src={hero.images[0]}
                alt={hero.name}
                fill
                sizes="(min-width: 1024px) 420px, 90vw"
                className="object-contain p-8 mix-blend-multiply"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-bg-deep to-transparent md:block" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

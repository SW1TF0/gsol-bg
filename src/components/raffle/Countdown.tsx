"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Обратно броене до края (или началото) на томболата */
export function Countdown({ to, label }: { to: string; label: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <div className="h-[92px]" aria-hidden="true" />;
  const left = new Date(to).getTime() - now;
  if (left <= 0) return <p className="font-display text-[18px] uppercase tracking-wide text-white">Томболата приключи</p>;

  const { d, h, m, s } = parts(left);
  const cells: [number, string][] = [
    [d, "дни"],
    [h, "часа"],
    [m, "мин"],
    [s, "сек"],
  ];
  return (
    <div>
      <div className="tagline !text-[12px]">{label}</div>
      <div className="mt-2 flex gap-2" role="timer" aria-label={`${d} дни, ${h} часа и ${m} минути`}>
        {cells.map(([v, unit]) => (
          <div
            key={unit}
            className="w-[68px] bg-black/60 py-2 text-center ring-1 ring-line"
            style={{ clipPath: "polygon(0 100%, 0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%)" }}
          >
            <div className="font-display text-[28px] leading-none text-white tabular-nums">{String(v).padStart(2, "0")}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-dim">{unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

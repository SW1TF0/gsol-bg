"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Building2, House } from "lucide-react";
import { MODE_EVENT, MODE_KEY, type Mode } from "@/lib/mode";

// Превключвател „за дома“ / „за бизнеса“. Видът му се сменя само с CSS (вариант business:), както при
// темата — сървърът и браузърът рисуват едно и също. При смяна страницата се затваря с колони като
// сгради (към бизнеса — изникват отдолу като силует на град; към дома — падат отгоре в цвета на
// магазина), режимът се сменя под тях и колоните се отдръпват.

function applyMode(mode: Mode) {
  const root = document.documentElement;
  if (mode === "business") root.dataset.mode = "business";
  else delete root.dataset.mode;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // поверителен режим — изборът важи до презареждане
  }
  window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: mode }));
}

const currentMode = (): Mode => (document.documentElement.dataset.mode === "business" ? "business" : "home");

/** Режимът за компонентите, които трябва да го знаят в JS (на сървъра винаги е „за дома“) */
export function useBusinessMode() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(MODE_EVENT, onChange);
      return () => window.removeEventListener(MODE_EVENT, onChange);
    },
    () => currentMode() === "business",
    () => false,
  );
}

type Shutter = { to: Mode; skyline: number[] };

const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";
const RISE = "cubic-bezier(0.33, 1, 0.68, 1)";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function BusinessToggle({ className = "" }: { className?: string }) {
  const business = useBusinessMode();
  const [shutter, setShutter] = useState<Shutter | null>(null);
  const overlay = useRef<HTMLDivElement>(null);

  function toggle() {
    if (shutter) return;
    const next: Mode = currentMode() === "business" ? "home" : "business";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyMode(next);
      return;
    }
    const columns = window.innerWidth < 640 ? 5 : window.innerWidth < 1024 ? 7 : 9;
    // Силуетът: всяка „сграда“ спира за миг на своя височина, после покрива екрана
    const skyline = Array.from({ length: columns }, () => 25 + Math.round(Math.random() * 45));
    setShutter({ to: next, skyline });
  }

  useEffect(() => {
    const el = overlay.current;
    if (!shutter || !el) return;
    let cancelled = false;
    const cols = [...el.querySelectorAll<HTMLElement>("[data-col]")];
    const label = el.querySelector<HTMLElement>("[data-label]")!;
    const toBusiness = shutter.to === "business";
    const stagger = 34;
    const n = cols.length;

    (async () => {
      const ins = cols.map((c, i) =>
        c.animate(
          toBusiness
            ? [
                { transform: "translateY(101%)" },
                { transform: `translateY(${shutter.skyline[i]}%)`, offset: 0.55 },
                { transform: "translateY(0)" },
              ]
            : [{ transform: "translateY(-101%)" }, { transform: "translateY(0)" }],
          { duration: toBusiness ? 460 : 380, delay: i * stagger, easing: toBusiness ? RISE : EASE, fill: "both" },
        ),
      );
      await Promise.all(ins.map((a) => a.finished));
      if (cancelled) return;

      // Под колоните — смяната
      applyMode(shutter.to);
      await label.animate(
        [
          { opacity: 0, transform: "translateY(16px) scale(0.96)", letterSpacing: "0.3em" },
          { opacity: 1, transform: "none", letterSpacing: "0.12em" },
        ],
        { duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
      ).finished;
      await wait(220);
      if (cancelled) return;

      label.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-12px)" }], { duration: 220, fill: "both" });
      const outs = cols.map((c, i) =>
        c.animate(
          [{ transform: "translateY(0)" }, { transform: toBusiness ? "translateY(-101%)" : "translateY(101%)" }],
          { duration: 420, delay: (toBusiness ? n - 1 - i : i) * stagger, easing: EASE, fill: "both" },
        ),
      );
      await Promise.all(outs.map((a) => a.finished));
      if (!cancelled) setShutter(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [shutter]);

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={business}
        onClick={toggle}
        aria-label="Бизнес клиенти"
        title="Частни / бизнес клиенти"
        className={`relative h-8 w-[60px] flex-none rounded-full bg-surface-2 ring-1 ring-line transition-[box-shadow,background-color] duration-500 hover:ring-dim business:bg-surface business:ring-accent/70 business:shadow-[0_0_18px_-4px_var(--color-accent)] ${className}`}
      >
        <span className="absolute left-[3px] top-[3px] flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-white text-black shadow-md transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] business:translate-x-[28px]">
          <House className="h-4 w-4 transition-transform duration-500 business:hidden" strokeWidth={2} />
          <Building2 className="hidden h-4 w-4 business:block" strokeWidth={2} />
        </span>
      </button>

      {shutter &&
        createPortal(
          <div ref={overlay} aria-hidden="true" className={`mode-shutter ${shutter.to === "business" ? "is-business" : "is-home"}`}>
            {shutter.skyline.map((_, i) => (
              <div key={i} data-col className="mode-shutter-col" />
            ))}
            <div data-label className="mode-shutter-label">
              {shutter.to === "business" ? (
                <>
                  <Building2 strokeWidth={1.25} />
                  <span>GSOL за бизнеса</span>
                  <small>Фирмени оферти · фактура на фирма · IT поддръжка</small>
                </>
              ) : (
                <>
                  <House strokeWidth={1.25} />
                  <span>GSOL за дома</span>
                  <small>Лаптопи, компютри и сервиз за всеки ден</small>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

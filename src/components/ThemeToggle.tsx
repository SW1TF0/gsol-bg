"use client";

import { Moon, Sun } from "lucide-react";

// Тема: по подразбиране тъмна; изборът се пази в браузъра (gsol-theme) и се прилага преди рисуването
// от скрипта в основния layout. Иконата се сменя само с CSS (вариант light:), без състояние —
// така сървърът и браузърът рисуват едно и също.

const KEY = "gsol-theme";
const DURATION = 950;
const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";

function apply(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // поверителен режим — темата важи до презареждане
  }
}

/** Светещ пръстен по ръба на кръга — добавя се в новия изглед, затова свети в цвета на новата тема */
function addRing(x: number, y: number, r: number) {
  const ring = document.createElement("div");
  ring.setAttribute("aria-hidden", "true");
  Object.assign(ring.style, {
    position: "fixed",
    left: `${x - r}px`,
    top: `${y - r}px`,
    width: `${2 * r}px`,
    height: `${2 * r}px`,
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: "2147483647",
    transform: "scale(0)",
    boxShadow:
      "inset 0 0 0 3px var(--color-accent), inset 0 0 90px 24px color-mix(in srgb, var(--color-accent) 55%, transparent)",
  });
  document.body.appendChild(ring);
  return ring;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(next);
      return;
    }
    if (!document.startViewTransition) {
      root.classList.add("theme-fade");
      apply(next);
      window.setTimeout(() => root.classList.remove("theme-fade"), 500);
      return;
    }

    // Кръгът тръгва от бутона (или от центъра му при натискане от клавиатурата).
    // Изрязването е в проценти, а не в пиксели: така съвпада и когато снимката е в друг мащаб.
    const rect = event.currentTarget.getBoundingClientRect();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const at = `${(x / w) * 100}% ${(y / h) * 100}%`;
    const reach = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
    // Радиусът в % се мери спрямо диагонала / √2 — стигаме най-далечния ъгъл
    const radius = (reach / (Math.hypot(w, h) / Math.SQRT2)) * 100;
    root.style.setProperty("--theme-origin", at);

    let ring: HTMLDivElement | null = null;
    const transition = document.startViewTransition(() => {
      apply(next);
      ring = addRing(x, y, reach);
    });
    transition.ready.then(() => {
      const timing = { duration: DURATION, easing: EASE };
      // Новата тема се разлива в кръг…
      root.animate(
        { clipPath: [`circle(0% at ${at})`, `circle(${radius}% at ${at})`] },
        { ...timing, pseudoElement: "::view-transition-new(root)" },
      );
      // …старата се отдръпва назад и потъмнява…
      root.animate(
        { transform: ["scale(1)", "scale(0.92)"], filter: ["brightness(1) blur(0px)", "brightness(0.45) blur(4px)"] },
        { ...timing, pseudoElement: "::view-transition-old(root)" },
      );
      // …а по ръба тича светещ пръстен
      ring?.animate({ transform: ["scale(0)", "scale(1)"], opacity: [1, 1, 0] }, timing);
    });
    transition.finished.finally(() => {
      ring?.remove();
      root.style.removeProperty("--theme-origin");
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Смени светла / тъмна тема"
      title="Светла / тъмна тема"
      className={`flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-accent-ink ${className}`}
    >
      {/* Слънцето се завърта и изчезва, луната изгрява на мястото му */}
      <span className="relative h-5 w-5">
        <Sun
          className="absolute inset-0 h-5 w-5 transition-all duration-700 ease-out light:rotate-180 light:scale-0 light:opacity-0"
          strokeWidth={1.75}
        />
        <Moon
          className="absolute inset-0 h-5 w-5 -rotate-180 scale-0 opacity-0 transition-all duration-700 ease-out light:rotate-0 light:scale-100 light:opacity-100"
          strokeWidth={1.75}
        />
      </span>
    </button>
  );
}

/** Изпълнява се преди рисуването: прилага запазената тема, за да няма проблясване */
export const themeScript = `try{if(localStorage.getItem("${KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

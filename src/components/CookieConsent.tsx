"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { OPEN_SETTINGS_EVENT, openCookieSettings, readConsent, saveConsent } from "@/lib/consent";

/** „Вашият избор за поверителност“ — при първо посещение и от „Настройки на бисквитките“ */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const show = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setDetails(Boolean(c));
      setOpen(true);
    };
    // Първо посещение: няма запазен избор → панелът се отваря сам
    // eslint-disable-next-line react-hooks/set-state-in-effect -- бисквитката се чете само в браузъра
    if (!readConsent()) setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, show);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, show);
  }, []);

  if (!open) return null;
  const save = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent(choice);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-labelledby="cookie-title" className="fixed inset-x-0 bottom-0 z-[65] p-3 sm:p-4">
      <div className="mx-auto max-w-[980px] bg-surface-2 p-5 shadow-2xl ring-1 ring-line sm:p-6">
        <div className="flex items-start gap-4">
          <Cookie className="mt-0.5 hidden h-6 w-6 flex-none text-accent-ink sm:block" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <h2 id="cookie-title" className="font-display text-[16px] uppercase tracking-wide text-white">
              Вашият избор за поверителност
            </h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Необходимите бисквитки държат количката и входа. Аналитичните и маркетинговите се включват само ако ги
              разрешите — нищо не е отметнато предварително.{" "}
              <Link href="/poveritelnost" className="text-white underline underline-offset-2">
                Поверителност
              </Link>
            </p>

            {details && (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Toggle label="Необходими" hint="Количка, вход, този избор" checked disabled />
                <Toggle label="Аналитични" hint="Анонимна статистика за посещенията" checked={analytics} onChange={setAnalytics} />
                <Toggle label="Маркетингови" hint="Реклами и измерване на кампании" checked={marketing} onChange={setMarketing} />
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => save({ analytics: false, marketing: false })} className="btn btn-sm btn-ghost">
                Само необходими
              </button>
              {details ? (
                <button type="button" onClick={() => save({ analytics, marketing })} className="btn btn-sm btn-ghost">
                  Запази избора
                </button>
              ) : (
                <button type="button" onClick={() => setDetails(true)} className="btn btn-sm btn-ghost">
                  Настройки
                </button>
              )}
              <button type="button" onClick={() => save({ analytics: true, marketing: true })} className="btn btn-sm btn-primary">
                Приемам всички
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className={`flex items-start gap-2.5 bg-bg-deep p-3 text-[13px] ${disabled ? "opacity-70" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-accent"
      />
      <span>
        <span className="block text-white">
          {label}
          {disabled && <span className="text-dim"> · винаги</span>}
        </span>
        <span className="block text-[12px] text-dim">{hint}</span>
      </span>
    </label>
  );
}

/** Връзка „Настройки на бисквитките“ (за футъра) */
export function CookieSettingsLink({ className = "", label = "Настройки на бисквитките" }: { className?: string; label?: string }) {
  return (
    <button type="button" data-action="cookie-settings" onClick={openCookieSettings} className={className}>
      {label}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, LayoutGrid, SlidersHorizontal } from "lucide-react";
import type { MenuDepartment, MenuLink } from "@/lib/catalog";

export const services: MenuLink[] = [
  { label: "Външен IT отдел", href: "/zapitvane?tema=it", count: 0 },
  { label: "Сървъри и клауд", href: "/zapitvane?tema=it", count: 0 },
  { label: "Архивиране", href: "/zapitvane?tema=it", count: 0 },
  { label: "Видеонаблюдение", href: "/zapitvane?tema=video", count: 0 },
  { label: "Уебсайтове", href: "/zapitvane?tema=drugo", count: 0 },
  { label: "Мрежи", href: "/zapitvane?tema=it", count: 0 },
];

/**
 * Ред с отдели под хедъра: „Каталог“ отваря голям панел (по тип, популярни марки, услуги),
 * всеки отдел — падащ списък. Затварят се с фона, с Esc и при смяна на страницата.
 */
export function DepartmentsNav({ departments, brands }: { departments: MenuDepartment[]; brands: MenuLink[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const pathname = usePathname();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Смяна на страницата затваря менюто (без ефект — при рендер)
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const hover = (key: string | null) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(key), key ? 120 : 200);
  };
  const toggle = (key: string) => setOpen((o) => (o === key ? null : key));
  const current = departments.find((d) => d.slug === open);

  return (
    <nav aria-label="Отдели" className="relative" onMouseLeave={() => hover(null)}>
      <ul className="mx-auto flex h-11 max-w-[1400px] items-stretch gap-0 px-4 lg:px-6 xl:gap-1">
        <li>
          <button
            type="button"
            aria-expanded={open === "catalog"}
            onClick={() => toggle("catalog")}
            onMouseEnter={() => hover("catalog")}
            className={`flex h-full items-center gap-2 px-2 xl:px-3 font-display text-[13px] uppercase tracking-wide transition-colors ${
              open === "catalog" ? "bg-accent text-on-accent" : "text-white hover:text-accent-ink"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Каталог
          </button>
        </li>
        {departments.map((d) => (
          <li key={d.slug}>
            <button
              type="button"
              aria-expanded={open === d.slug}
              onClick={() => toggle(d.slug)}
              onMouseEnter={() => hover(d.slug)}
              className={`flex h-full items-center gap-1 px-2 xl:px-3 text-[13px] uppercase tracking-wide transition-colors ${
                open === d.slug || pathname.startsWith(d.href) ? "text-accent-ink" : "text-white hover:text-accent-ink"
              }`}
            >
              {d.label}
              {(d.subs.length > 0 || d.brands.length > 0) && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
            </button>
          </li>
        ))}
        <li>
          <Link href="/promocii" onMouseEnter={() => hover(null)} className="flex h-full items-center px-2 xl:px-3 text-[13px] font-medium uppercase tracking-wide text-accent-ink hover:text-white">
            Промоции
          </Link>
        </li>
        {/* Само в режим „за бизнеса“ и на широк екран; там заема мястото на „Контакти“, иначе редът не се събира */}
        <li className="hidden business:xl:block">
          <Link href="/it-pregled" onMouseEnter={() => hover(null)} className="flex h-full items-center gap-1.5 px-2 xl:px-3 text-[13px] font-medium uppercase tracking-wide text-accent-ink hover:text-white">
            <Building2 className="h-3.5 w-3.5" /> IT преглед за фирми
          </Link>
        </li>
        <li className="ml-auto">
          <Link href="/konfigurator" onMouseEnter={() => hover(null)} className="flex h-full items-center gap-1.5 px-2 xl:px-3 text-[13px] uppercase tracking-wide text-white hover:text-accent-ink">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Конфигуратор
          </Link>
        </li>
        {/* Под 1280px редът е тесен — контактите остават в горната лента и във футъра */}
        <li className="hidden xl:block business:!hidden">
          <Link href="/kontakti" onMouseEnter={() => hover(null)} className="flex h-full items-center px-2 xl:px-3 text-[13px] uppercase tracking-wide text-white hover:text-accent-ink">
            Контакти
          </Link>
        </li>
      </ul>

      {open && (
        <>
          {/* Фон под менюто — клик затваря */}
          <div aria-hidden="true" className="absolute inset-x-0 top-full h-screen bg-black/50" onClick={() => setOpen(null)} />
          <div className="absolute inset-x-0 top-full border-t border-line-soft bg-bg-deep shadow-2xl" onMouseEnter={() => hover(open)}>
            <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-6">
              {open === "catalog" ? (
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-10">
                  <MenuColumn title="По тип">
                    <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                      {departments.map((d) => (
                        <div key={d.slug}>
                          <Link href={d.href} className="font-display text-[14px] uppercase tracking-wide text-white hover:text-accent-ink">
                            {d.label}
                          </Link>
                          <ul className="mt-2 space-y-1.5">
                            {d.subs.map((s) => (
                              <li key={s.href}>
                                <MenuItem link={s} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </MenuColumn>
                  <MenuColumn title="Популярни марки">
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {brands.map((b) => (
                        <li key={b.label}>
                          <MenuItem link={b} />
                        </li>
                      ))}
                    </ul>
                  </MenuColumn>
                  <MenuColumn title="Услуги">
                    <ul className="space-y-1.5">
                      {services.map((s) => (
                        <li key={s.label}>
                          <MenuItem link={s} />
                        </li>
                      ))}
                    </ul>
                  </MenuColumn>
                </div>
              ) : current ? (
                <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-10">
                  <MenuColumn title={current.label}>
                    <ul className="space-y-1.5">
                      {current.subs.map((s) => (
                        <li key={s.href}>
                          <MenuItem link={s} />
                        </li>
                      ))}
                      <li>
                        <Link href={current.href} className="text-[14px] text-accent-ink hover:underline">
                          Всички {current.label.toLowerCase()} ({current.count}) →
                        </Link>
                      </li>
                    </ul>
                  </MenuColumn>
                  <MenuColumn title="Марки">
                    <ul className="space-y-1.5">
                      {current.brands.map((b) => (
                        <li key={b.label}>
                          <MenuItem link={b} />
                        </li>
                      ))}
                    </ul>
                  </MenuColumn>
                  {current.slug === "kompyutri" ? (
                    <MenuColumn title="По ваша мярка">
                      <p className="text-[14px] text-muted">Изберете всяка част сами — проверяваме съвместимостта и показваме цената веднага.</p>
                      <Link href="/konfigurator" className="btn btn-sm btn-primary mt-4">
                        <SlidersHorizontal className="h-4 w-4" /> Конфигуратор
                      </Link>
                    </MenuColumn>
                  ) : (
                    <MenuColumn title="Помощ при избор">
                      <p className="text-[14px] text-muted">Кажете за какво ви трябва — ще предложим подходящ модел.</p>
                      <Link href="/zapitvane?tema=nov-kompyutar" className="btn btn-sm btn-ghost mt-4">
                        Бързо запитване
                      </Link>
                    </MenuColumn>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

function MenuColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] text-dim">
        <span className="marker" /> {title}
      </h2>
      {children}
    </div>
  );
}

function MenuItem({ link }: { link: MenuLink }) {
  return (
    <Link href={link.href} className="flex items-baseline justify-between gap-3 text-[14px] text-text hover:text-accent-ink">
      <span>{link.label}</span>
      {link.count > 0 && <span className="text-[12px] text-dim">{link.count}</span>}
    </Link>
  );
}

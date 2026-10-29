"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, MessageSquare, Phone, SlidersHorizontal, User, X } from "lucide-react";
import type { MenuDepartment } from "@/lib/catalog";
import { Logo } from "@/components/Logo";
import { SearchBox } from "./SearchBox";
import { services } from "./DepartmentsNav";

/** Мобилното меню: чекмедже отляво; затваря се с фона, с Esc и при смяна на страницата */
export function MobileNav({ departments, phone, phoneHref }: { departments: MenuDepartment[]; phone: string; phoneHref: string }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  const close = () => setOpen(false);

  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Отвори менюто"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center text-white"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Порталът изнася чекмеджето в <body>: backdrop-blur на хедъра иначе го затваря в 70px */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Меню">
            <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={close} />
            <div className="absolute inset-y-0 left-0 flex w-[min(88vw,380px)] flex-col overflow-y-auto bg-bg-deep shadow-2xl">
              <div className="flex h-[70px] flex-none items-center justify-between border-b border-line-soft px-4">
                <Logo />
                <button type="button" aria-label="Затвори менюто" onClick={close} className="flex h-10 w-10 items-center justify-center text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6 px-4 py-5">
                <SearchBox onNavigate={close} />

                <nav aria-label="Отдели">
                  <ul className="divide-y divide-line-soft">
                    {departments.map((d) => (
                      <li key={d.slug}>
                        <div className="flex items-center">
                          <Link href={d.href} onClick={close} className="h-display flex-1 py-3.5 text-[17px]">
                            {d.label}
                          </Link>
                          {d.subs.length > 0 && (
                            <button
                              type="button"
                              aria-label={`Подкатегории: ${d.label}`}
                              aria-expanded={expanded === d.slug}
                              onClick={() => setExpanded((x) => (x === d.slug ? null : d.slug))}
                              className="flex h-10 w-10 items-center justify-center text-muted"
                            >
                              <ChevronDown className={`h-5 w-5 transition-transform ${expanded === d.slug ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                        {expanded === d.slug && (
                          <ul className="space-y-2 pb-4 pl-3">
                            {d.subs.map((s) => (
                              <li key={s.href}>
                                <Link href={s.href} onClick={close} className="text-[15px] text-text">
                                  {s.label} <span className="text-[12px] text-dim">{s.count}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                    <li>
                      <Link href="/promocii" onClick={close} className="h-display block py-3.5 text-[17px] !text-accent-ink">
                        Промоции
                      </Link>
                    </li>
                  </ul>
                </nav>

                <div className="grid grid-cols-2 gap-2 text-[14px]">
                  <Link href="/zapitvane" onClick={close} className="flex items-center gap-2 bg-surface-2 p-3 text-white">
                    <MessageSquare className="h-4 w-4 text-accent-ink" /> Бързо запитване
                  </Link>
                  <Link href="/zapitvane?tema=nov-kompyutar" onClick={close} className="flex items-center gap-2 bg-surface-2 p-3 text-white">
                    <SlidersHorizontal className="h-4 w-4 text-accent-ink" /> Помощ при избор
                  </Link>
                  <Link href="/konfigurator" onClick={close} className="flex items-center gap-2 bg-surface-2 p-3 text-white">
                    <SlidersHorizontal className="h-4 w-4 text-accent-ink" /> Конфигуратор
                  </Link>
                  <Link href="/profil" onClick={close} className="flex items-center gap-2 bg-surface-2 p-3 text-white">
                    <User className="h-4 w-4 text-accent-ink" /> Моят профил
                  </Link>
                </div>

                <div>
                  <div className="mb-2 text-[12px] uppercase tracking-[1.5px] text-dim">Услуги</div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-[14px]">
                    {services.map((s) => (
                      <li key={s.label}>
                        <Link href={s.href} onClick={close} className="text-text">
                          {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <a href={phoneHref} className="btn btn-primary w-full">
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
                <Link href="/kontakti" onClick={close} className="block text-center text-[14px] text-muted">
                  Контакти
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

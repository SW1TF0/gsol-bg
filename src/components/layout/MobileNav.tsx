"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Phone, Search, X } from "lucide-react";
import { company, mainNav } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-label={open ? "Затвори менюто" : "Отвори менюто"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center text-white"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[70px] z-40 overflow-y-auto bg-bg-deep px-4 pb-10 pt-6">
          <form action="/tursene" role="search" className="relative mb-6" onSubmit={close}>
            <label htmlFor="mobile-search" className="sr-only">
              Търсене на продукт
            </label>
            <input id="mobile-search" name="q" type="search" placeholder="Продукт, модел, код…" className="input pl-10" />
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          </form>
          <nav aria-label="Мобилно меню">
            <ul className="divide-y divide-line-soft">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className="h-display block py-4 text-[18px]">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/promocii" onClick={close} className="h-display block py-4 text-[18px] !text-accent">
                  Промоции
                </Link>
              </li>
            </ul>
          </nav>
          <a href={company.phoneHref} className="btn btn-primary mt-8 w-full">
            <Phone className="h-4 w-4" />
            {company.phone}
          </a>
        </div>
      )}
    </div>
  );
}

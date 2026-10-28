import Link from "next/link";
import { Phone, Search, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CartButton } from "@/components/cart/CartButton";
import { MobileNav } from "./MobileNav";
import { company, mainNav } from "@/lib/site";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-black/90 shadow-[inset_0_2px_0_var(--color-accent)] backdrop-blur-sm">
      <div className="mx-auto flex h-[70px] max-w-[1400px] items-center gap-6 px-4 lg:px-6">
        <Logo />

        <nav aria-label="Основно меню" className="hidden xl:block">
          <ul className="flex items-center gap-6">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[14px] font-normal uppercase tracking-wide text-white transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/promocii"
                className="text-[14px] font-medium uppercase tracking-wide text-accent transition-colors hover:text-white"
              >
                Промоции
              </Link>
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <form action="/tursene" className="relative hidden md:block" role="search">
            <label htmlFor="header-search" className="sr-only">
              Търсене на продукт
            </label>
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder="Продукт, модел, код…"
              className="h-9 w-[220px] bg-surface-2 pl-9 pr-3 text-[14px] text-white ring-1 ring-line outline-none placeholder:text-dim focus:ring-accent lg:w-[260px]"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          </form>

          <a
            href={company.phoneHref}
            className="hidden items-center gap-2 whitespace-nowrap px-2 text-[14px] text-white transition-colors hover:text-accent 2xl:flex"
          >
            <Phone className="h-4 w-4 text-accent" strokeWidth={1.75} />
            {company.phone}
          </a>

          <Link
            href="/profil"
            aria-label="Моят профил"
            className="flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-accent"
          >
            <User className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <CartButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

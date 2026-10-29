import { Suspense } from "react";
import Link from "next/link";
import { Clock, MapPin, Menu, MessageSquare, Phone, Truck, User, Wrench } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CartButton } from "@/components/cart/CartButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getMenu } from "@/lib/catalog";
import { getCompany } from "@/lib/settings-data";
import { DepartmentsNav } from "./DepartmentsNav";
import { MobileNav } from "./MobileNav";
import { SearchBox } from "./SearchBox";

// Хедърът по документа на клиента: тъмна горна лента (телефон, часове, адрес), основен ред (лого,
// едър телефон до логото, търсачка, бързо запитване, профил, количка) и ред с отдели.
// Горната лента се скрива при скрол (sticky -top-8), останалото остава горе.

export async function Header() {
  const [company, menu] = await Promise.all([getCompany(), getMenu()]);
  return (
    <header className="sticky -top-8 z-50">
      <div className="h-8 border-b border-line-soft bg-bg-deep text-[12px] text-muted shadow-[inset_0_2px_0_var(--color-accent)]">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-4 px-4 lg:px-6">
          <a href={company.phoneHref} className="flex items-center gap-1.5 text-white hover:text-accent-ink">
            <Phone className="h-3.5 w-3.5 text-accent-ink" /> {company.phone}
          </a>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {company.hours}
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <MapPin className="h-3.5 w-3.5" /> {company.address}
          </span>
          <span className="ml-auto hidden items-center gap-5 min-[1020px]:flex">
            <span className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Доставка в цялата страна
            </span>
            <span className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Директен сервиз от GSOL
            </span>
          </span>
        </div>
      </div>

      <div className="bg-black/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[70px] max-w-[1400px] items-center gap-3 px-4 lg:gap-6 lg:px-6">
          <Suspense fallback={<MenuButtonPlaceholder />}>
            <MobileNav departments={menu.departments} phone={company.phone} phoneHref={company.phoneHref} />
          </Suspense>
          <Logo />

          {/* Телефонът е главният призив — едър, до логото */}
          <a href={company.phoneHref} className="group hidden items-center gap-3 min-[1180px]:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent transition-transform group-hover:scale-105">
              <Phone className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[18px] text-white">{company.phone}</span>
              <span className="block text-[11px] uppercase tracking-wide text-dim">{company.hours}</span>
            </span>
          </a>

          <SearchBox className="mx-auto hidden w-full max-w-[520px] flex-1 md:block" />

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link href="/zapitvane" className="btn btn-sm btn-ghost mr-1 hidden lg:inline-flex">
              <MessageSquare className="h-4 w-4" /> Бързо запитване
            </Link>
            <ThemeToggle />
            <Link
              href="/profil"
              aria-label="Моят профил"
              className="hidden h-10 w-10 items-center justify-center text-white transition-colors hover:text-accent-ink sm:flex"
            >
              <User className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <CartButton />
          </div>
        </div>
      </div>

      <div className="hidden border-y border-line-soft bg-black/95 backdrop-blur-sm lg:block">
        <Suspense fallback={<div className="h-11" />}>
          <DepartmentsNav departments={menu.departments} brands={menu.brands} />
        </Suspense>
      </div>
    </header>
  );
}

function MenuButtonPlaceholder() {
  return (
    <span className="flex h-10 w-10 items-center justify-center text-white lg:hidden" aria-hidden="true">
      <Menu className="h-6 w-6" />
    </span>
  );
}

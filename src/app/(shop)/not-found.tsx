import Link from "next/link";
import { Search } from "lucide-react";
import { Container } from "@/components/ui";

// 404 на български: търсене и пътища нататък, без витрина с продукти
const paths = [
  { href: "/magazin", label: "Магазин" },
  { href: "/izberi-reshenie", label: "Избери решение" },
  { href: "/pomosht", label: "Помощ" },
  { href: "/zapitvane", label: "Бързо запитване" },
  { href: "/kontakti", label: "Контакти" },
  { href: "/", label: "Начало" },
];

export default function NotFound() {
  return (
    <Container className="py-28 text-center">
      <p className="font-display text-[96px] leading-none text-accent-ink">404</p>
      <h1 className="h-display mt-4 text-[28px]">Страницата не е намерена</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted">
        Възможно е продуктът вече да не се предлага или адресът да е сгрешен. Потърсете или продължете оттук:
      </p>
      <form action="/tursene" role="search" className="relative mx-auto mt-8 max-w-md">
        <label htmlFor="nf-q" className="sr-only">
          Търсене
        </label>
        <input id="nf-q" name="q" type="search" placeholder="Продукт, компонент, модел" className="input !h-12 pl-11" />
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
      </form>
      <nav aria-label="Пътища нататък" className="mt-8 flex flex-wrap justify-center gap-2">
        {paths.map((p) => (
          <Link key={p.href} href={p.href} className="chip">
            {p.label}
          </Link>
        ))}
      </nav>
    </Container>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";

// „Услуги“ — текстът е от сегашния сайт; всяка услуга води към направлението си в „Кои сме ние“

export const metadata: Metadata = {
  title: "Услуги",
  description: "IT решения от избора до поддръжката: конфигурации, сервиз, мрежи, архивиране, бизнес IT поддръжка и автоматизация.",
};

const services = [
  { title: "Компютърни конфигурации", text: "Подбор, проверка за съвместимост, сглобяване, тест и готова за работа система.", href: "/za-gsol#gsol-store" },
  { title: "Сервиз и надграждане", text: "Диагностика, ремонт, профилактика, upgrade и оптимизация на съществуваща техника.", href: "/za-gsol#gsol-service" },
  { title: "Мрежи и свързаност", text: "LAN, Wi-Fi, защитен отдалечен достъп и надеждна мрежова среда за офис и обект.", href: "/za-gsol#gsol-network" },
  { title: "Архивиране и възстановяване", text: "Автоматични резервни копия, наблюдение и план за възстановяване при проблем.", href: "/za-gsol#gsol-backup" },
  { title: "Бизнес IT поддръжка", text: "Абонаментна грижа за работни станции, потребители, услуги и инфраструктура.", href: "/za-gsol#gsol-it-support" },
  { title: "Автоматизация и AI", text: "Практични автоматизации за повтарящи се процеси, информация и обслужване.", href: "/zapitvane?tema=drugo" },
];

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="IT решения"
        accent="от избора до поддръжката"
        tagline="Техника, системи и инфраструктура, изградени около начина, по който действително работите"
        crumbs={[{ label: "Услуги" }]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <h2 className="h-display text-[22px]">Една точка за техника и IT</h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <li key={s.title}>
              <Link href={s.href} className="cut-frame group block h-full hover:[--frame:var(--color-accent)]">
                <div className="cut-inner flex h-full flex-col gap-3 bg-surface-2 p-6">
                  <span className="font-display text-[13px] text-dim">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="h-display text-[18px] group-hover:text-accent-ink">{s.title}</h3>
                  <p className="text-[14px] text-muted">{s.text}</p>
                  <span className="mt-auto flex items-center gap-1.5 pt-2 font-display text-[12px] uppercase tracking-wide text-accent-ink">
                    Подробно <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <section className="cut-frame mt-14 [--frame:var(--color-accent)]">
          <div className="cut-inner flex flex-col gap-6 bg-gradient-to-br from-surface-2 to-accent/10 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="tagline">Имате конкретна задача?</p>
              <h2 className="h-display mt-2 text-[24px]">Нека я превърнем в работещо решение.</h2>
              <p className="mt-2 text-muted">Опишете целта, текущата среда и желания резултат. Ще върнем ясен следващ ход.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/zapitvane" className="btn btn-primary">
                Изпрати запитване
              </Link>
              <Link href="/magazin" className="btn btn-ghost">
                Разгледай магазина
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

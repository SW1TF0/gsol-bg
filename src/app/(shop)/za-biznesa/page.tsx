import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  Cctv,
  Cpu,
  Globe,
  Headphones,
  Landmark,
  Network,
  Phone,
  Receipt,
  Server,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { InquiryForm } from "@/components/InquiryForm";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { getCompany } from "@/lib/settings-data";

export const metadata: Metadata = {
  title: "За бизнеса",
  description:
    "Техника с фактура на фирма, IT поддръжка, мрежи, сървъри, архивиране и видеонаблюдение — от офертата до сервиза при GSOL.",
};

// Страницата за фирми, училища и детски градини. Само неща, които GSOL наистина прави — без измислени числа.

const services = [
  {
    icon: Headphones,
    title: "Външен IT отдел",
    text: "Помощ за служителите, компютрите, мрежата и сървърите — по заявка или по абонамент, с един човек за контакт.",
    href: "/zapitvane?tema=it",
  },
  {
    icon: Server,
    title: "Сървъри и клауд",
    text: "Споделени папки, имейл и достъп от разстояние — подредени така, че да не зависят от един компютър.",
    href: "/zapitvane?tema=it",
  },
  {
    icon: Archive,
    title: "Архивиране",
    text: "Резервни копия, на които може да се разчита — с проверено възстановяване, а не само „имаме архив“.",
    href: "/zapitvane?tema=it",
  },
  {
    icon: Network,
    title: "Мрежи",
    text: "Кабелна мрежа и Wi-Fi за офиса — проект, изграждане и настройка на рутери, суичове и принтери.",
    href: "/zapitvane?tema=it",
  },
  {
    icon: Cctv,
    title: "Видеонаблюдение",
    text: "Оглед, проект, монтаж и отдалечен достъп — камерите, записът и телефонът като една система.",
    href: "/zapitvane?tema=video",
  },
  {
    icon: Globe,
    title: "Уебсайтове",
    text: "Сайт за фирмата — от домейна и съдържанието до поддръжката след пускането.",
    href: "/zapitvane?tema=drugo",
  },
];

const steps = [
  ["Разговор", "Кратък разговор или безплатен IT преглед — разбираме как работи фирмата и какво ѝ пречи."],
  ["Оферта", "Цени, срок и какво включва — преди да решите. Фактура на фирма за всичко."],
  ["Изпълнение", "Доставка, инсталация и настройка — на място или от разстояние."],
  ["Поддръжка", "Един контакт за сервиз и въпроси и след това."],
];

const buying = [
  { icon: Receipt, title: "Фактура на фирма", text: "При поръчката избирате „Да — на фирма“: фирма, ЕИК/Булстат, ДДС № и МОЛ." },
  { icon: Landmark, title: "Банков превод", text: "Данните за превода идват с потвърждението. Наложен платеж — до законовия лимит." },
  { icon: BadgeCheck, title: "Цени с ДДС", text: "Всички цени са крайни, в евро. В режим „За бизнеса“ виждате и данъчната основа." },
  { icon: Cpu, title: "Сглобени и тествани", text: "Машините GSOL се сглобяват и тестват преди доставка. Windows се инсталира и настройва; лицензът не е включен." },
  { icon: Truck, title: "Доставка с Еконт", text: "До офис или адрес в цялата страна — товарителницата тръгва веднага след поръчката." },
  { icon: SlidersHorizontal, title: "По ваша мярка", text: "Конфигураторът проверява съвместимостта и показва цената веднага — или ни кажете задачата." },
];

export default async function BusinessPage() {
  const company = await getCompany();
  return (
    <>
      <PageHeader
        title="За"
        accent="бизнеса"
        tagline="Фирми, училища и детски градини · в цялата страна"
        crumbs={[{ label: "За бизнеса" }]}
      />

      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <section className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end" aria-labelledby="intro">
          <div>
            <h2 id="intro" className="h-display text-[28px] font-normal leading-tight sm:text-[36px]">
              Един доставчик за <span className="text-accent-ink">техниката и IT-то</span> на фирмата
            </h2>
            <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-muted">
              Компютри с фактура на фирма, поддръжка на служителите, мрежи, сървъри, архивиране и видеонаблюдение — от
              първия разговор до сервиза след това. Без прехвърляне между доставчици.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="#oferta" size="lg">
                Поискайте оферта
              </ButtonLink>
              <ButtonLink href="/it-pregled" variant="outline" size="lg">
                Безплатен IT преглед
              </ButtonLink>
            </div>
          </div>
          <a
            href={company.phoneHref}
            className="group cut-frame cut-lg hover:[--frame:var(--color-accent)]"
            aria-label={`Обадете се на ${company.phone}`}
          >
            <div className="cut-inner flex items-center gap-5 bg-gradient-to-br from-surface-2 from-40% to-accent/15 p-7">
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-accent text-on-accent transition-transform group-hover:scale-105">
                <Phone className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-[13px] uppercase tracking-wide text-dim">Директно с човек</span>
                <span className="block font-display text-[26px] text-white">{company.phone}</span>
                <span className="block text-[13px] text-muted">{company.hours}</span>
              </span>
            </div>
          </a>
        </section>

        <section className="mt-20" aria-labelledby="uslugi-title" id="uslugi">
          <Eyebrow>Какво поемаме</Eyebrow>
          <h2 id="uslugi-title" className="h-display mt-2 text-[26px] font-normal">
            IT за фирмата — <span className="text-accent-ink">на едно място</span>
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ icon: Icon, title, text, href }) => (
              <Link key={title} href={href} className="group cut-frame cut-lg [--frame:var(--color-line-soft)] hover:[--frame:var(--color-accent)]">
                <div className="cut-inner flex h-full flex-col bg-gradient-to-br from-transparent from-50% to-accent/10 p-7">
                  <Icon className="h-8 w-8 text-accent-ink transition-transform group-hover:-translate-y-0.5" strokeWidth={1.5} />
                  <h3 className="h-display mt-5 text-[19px] font-normal group-hover:text-accent-ink">{title}</h3>
                  <p className="mt-3 flex-1 text-[15px] text-muted">{text}</p>
                  <span className="mt-5 flex items-center gap-2 font-display text-[12px] uppercase tracking-wide text-accent-ink">
                    Запитване <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20" aria-labelledby="kak">
          <Eyebrow>Как работим</Eyebrow>
          <h2 id="kak" className="h-display mt-2 text-[26px] font-normal">
            От разговора до <span className="text-accent-ink">поддръжката</span>
          </h2>
          <ol className="mt-8 grid gap-px bg-line-soft sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, text], i) => (
              <li key={title} className="bg-bg p-6">
                <span className="font-display text-[32px] leading-none text-accent-ink">0{i + 1}</span>
                <div className="mt-4 text-[17px] text-white">{title}</div>
                <p className="mt-2 text-[14px] text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20" aria-labelledby="pokupki">
          <Eyebrow>Покупки за фирмата</Eyebrow>
          <h2 id="pokupki" className="h-display mt-2 text-[26px] font-normal">
            Поръчка като за <span className="text-accent-ink">счетоводството</span>
          </h2>
          <dl className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {buying.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <Icon className="mt-0.5 h-6 w-6 flex-none text-accent-ink" strokeWidth={1.5} />
                <div>
                  <dt className="text-[16px] text-white">{title}</dt>
                  <dd className="mt-1 text-[14px] text-muted">{text}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/katalog/kompyutri" variant="outline">
              Компютри GSOL
            </ButtonLink>
            <ButtonLink href="/konfigurator" variant="outline">
              Конфигуратор
            </ButtonLink>
          </div>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.2fr]" aria-labelledby="oferta-title" id="oferta">
          <div>
            <Eyebrow>Запитване</Eyebrow>
            <h2 id="oferta-title" className="h-display mt-2 text-[26px] font-normal">
              Кажете какво ви <span className="text-accent-ink">трябва</span>
            </h2>
            <p className="mt-4 text-muted">
              Техника за няколко работни места, поддръжка, мрежа или камери — опишете задачата с няколко изречения.
              Човек от екипа се връща с въпроси или с оферта.
            </p>
            <ul className="mt-6 space-y-2.5 text-[14px] text-muted">
              <li>Колко души и устройства има фирмата</li>
              <li>В кой град сте (и дали има още обекти)</li>
              <li>Какво ви пречи сега или какво искате да постигнете</li>
            </ul>
            <p className="mt-6 text-[14px] text-muted">
              Предпочитате разговор?{" "}
              <a href={company.phoneHref} className="text-white hover:text-accent-ink">
                {company.phone}
              </a>
            </p>
          </div>
          <InquiryForm defaultTopic="it" messageLabel="Какво ви трябва" submitLabel="Изпрати към GSOL" />
        </section>
      </div>
    </>
  );
}

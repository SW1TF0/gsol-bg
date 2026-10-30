import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { getCompany } from "@/lib/settings-data";

// „Кои сме ние“ — текстът е от сегашния сайт; всяко от деветте направления е с котвата от стария адрес
// (/za-gsol#gsol-service и т.н.), за да работят връзките от статиите, футъра и рекламите.

export const metadata: Metadata = {
  title: "Кои сме ние",
  description: "GSOL — онлайн магазин, конфигурации, собствен сервиз, IT поддръжка за фирми, мрежи, сървъри, архивиране, видеонаблюдение и уебсайтове.",
};

type Direction = {
  id: string;
  label: string;
  title: string;
  lead: string;
  points: [string, string][];
  note: string;
  cta: { label: string; href: string };
};

const directions: Direction[] = [
  {
    id: "gsol-store",
    label: "Онлайн магазин и конфигуратор",
    title: "Избирате по цел. Получавате машина, готова за работа.",
    lead: "Не продаваме случаен сбор от части. Всяка GSOL конфигурация е проверена за съвместимост, охлаждане, захранване, стабилност и бъдещо надграждане. Виждате важното още преди покупката.",
    points: [
      ["Преди поръчка", "Всеки компонент е видим"],
      ["Преди доставка", "Сглобяване и тест под товар"],
      ["Включена инсталация", "Безплатна инсталация на Windows · без включен лиценз"],
    ],
    note: "Желаете различен компонент? Изпратете запитване, а GSOL ще провери съвместимостта, цената и срока.",
    cta: { label: "Изберете конфигурация", href: "/katalog/kompyutri" },
  },
  {
    id: "gsol-it-support",
    label: "Външен IT отдел",
    title: "Вашият IT отдел, без да изграждате такъв от нулата.",
    lead: "Поемаме ежедневната техническа грижа за хората, устройствата и системите. Получавате договорен обхват, ясна отговорност и екип, който познава средата ви преди да възникне проблем.",
    points: [
      ["Хора", "Бърза помощ за служителите"],
      ["Устройства", "Работни станции под контрол"],
      ["Системи", "Наблюдение и профилактика"],
    ],
    note: "Един партньор поема случая докрай, без прехвърляне между различни доставчици.",
    cta: { label: "Обсъдете IT поддръжката", href: "/zapitvane?tema=it" },
  },
  {
    id: "gsol-infrastructure",
    label: "Сървъри и клауд",
    title: "Системи, които растат с бизнеса, а не го задържат.",
    lead: "Проектираме физическа, виртуална или хибридна среда според приложенията, достъпа, защитата и плановете ви за развитие. Получавате работеща архитектура, а не излишен капацитет.",
    points: [
      ["Основа", "Физически и виртуални сървъри"],
      ["Достъп", "Частен клауд и отдалечена работа"],
      ["Контрол", "Наблюдение и планиране"],
    ],
    note: "Ясен проект, миграция, пускане и последваща поддръжка от един екип.",
    cta: { label: "Поискайте инфраструктурно решение", href: "/zapitvane?tema=it" },
  },
  {
    id: "gsol-backup",
    label: "Архивиране и киберсигурност",
    title: "Файловете ви не трябва да изчезнат заедно с атакуваната система.",
    lead: "Архивът има стойност само ако остава недостъпен за атаката и може реално да върне бизнеса в работа. GSOL изгражда, наблюдава и проверява отделен слой за възстановяване извън продукционната среда.",
    points: [
      ["1. Инцидент", "Локалната среда е криптирана — засегнати са системите и достъпните локални копия."],
      ["2. Защита", "Отделният архив остава чист — различна геолокация и контролиран достъп."],
      ["3. Възстановяване", "Бизнесът отново работи — критичните данни и системите се връщат по план."],
    ],
    note: "Реален пример от нашата работа: криптовирусът спря локалната среда, а защитеният архив на отделна геолокация остана чист. Екипът ни възстанови критичните данни и работата на компанията още същия ден. Копие в същата мрежа не е достатъчно, ако атаката има достъп и до него.",
    cta: { label: "Проверете защитата на данните си", href: "/zapitvane?tema=it" },
  },
  {
    id: "gsol-security",
    label: "Видеонаблюдение",
    title: "Виждате какво се случва. Записът е там, когато ви потрябва.",
    lead: "Започваме с оглед на обекта и реалните рискови точки. След това проектираме, монтираме и настройваме система, която дава полезен образ, надежден запис и защитен отдалечен достъп.",
    points: [
      ["Преди монтажа", "Оглед и правилно покритие"],
      ["След събитието", "Надежден запис и архив"],
      ["Всеки ден", "Защитен отдалечен достъп"],
    ],
    note: "Камерите, записът, мрежата и поддръжката се планират като една цялостна система.",
    cta: { label: "Заявете оглед на обекта", href: "/zapitvane?tema=video" },
  },
  {
    id: "gsol-web",
    label: "Уебсайтове и хостинг",
    title: "Сайтът ви трябва да работи за бизнеса, не просто да присъства онлайн.",
    lead: "Изграждаме ясни бизнес сайтове и онлайн магазини, поддържаме ги технически и ги хостваме върху собствена инфраструктура. Не координирате дизайнери, хостинг и поддръжка поотделно.",
    points: [
      ["Представяне", "Бизнес сайтове с ясна цел"],
      ["Продажби", "Онлайн магазини и интеграции"],
      ["След старта", "Хостинг, защита и обновяване"],
    ],
    note: "Един екип отговаря за скоростта, сигурността и развитието на проекта.",
    cta: { label: "Обсъдете уеб проекта си", href: "/zapitvane?tema=drugo" },
  },
  {
    id: "gsol-network",
    label: "Мрежи и свързаност",
    title: "Бърза и защитена мрежа, за която не се налага да мислите.",
    lead: "Изграждаме кабелна и безжична основа за офиси, обекти, сървъри, камери и отдалечена работа. Планираме покритие, капацитет и сигурност преди да започне монтажът.",
    points: [
      ["Основа", "Структурно окабеляване"],
      ["Покритие", "Стабилен бизнес Wi-Fi"],
      ["Защита", "Сегментация, VPN и контрол"],
    ],
    note: "Документирана, измерена и подготвена за бъдещо разширяване мрежа.",
    cta: { label: "Поискайте мрежов проект", href: "/zapitvane?tema=it" },
  },
  {
    id: "gsol-service",
    label: "Сервиз и профилактика",
    title: "Проблемът не чака. И ние не чакаме.",
    lead: "Диагностицираме причината, обясняваме възможностите и извършваме ремонта с ясна обратна връзка. Работим с компютри, лаптопи, работни станции и печатна техника.",
    points: [
      ["Първо", "Точна диагностика"],
      ["След това", "Ремонт и надграждане"],
      ["Преди предаване", "Профилактика и тест"],
    ],
    note: "Знаете какъв е проблемът, какво предлагаме и какво ще струва преди изпълнението.",
    cta: { label: "Заявете сервиз", href: "/zapitvane?tema=servis" },
  },
  {
    id: "gsol-print",
    label: "Печат и консумативи",
    title: "Предвидим печат, без ежедневни прекъсвания.",
    lead: "Подбираме правилното устройство, доставяме консумативите и поддържаме техниката. Така домът, офисът или организацията имат ясна цена и една връзка при нужда.",
    points: [
      ["Техника", "Принтери и мултифункционални устройства"],
      ["Консумативи", "Тонери, мастила и барабани"],
      ["Поддръжка", "Зареждане, ремонт и профилактика"],
    ],
    note: "Получавате подходящ продукт и сервизна грижа от един партньор.",
    cta: { label: "Поискайте оферта за печат", href: "/zapitvane?tema=drugo" },
  },
];

export default async function AboutPage() {
  const company = await getCompany();
  return (
    <>
      <PageHeader
        title="Вашата технология."
        accent="Нашата отговорност."
        tagline="От правилния продукт до цялостната инфраструктура — GSOL планира, изгражда и поддържа решения според реалните ви нужди"
        crumbs={[{ label: "Кои сме ние" }]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4 text-[16px] text-muted">
            <p className="tagline">{company.legalName}</p>
            <h2 className="h-display text-[26px]">Повече от техника. Един отговорен технологичен партньор.</h2>
            <p>
              GSOL обединява онлайн магазин, професионално конфигуриране, собствен сервиз, бизнес IT поддръжка, мрежи,
              сървъри, клауд, архивиране, системи за сигурност и видеонаблюдение.
            </p>
            <p>
              Изграждаме и поддържаме уебсайтове върху собствена хостинг инфраструктура, така че клиентът да има една
              ясна връзка за техниката, услугите и сигурната работа онлайн. Първо разбираме задачата. После предлагаме
              решение с ясен обхват, цена и следваща стъпка.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a href={company.phoneHref} className="cut-frame [--frame:var(--color-accent)]">
              <span className="cut-inner flex flex-col bg-accent/10 p-5">
                <span className="text-[12px] uppercase tracking-wide text-muted">Обадете се</span>
                <span className="font-display text-[24px] text-white">{company.phone}</span>
              </span>
            </a>
            <Link href="#gsol-it-support" className="flex flex-col bg-surface-2 p-5 ring-1 ring-line-soft hover:ring-accent">
              <span className="text-[12px] uppercase tracking-wide text-muted">Най-търсено</span>
              <span className="text-[17px] text-white">IT поддръжка за фирми</span>
            </Link>
            <Link href="/magazin" className="flex flex-col bg-surface-2 p-5 ring-1 ring-line-soft hover:ring-accent">
              <span className="text-[12px] uppercase tracking-wide text-muted">Онлайн</span>
              <span className="text-[17px] text-white">Магазин за техника</span>
            </Link>
          </div>
        </section>

        <section className="mt-16">
          <p className="tagline">Направления</p>
          <h2 className="h-display mt-2 text-[24px]">Една компания. Отделни експертни звена.</h2>
          <nav aria-label="Направления" className="mt-6 flex flex-wrap gap-2">
            {directions.map((d) => (
              <Link key={d.id} href={`#${d.id}`} className="chip">
                {d.label}
              </Link>
            ))}
          </nav>
        </section>

        <div className="mt-12 space-y-8">
          {directions.map((d, i) => (
            <section
              key={d.id}
              id={d.id}
              className="scroll-mt-[calc(var(--header-sticky)+16px)] grid gap-8 bg-surface-2 p-6 ring-1 ring-line-soft md:p-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
            >
              <div>
                <p className="flex items-center gap-2 font-display text-[13px] uppercase tracking-wide text-accent-ink">
                  <span className="text-dim">{String(i + 1).padStart(2, "0")}</span> {d.label}
                </p>
                <h3 className="h-display mt-3 text-[24px]">{d.title}</h3>
                <p className="mt-4 text-muted">{d.lead}</p>
                <p className="mt-4 text-[14px] text-text">{d.note}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={d.cta.href} className="btn btn-sm btn-primary">
                    {d.cta.label} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a href={company.phoneHref} className="btn btn-sm btn-ghost">
                    <Phone className="h-4 w-4" /> {company.phone}
                  </a>
                </div>
              </div>
              <ul className="space-y-3">
                {d.points.map(([k, v]) => (
                  <li key={k} className="border-l-2 border-accent bg-bg-deep/50 px-4 py-3">
                    <span className="block text-[12px] uppercase tracking-wide text-dim">{k}</span>
                    <span className="text-[15px] text-white">{v}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

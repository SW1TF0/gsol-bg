import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Cctv,
  ChevronsDown,
  Cpu,
  FileText,
  Gauge,
  Headphones,
  Laptop,
  MessageSquare,
  Monitor,
  Phone,
  Recycle,
  ShieldCheck,
  Ticket,
  Wrench,
} from "lucide-react";
import { ButtonLink, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { ConfigTabs } from "@/components/home/ConfigTabs";
import { ProductCard, ProductGrid } from "@/components/product/ProductCard";
import {
  countByCategory,
  getCollection,
  getConfigsByTier,
  getPromoProducts,
  tierInfo,
  type Tier,
} from "@/lib/catalog";
import { listRaffles } from "@/lib/raffle-data";
import { getCompany } from "@/lib/settings-data";

export default async function HomePage() {
  const [promos, configs, gaming, budget, counts, raffles] = await Promise.all([
    getPromoProducts(10),
    getConfigsByTier(),
    getCollection("gaming-laptops", 4),
    getCollection("budget-laptops", 4),
    countByCategory(),
    listRaffles(),
  ]);
  const activeRaffle = raffles.find((r) => r.status === "active");

  const tierData = Object.fromEntries(
    (Object.keys(tierInfo) as Tier[]).map((t) => [
      t,
      {
        name: tierInfo[t].name,
        blurb: tierInfo[t].blurb,
        products: configs[t],
        from: configs[t].length ? Math.min(...configs[t].map((p) => p.price)) : null,
      },
    ]),
  ) as Record<Tier, { name: string; blurb: string; products: typeof promos; from: number | null }>;

  return (
    <>
      <Hero />
      <BusinessPaths />
      <PromoStrip products={promos} />
      {activeRaffle && <RaffleBanner raffle={activeRaffle} />}

      {/* Категории */}
      <section className="bg-gradient-to-b from-bg-alt to-bg-deep py-24 [--section-bg:var(--color-bg-alt)]">
        <Container>
          <SectionHeading title="Какво" accent="търсите?" tagline="Изберете категория или ни питайте директно" />
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              { href: "/katalog/laptopi", label: "Лаптопи", icon: Laptop, count: counts.laptopi },
              { href: "/katalog/kompyutri", label: "Гейминг компютри", icon: Cpu, count: counts.kompyutri },
              { href: "/katalog/komponenti", label: "Компоненти", icon: Gauge, count: counts.komponenti },
              { href: "/katalog/periferiya", label: "Периферия", icon: Monitor, count: counts.periferiya },
              { href: "/katalog/renovirani", label: "Реновирани", icon: Recycle, count: counts.renovirani },
              { href: "/#uslugi", label: "Сервиз и услуги", icon: Wrench },
            ].map(({ href, label, icon: Icon, count }) => (
              <Link key={label} href={href} className="cut-frame cut-sm group hover:[--frame:var(--color-accent)]">
                <div className="cut-inner flex flex-col items-start gap-6 bg-gradient-to-br from-transparent from-50% to-accent/10 p-5">
                  <Icon className="h-8 w-8 text-accent-ink" strokeWidth={1.5} />
                  <div>
                    <div className="h-display text-[16px] group-hover:text-accent-ink">{label}</div>
                    <div className="mt-1 text-[12px] text-dim">{count ? `${count} продукта` : "Запитване за минута"}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Конфигурации */}
      <section className="py-24 [--section-bg:var(--color-bg)]">
        <Container>
          <SectionHeading title="GSOL" accent="конфигурации" tagline="Сглобени и тествани под натоварване" />
          <div className="mt-12">
            <ConfigTabs data={tierData} />
          </div>
        </Container>
      </section>

      {/* Защо GSOL */}
      <section className="pb-24">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BadgeCheck,
                title: "Windows настройка",
                text: "Безплатна инсталация и начална настройка за компютри и лаптопи от GSOL. Лицензът не е включен.",
              },
              {
                icon: Gauge,
                title: "Сглобяване и тест",
                text: "Всяка конфигурация минава тест под натоварване, преди да бъде предадена или изпратена.",
              },
              {
                icon: ShieldCheck,
                title: "Собствен сервиз",
                text: "Законова гаранция и директна диагностика. Една точка за контакт от покупката до ремонта.",
              },
              {
                icon: Phone,
                title: "Потвърждение от човек",
                text: "Преди изпълнение потвърждаваме наличността, срока и важните детайли по телефон или имейл.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="cut-frame cut-lg [--frame:var(--color-line-soft)]">
                <div className="cut-inner bg-gradient-to-br from-transparent from-50% to-accent/10 p-8">
                  <Icon className="h-8 w-8 text-accent-ink" strokeWidth={1.5} />
                  <h3 className="h-display mt-6 text-[20px] font-normal">{title}</h3>
                  <p className="mt-3 text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Колекции */}
      <section className="bg-bg-alt py-24 [--section-bg:var(--color-bg-alt)]">
        <Container className="space-y-20">
          <Collection
            eyebrow="Гейминг на добра цена"
            title="Достъпни гейминг лаптопи"
            text="ASUS TUF, Gigabyte, Lenovo LOQ, Acer Nitro и още — по-достъпните модели са отпред."
            href="/katalog/laptopi?sub=geiming-laptopi&sort=price-asc"
            products={gaming}
          />
          <Collection
            eyebrow="За работа и всеки ден"
            title="Лаптопи около 500–600 €"
            text="Налични модели за офис, обучение и ежедневна работа, подредени по цена."
            href="/katalog/laptopi?range=0&sort=price-asc"
            products={budget}
          />
        </Container>
      </section>

      <BusinessBanner />
      <Services />
      <CtaBand />
    </>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-var(--header-h))] items-end overflow-hidden bg-bg-deep">
      {/* Фон: решетка, червено сияние и голям контурен знак */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--color-white) 4%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-white) 4%, transparent) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[38%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[140px]"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 40 40"
        className="absolute left-1/2 top-[40%] h-[min(70vw,560px)] w-[min(70vw,560px)] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg]"
      >
        <path
          d="M12 2 2 12v26h26l10-10V2H12Z"
          style={{ fill: "var(--color-surface-2)", stroke: "color-mix(in srgb, var(--color-white) 18%, transparent)" }}
          strokeWidth=".18"
        />
        <path
          d="M15 11h15v5H17l-2 2v6l2 2h8v-4h-5v-4h10v13H14l-5-5V16l6-5Z"
          style={{ fill: "var(--color-bg-deep)", stroke: "color-mix(in srgb, var(--color-accent) 55%, transparent)" }}
          strokeWidth=".15"
        />
      </svg>
      {/* За бизнеса: по-едра решетка като чертеж */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden opacity-40 business:block"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--color-accent) 22%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 22%, transparent) 1px, transparent 1px)",
          backgroundSize: "112px 112px",
        }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-bg-deep from-15% to-transparent to-60%" />

      <Container className="relative z-10 pb-14 text-center">
        <div className="business:hidden">
          <h1 className="h-display mx-auto max-w-4xl text-[34px] sm:text-[48px]">
            <span className="text-accent-ink">Сигурният избор</span> за техника и IT
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-[18px]">
            Лаптопи, гейминг компютри и компоненти — подбрани, сглобени и тествани от GSOL. Собствен сервиз и IT
            поддръжка за дома и бизнеса.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/katalog/kompyutri" size="lg">
              Разгледай магазина
            </ButtonLink>
            <ButtonLink href="/zapitvane" variant="outline" size="lg" className="[--section-bg:var(--color-bg-deep)]">
              Бързо запитване
            </ButtonLink>
          </div>
        </div>
        <div className="hidden business:block">
          <p className="tagline">За фирми, училища и детски градини</p>
          <h1 className="h-display mx-auto mt-3 max-w-4xl text-[34px] sm:text-[48px]">
            <span className="text-accent-ink">IT партньор</span> за вашия бизнес
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-[18px]">
            Компютри и техника с фактура на фирма, IT поддръжка, мрежи, сървъри и видеонаблюдение — от офертата до
            сервиза при един доставчик.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/it-pregled" size="lg">
              Безплатен IT преглед
            </ButtonLink>
            <ButtonLink href="/zapitvane?tema=nov-kompyutar" variant="outline" size="lg" className="[--section-bg:var(--color-bg-deep)]">
              Фирмена оферта
            </ButtonLink>
          </div>
        </div>
        <a href="#promo" aria-label="Надолу към промоциите" className="mt-12 inline-block text-accent-ink">
          <ChevronsDown className="animate-bob h-8 w-8" strokeWidth={1.5} />
        </a>
      </Container>
    </section>
  );
}

/** Само в режим „за бизнеса“: четирите пътя за фирмите веднага под началото */
function BusinessPaths() {
  const items = [
    {
      icon: Headphones,
      title: "IT поддръжка",
      text: "Помощ за служителите, работни станции, мрежа и сървъри — по заявка или по абонамент.",
      href: "/zapitvane?tema=it",
    },
    {
      icon: Building2,
      title: "Безплатен IT преглед",
      text: "Разбираме какво имате и от какво имате нужда, преди да предложим нещо.",
      href: "/it-pregled",
    },
    {
      icon: FileText,
      title: "Фирмена оферта",
      text: "Кажете какво ви трябва — пращаме оферта с цени и срок. Фактура на фирма за всяка поръчка.",
      href: "/zapitvane?tema=nov-kompyutar",
    },
    {
      icon: Cctv,
      title: "Видеонаблюдение",
      text: "Оглед, проект, монтаж и отдалечен достъп — като една система.",
      href: "/zapitvane?tema=video",
    },
  ];
  return (
    <section className="hidden bg-bg-deep pb-20 pt-6 business:block [--section-bg:var(--color-bg-deep)]">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text, href }) => (
            <Link key={title} href={href} className="cut-frame cut-sm group hover:[--frame:var(--color-accent)]">
              <div className="cut-inner flex h-full flex-col gap-4 bg-gradient-to-br from-surface-2 from-40% to-accent/10 p-6">
                <Icon className="h-8 w-8 text-accent-ink" strokeWidth={1.5} />
                <div className="h-display text-[17px] group-hover:text-accent-ink">{title}</div>
                <p className="text-[14px] text-muted">{text}</p>
                <span className="mt-auto flex items-center gap-2 font-display text-[12px] uppercase tracking-wide text-accent-ink">
                  Напред <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function PromoStrip({ products }: { products: Awaited<ReturnType<typeof getPromoProducts>> }) {
  // Статична лента: собственикът не иска движещи се банери
  const words = ["Промоции", "Ограничени оферти", "До изчерпване", "Промо кодове", "Томболи"];
  return (
    <section id="promo" className="scroll-mt-[var(--header-sticky)] bg-bg-deep pb-20">
      <div className="overflow-hidden bg-accent py-2.5" aria-hidden="true">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-1 px-4 font-display text-[13px] uppercase tracking-[1.5px] text-white">
          {words.map((w, i) => (
            <span key={w} className="flex items-center gap-8">
              {i > 0 && <span className="opacity-60">◆</span>}
              {w}
            </span>
          ))}
        </div>
      </div>

      <Container className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading title="Актуални" accent="промоции" tagline="Реални цени и наличност" align="left" />
          <ButtonLink href="/promocii" variant="outline" size="sm" className="[--section-bg:var(--color-bg-deep)]">
            Всички промоции
          </ButtonLink>
        </div>
        <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
          {products.map((p) => (
            <div key={p.id} className="w-[260px] flex-none snap-start">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function RaffleBanner({ raffle }: { raffle: Awaited<ReturnType<typeof listRaffles>>[number] }) {
  const prizes = raffle.raffle_prizes;
  return (
    <section className="bg-bg-deep pb-20 [--section-bg:var(--color-bg-deep)]">
      <Container>
        <Link href={`/tomboli/${raffle.slug}`} className="cut-frame cut-lg group block hover:[--frame:var(--color-accent)]">
          <div className="cut-inner relative grid items-center gap-6 overflow-hidden bg-gradient-to-r from-accent/25 via-surface-2 to-surface-2 p-8 md:grid-cols-[auto_1fr_auto] md:p-10">
            <Ticket className="h-14 w-14 text-accent-ink" strokeWidth={1.25} />
            <div>
              <Eyebrow>Томбола</Eyebrow>
              <h2 className="h-display mt-2 text-[26px] group-hover:text-accent-ink">{raffle.title}</h2>
              <p className="mt-2 text-muted">
                {raffle.intro ?? "Всяка потвърдена поръчка ви носи участия."}
                {prizes.length > 0 && <> Награди: {prizes.map((p) => p.title).join(", ")}.</>}
              </p>
            </div>
            <span className="btn btn-primary">Виж томболата</span>
          </div>
        </Link>
      </Container>
    </section>
  );
}

function Collection({
  eyebrow,
  title,
  text,
  href,
  products,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  products: Awaited<ReturnType<typeof getCollection>>;
}) {
  if (!products.length) return null;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="h-display mt-2 text-[26px] font-normal">{title}</h2>
          <p className="mt-2 text-muted">{text}</p>
        </div>
        <Link href={href} className="flex items-center gap-2 font-display text-[13px] uppercase tracking-wide text-white hover:text-accent-ink">
          Виж всички <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}

function BusinessBanner() {
  return (
    <section className="relative overflow-hidden bg-black py-28 [--section-bg:var(--color-black)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 40%), radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--color-white) 6%, transparent), transparent 45%), repeating-linear-gradient(115deg, color-mix(in srgb, var(--color-white) 3%, transparent) 0 2px, transparent 2px 22px)",
        }}
      />
      <Container className="relative text-center">
        <Building2 className="mx-auto h-10 w-10 text-accent-ink" strokeWidth={1.25} />
        <div className="mt-6">
          <SectionHeading title="GSOL за" accent="бизнеса" tagline="Вашият IT отдел, без да назначавате цял екип" />
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-muted">
          Поемаме ежедневната поддръжка на хора и устройства, мрежата, сървърите и архивите под една ясна отговорност.
          Започнете с безплатен 20-минутен IT преглед.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/it-pregled" variant="outline">
            Заяви IT преглед
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}

function Services() {
  const items = [
    {
      eyebrow: "Нещо не работи?",
      title: "Сервиз и профилактика",
      text: "Диагностика, ремонт, почистване, смяна на паста и вентилатори, преинсталация и надграждане на компютри и лаптопи. Не е нужно да знаете причината — това е наша работа.",
      icon: Wrench,
      href: "/zapitvane?tema=servis",
      cta: "Заяви ремонт",
    },
    {
      eyebrow: "За фирми",
      title: "IT поддръжка",
      text: "Помощ за служителите, работни станции под контрол, мрежа, сървъри и архивиране. По единична заявка или по абонамент с договорен обхват.",
      icon: Headphones,
      href: "/zapitvane?tema=it",
      cta: "Обсъди поддръжка",
    },
    {
      eyebrow: "Видимост и контрол",
      title: "Видеонаблюдение",
      text: "Оглед на обекта, проектиране, монтаж и настройка на IP камери, запис и защитен отдалечен достъп — като една цялостна система.",
      icon: Cctv,
      href: "/zapitvane?tema=video",
      cta: "Заяви оглед",
    },
  ];
  return (
    <section id="uslugi" className="scroll-mt-[var(--header-sticky)] bg-bg-alt py-24 [--section-bg:var(--color-bg-alt)]">
      <Container>
        <SectionHeading title="Услуги" accent="GSOL" tagline="Когато не търсите продукт, а решение" />
        <div className="mt-16 space-y-16">
          {items.map(({ eyebrow, title, text, icon: Icon, href, cta }, i) => (
            <div key={title} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div
                className="relative flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-surface to-bg-deep"
                style={{ clipPath: "polygon(0 101%, 14% 22%, 33% -1px, 100% -1px, 86% 78%, 67% 101%)" }}
              >
                <Icon className="h-24 w-24 text-accent-ink/80" strokeWidth={1} />
              </div>
              <div>
                <Eyebrow>{eyebrow}</Eyebrow>
                <h3 className="h-display mt-2 text-[26px] font-normal">{title}</h3>
                <p className="mt-4 max-w-lg text-muted">{text}</p>
                <ButtonLink href={href} variant="outline" size="sm" className="mt-6">
                  {cta}
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

async function CtaBand() {
  const company = await getCompany();
  return (
    <section className="bg-accent py-16 text-center">
      <Container>
        <h2 className="h-display text-[28px] sm:text-[36px]">Имате задача, а не списък за пазаруване?</h2>
        <p className="tagline mt-2 !text-white/80">Кажете ни какво трябва да постигнете</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={company.phoneHref} className="btn btn-lg bg-black text-white hover:bg-line-soft">
            <Phone className="h-5 w-5" /> {company.phone}
          </a>
          <Link href="/zapitvane" className="btn btn-lg bg-white !text-black hover:bg-white/90">
            <MessageSquare className="h-5 w-5" /> Изпрати запитване
          </Link>
        </div>
        <p className="mt-6 text-[13px] text-white/80">
          {company.hours} · Отговор от човек в работно време · Онлайн поръчки 24/7
        </p>
      </Container>
    </section>
  );
}

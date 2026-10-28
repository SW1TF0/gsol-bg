import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Gauge, Phone, ShieldCheck, Truck, Wallet } from "lucide-react";
import { BuyBox } from "@/components/cart/AddToCart";
import { PageHeader } from "@/components/catalog/PageHeader";
import { Gallery } from "@/components/product/Gallery";
import { PriceBlock, ProductBadge, ProductGrid } from "@/components/product/ProductCard";
import { Container, Eyebrow } from "@/components/ui";
import { getAllSlugs, getCategory, getProduct, getRelated, tierInfo } from "@/lib/catalog";
import { company } from "@/lib/site";

export async function generateStaticParams() {
  return (await getAllSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/produkt/[slug]">): Promise<Metadata> {
  const product = await getProduct((await props.params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.summary || `${product.name} — крайна цена с ДДС, наличност и доставка от GSOL.`,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default function ProductPage(props: PageProps<"/produkt/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetails params={props.params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <Container className="grid gap-10 py-24 lg:grid-cols-2" aria-busy="true">
      <div className="aspect-square animate-pulse bg-surface-2" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 animate-pulse bg-surface-2" />
        <div className="h-8 w-1/2 animate-pulse bg-surface-2" />
        <div className="h-24 animate-pulse bg-surface-2" />
      </div>
    </Container>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/produkt/[slug]">, "params">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const category = getCategory(product.category);
  const sub = category?.subcategories.find((s) => s.slug === product.subcategory);
  const related = await getRelated(product, 4);

  return (
    <>
      <PageHeader
        title=""
        crumbs={[
          ...(category ? [{ label: category.name, href: `/katalog/${category.slug}` }] : []),
          ...(category && sub ? [{ label: sub.name, href: `/katalog/${category.slug}?sub=${sub.slug}` }] : []),
          { label: product.brand },
        ]}
      />

      <Container className="pb-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Gallery images={product.images} alt={product.name} />

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <ProductBadge product={product} />
              <span className="text-[12px] uppercase tracking-[1.5px] text-dim">Код: {product.sku}</span>
            </div>
            <Eyebrow>{product.tier ? tierInfo[product.tier].name : product.brand}</Eyebrow>
            <h1 className="mt-3 text-[20px] font-medium leading-snug text-white sm:text-[24px]">
              {product.name}
            </h1>
            {product.summary && product.summary !== product.name && (
              <p className="mt-3 text-muted">{product.summary}</p>
            )}

            {product.components && (
              <dl className="mt-6 grid grid-cols-[56px_1fr] gap-x-3 gap-y-2 bg-surface-2 p-5 text-[14px]">
                <dt className="font-display text-accent">CPU</dt>
                <dd className="text-white">{product.components.cpu}</dd>
                <dt className="font-display text-accent">GPU</dt>
                <dd className="text-white">{product.components.gpu}</dd>
                <dt className="font-display text-accent">Кутия</dt>
                <dd className="text-white">{product.components.case}</dd>
              </dl>
            )}

            <div className="mt-8 border-y border-line-soft py-6">
              <PriceBlock product={product} size="lg" />
              <p className="mt-2 text-[13px] text-muted">Възможност за индивидуална фирмена оферта</p>
            </div>

            <ul className="mt-6 space-y-2.5 text-[14px]">
              <li className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 flex-none text-accent" strokeWidth={1.75} />
                <span>
                  <b className="font-medium text-white">{product.inStock ? "Налично" : "По запитване"}</b> · очакван срок{" "}
                  {product.deliveryDays} работни дни · потвърждаваме преди изпълнение
                </span>
              </li>
              {product.freeWindows && (
                <li className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 flex-none text-accent" strokeWidth={1.75} />
                  <span>Безплатна инсталация и начална настройка на Windows. Лицензът не е включен.</span>
                </li>
              )}
              <li className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-4 w-4 flex-none text-accent" strokeWidth={1.75} />
                <span>Наложен платеж или банков превод · доставка с Еконт до офис или адрес</span>
              </li>
            </ul>

            <div className="mt-8">
              <BuyBox
                item={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  image: product.images[0],
                }}
              />
              <p className="mt-3 text-[13px] text-dim">
                Без регистрация · Не дължите нищо преди потвърждението ·{" "}
                <a href={company.phoneHref} className="text-muted underline-offset-4 hover:text-white hover:underline">
                  Консултация на {company.phone}
                </a>
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-center text-[12px] text-muted">
              {[
                { icon: Gauge, label: "Тест преди доставка" },
                { icon: ShieldCheck, label: "Сервиз от GSOL" },
                { icon: Phone, label: "Потвърждение от човек" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-surface-2 px-2 py-4">
                  <Icon className="mx-auto mb-2 h-5 w-5 text-accent" strokeWidth={1.5} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {product.specs.length > 0 && (
          <section className="mt-20" aria-labelledby="specs">
            <h2 id="specs" className="h-display text-[26px] font-normal">
              Технически <span className="text-accent">характеристики</span>
            </h2>
            <dl className="mt-6 divide-y divide-line-soft border-y border-line-soft">
              {product.specs.map((s, i) => (
                <div key={`${s.k}-${i}`} className="grid gap-1 py-3 sm:grid-cols-[240px_1fr] sm:gap-6">
                  <dt className="text-[13px] uppercase tracking-wide text-dim">{s.k}</dt>
                  <dd className="whitespace-pre-line text-[14px] text-text">{s.v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-20 grid gap-6 md:grid-cols-3" aria-label="Доставка и сервиз">
          {[
            {
              title: "Доставка",
              text: "С Еконт до офис или до адрес в цялата страна. Цената на доставката се вижда преди потвърждение на поръчката.",
            },
            {
              title: "Плащане",
              text: "Наложен платеж при получаване или банков превод. Фактура за фирма — по желание при поръчката.",
            },
            {
              title: "Гаранция и сервиз",
              text: "Законова гаранция. GSOL приема случая, прави първоначална диагностика и координира следващото действие.",
            },
          ].map((b) => (
            <div key={b.title} className="cut-frame cut-sm [--frame:var(--color-line-soft)]">
              <div className="cut-inner bg-surface-2 p-6">
                <h3 className="h-display text-[17px] font-normal">{b.title}</h3>
                <p className="mt-2 text-[14px] text-muted">{b.text}</p>
              </div>
            </div>
          ))}
        </section>

        {related.length > 0 && (
          <section className="mt-20" aria-labelledby="related">
            <div className="flex items-end justify-between gap-4">
              <h2 id="related" className="h-display text-[26px] font-normal">
                Подобни <span className="text-accent">предложения</span>
              </h2>
              {category && (
                <Link
                  href={`/katalog/${category.slug}${sub ? `?sub=${sub.slug}` : ""}`}
                  className="font-display text-[13px] uppercase tracking-wide text-muted hover:text-white"
                >
                  Виж всички
                </Link>
              )}
            </div>
            <div className="mt-8">
              <ProductGrid products={related} />
            </div>
          </section>
        )}
      </Container>
    </>
  );
}

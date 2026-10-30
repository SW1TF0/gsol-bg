import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { Prose } from "@/components/Prose";
import { CookieSettingsLink } from "@/components/CookieConsent";
import { formatDate, formatDay } from "@/lib/format";
import { getLegalIntros, getLegalVersion, getPage, getPageSlugs, getPosts, type PostCta } from "@/lib/content";
import { legalLinks } from "@/lib/site";

// Страници от админа на адресите на сегашния сайт: правните текстове (/obshti-usloviya…),
// статиите от „Съвети“ (/kolko-struva-remont-na-laptop…) и „Правна информация“ (събира правните).

const legalSlugs = new Set(legalLinks.map((l) => l.slug));

export async function generateStaticParams() {
  return (await getPageSlugs()).map((page) => ({ page }));
}

export async function generateMetadata(props: PageProps<"/[page]">): Promise<Metadata> {
  const page = await getPage((await props.params).page);
  return page ? { title: page.title, description: page.intro ?? undefined } : {};
}

export default function InfoPage(props: PageProps<"/[page]">) {
  return (
    <Suspense fallback={<div className="h-[60vh]" aria-busy="true" />}>
      <InfoContent params={props.params} />
    </Suspense>
  );
}

async function InfoContent({ params }: Pick<PageProps<"/[page]">, "params">) {
  const slug = (await params).page;
  const page = await getPage(slug);
  if (!page) notFound();
  if (page.kind === "post") return <Post page={page} />;
  if (legalSlugs.has(slug)) return <Legal page={page} />;

  return (
    <>
      <PageHeader title={page.title} tagline={page.intro ?? undefined} crumbs={[{ label: page.title }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <Prose>{page.body}</Prose>
        <p className="mt-12 text-[13px] text-dim">Последна промяна: {formatDate(page.updated_at)}</p>
      </div>
    </>
  );
}

type Page = NonNullable<Awaited<ReturnType<typeof getPage>>>;

/** Правна страница: меню с деветте текста, версията на собственика и отпечатъкът на текста */
async function Legal({ page }: { page: Page }) {
  const hub = page.slug === "pravna-informaciya";
  const [version, intros] = await Promise.all([getLegalVersion(page.slug), hub ? getLegalIntros() : Promise.resolve([])]);

  return (
    <>
      <PageHeader title={page.title} tagline={page.intro ?? undefined} crumbs={[{ label: "Правна информация", href: "/pravna-informaciya" }, { label: page.title }]} />
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pb-24 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Правна информация" className="lg:sticky lg:top-[calc(var(--header-sticky)+24px)] lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0">
            {legalLinks.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/${l.slug}`}
                  aria-current={l.slug === page.slug ? "page" : undefined}
                  className="block border-l-2 border-transparent px-3 py-2 text-[14px] text-muted hover:text-white aria-[current=page]:border-accent aria-[current=page]:text-white max-lg:chip"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          {page.version_label && <p className="mb-6 text-[13px] uppercase tracking-wide text-dim">Версия {page.version_label}</p>}
          {hub ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {legalLinks
                .filter((l) => l.slug !== "pravna-informaciya")
                .map((l) => (
                  <li key={l.slug}>
                    <Link href={`/${l.slug}`} className="cut-frame cut-sm group block h-full hover:[--frame:var(--color-accent)]">
                      <div className="cut-inner h-full bg-surface-2 p-5">
                        <div className="h-display text-[16px] group-hover:text-accent-ink">{l.label}</div>
                        <p className="mt-2 text-[14px] text-muted">{intros.find((i) => i.slug === l.slug)?.intro}</p>
                      </div>
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <Prose>{page.body}</Prose>
          )}
          {page.slug === "biskvitki" && (
            <CookieSettingsLink className="btn btn-primary mt-6" label="Отвори настройките" />
          )}
          {version && (
            <p className="mt-12 text-[13px] text-dim">
              Запис № {version.version} от {formatDate(version.created_at)} · отпечатък{" "}
              <span className="font-mono" title={`SHA-256 ${version.sha256}`}>
                {version.sha256.slice(0, 12)}
              </span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/** Статия от „Съвети“: текст, бутон за действие и още статии */
async function Post({ page }: { page: Page }) {
  const cta = page.cta as PostCta | null;
  const related = (await getPosts()).filter((p) => p.slug !== page.slug).slice(0, 3);

  return (
    <>
      <PageHeader title={page.title} crumbs={[{ label: "Съвети", href: "/blog" }, { label: page.title }]} />
      <article className="mx-auto max-w-[1200px] px-4 pb-24">
        {page.published_at && (
          <p className="mb-8 flex items-center gap-2 text-[13px] text-dim">
            <CalendarDays className="h-4 w-4" /> {formatDay(page.published_at)}
          </p>
        )}
        <Prose>{page.body}</Prose>

        {cta && (
          <aside className="cut-frame mt-12 max-w-3xl [--frame:var(--color-accent)]">
            <div className="cut-inner flex flex-col gap-5 bg-gradient-to-br from-surface-2 to-accent/10 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="h-display text-[18px]">{cta.title}</p>
                {cta.text && <p className="mt-1 text-[14px] text-muted">{cta.text}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {cta.links.map((l, i) => (
                  <Link key={l.href} href={l.href} className={`btn btn-sm ${i === 0 ? "btn-primary" : "btn-ghost"}`}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="h-display text-[20px]">Още съвети</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}`} className="cut-frame cut-sm group block h-full hover:[--frame:var(--color-accent)]">
                    <div className="cut-inner h-full bg-surface-2 p-5">
                      <div className="text-[15px] font-medium text-white group-hover:text-accent-ink">{p.title}</div>
                      <span className="mt-3 flex items-center gap-1 text-[13px] text-accent-ink">
                        Прочетете <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}

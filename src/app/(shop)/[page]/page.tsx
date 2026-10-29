import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/catalog/PageHeader";
import { Prose } from "@/components/Prose";
import { formatDate } from "@/lib/format";
import { getLegalVersion, getPage, getPageSlugs } from "@/lib/content";

// Страници от админа: /obshti-usloviya, /dostavka-i-plashtane, /za-nas и т.н.

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
  const [page, version] = await Promise.all([getPage(slug), getLegalVersion(slug)]);
  if (!page) notFound();

  return (
    <>
      <PageHeader title={page.title} tagline={page.intro ?? undefined} crumbs={[{ label: page.title }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <Prose>{page.body}</Prose>
        <p className="mt-12 text-[13px] text-dim">
          {version ? (
            <>
              Версия {version.version} от {formatDate(version.created_at)} · отпечатък{" "}
              <span className="font-mono" title={`SHA-256 ${version.sha256}`}>
                {version.sha256.slice(0, 12)}
              </span>
            </>
          ) : (
            <>Последна промяна: {formatDate(page.updated_at)}</>
          )}
        </p>
      </div>
    </>
  );
}

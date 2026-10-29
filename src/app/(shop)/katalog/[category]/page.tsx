import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogSkeleton, CatalogView } from "@/components/catalog/CatalogView";
import { BusinessStrip } from "@/components/business/BusinessStrip";
import { PageHeader } from "@/components/catalog/PageHeader";
import { getCategories, getCategory } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: PageProps<"/katalog/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  const cat = await getCategory(category);
  return cat ? { title: cat.name, description: `${cat.name} — ${cat.tagline}. Реални цени с ДДС и наличност.` } : {};
}

export default function CategoryPage(props: PageProps<"/katalog/[category]">) {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function CategorySkeleton() {
  return (
    <>
      <div className="h-[180px] bg-gradient-to-b from-bg-alt to-bg" />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <CatalogSkeleton />
      </div>
    </>
  );
}

async function CategoryContent({ params, searchParams }: PageProps<"/katalog/[category]">) {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  const cat = await getCategory(category);
  if (!cat) notFound();

  return (
    <>
      <PageHeader title={cat.name} tagline={cat.tagline} crumbs={[{ label: cat.name }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <BusinessStrip className="mb-8" />
        <CatalogView basePath={`/katalog/${cat.slug}`} params={query} fixed={{ category: cat.slug }} />
      </div>
    </>
  );
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/catalog/PageHeader";
import { BusinessStrip } from "@/components/business/BusinessStrip";
import { CatalogSkeleton, CatalogView } from "@/components/catalog/CatalogView";
import { getCategory } from "@/lib/catalog";

// Рафтовете със свой адрес от сегашния сайт (/laptopi, /geimarski-kompyutri…): собствено заглавие,
// съвет под продуктите и същите филтри като каталога. Филтрираният изглед е истински адрес.

type Params = Record<string, string | string[] | undefined>;

export type ShelfDef = { path: string; title: string; tagline: string; category: string; sub?: string; advice: string };

export function ShelfPage({ shelf, searchParams }: { shelf: ShelfDef; searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader title={shelf.title} tagline={shelf.tagline} crumbs={[{ label: shelf.title }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <BusinessStrip className="mb-8" />
        <Suspense fallback={<CatalogSkeleton />}>
          <ShelfContent shelf={shelf} searchParams={searchParams} />
        </Suspense>
        {/* Съветът е под продуктите — никога над тях, за да не бута първия ред надолу */}
        <p className="mt-16 max-w-3xl text-[15px] leading-relaxed text-muted">{shelf.advice}</p>
      </div>
    </>
  );
}

async function ShelfContent({ shelf, searchParams }: { shelf: ShelfDef; searchParams: Promise<Params> }) {
  if (!(await getCategory(shelf.category))) notFound();
  return <CatalogView basePath={shelf.path} params={await searchParams} fixed={{ category: shelf.category, sub: shelf.sub }} />;
}

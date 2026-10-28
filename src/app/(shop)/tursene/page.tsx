import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogSkeleton, CatalogView } from "@/components/catalog/CatalogView";
import { PageHeader } from "@/components/catalog/PageHeader";

export const metadata: Metadata = {
  title: "Търсене",
  robots: { index: false },
};

export default function SearchPage(props: PageProps<"/tursene">) {
  return (
    <>
      <PageHeader title="Търсене" crumbs={[{ label: "Търсене" }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <Suspense fallback={<CatalogSkeleton />}>
          <Results searchParams={props.searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/tursene">["searchParams"] }) {
  const params = await searchParams;
  return <CatalogView basePath="/tursene" params={params} showSearchSummary />;
}

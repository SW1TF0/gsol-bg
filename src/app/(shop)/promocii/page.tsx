import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogSkeleton, CatalogView } from "@/components/catalog/CatalogView";
import { PageHeader } from "@/components/catalog/PageHeader";

export const metadata: Metadata = {
  title: "Промоции",
  description: "Актуални промоции на лаптопи, монитори и периферия — до изчерпване на количествата.",
};

export default function PromoPage(props: PageProps<"/promocii">) {
  return (
    <>
      <PageHeader title="Актуални" accent="промоции" tagline="До изчерпване на количествата" crumbs={[{ label: "Промоции" }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <Suspense fallback={<CatalogSkeleton />}>
          <Results searchParams={props.searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/promocii">["searchParams"] }) {
  const params = await searchParams;
  return <CatalogView basePath="/promocii" params={params} fixed={{ promo: true }} />;
}

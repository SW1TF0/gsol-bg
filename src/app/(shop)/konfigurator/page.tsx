import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/catalog/PageHeader";
import { Configurator } from "@/components/configurator/Configurator";
import { getConfiguratorParts, getMachineSelection } from "@/lib/builder/public-data";
import { getCompany } from "@/lib/settings-data";

export const metadata: Metadata = {
  title: "Конфигуратор — сглоби си компютър",
  description: "Изберете процесор, видеокарта, памет и останалото — проверяваме съвместимостта и показваме цената веднага.",
};

export default function ConfiguratorPage(props: PageProps<"/konfigurator">) {
  return (
    <>
      <PageHeader
        title="Сглоби си"
        accent="компютър"
        tagline="Проверка на съвместимостта и цена на живо"
        crumbs={[{ label: "Компютри", href: "/katalog/kompyutri" }, { label: "Конфигуратор" }]}
      />
      <div className="mx-auto max-w-[1300px] px-4 pb-24">
        <Suspense fallback={<div className="h-[600px] animate-pulse bg-surface-2" aria-busy="true" />}>
          <ConfiguratorLoader searchParams={props.searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function ConfiguratorLoader({ searchParams }: Pick<PageProps<"/konfigurator">, "searchParams">) {
  const ot = (await searchParams).ot;
  const [parts, company, initial] = await Promise.all([
    getConfiguratorParts(),
    getCompany(),
    typeof ot === "string" ? getMachineSelection(ot) : Promise.resolve({}),
  ]);
  return <Configurator parts={parts} initial={initial} phone={company.phone} phoneHref={company.phoneHref} />;
}

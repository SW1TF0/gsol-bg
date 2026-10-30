import type { Metadata } from "next";
import { PageHeader } from "@/components/catalog/PageHeader";
import { getCompany } from "@/lib/settings-data";
import { Funnel } from "./Funnel";

export const metadata: Metadata = {
  title: "Избери решение",
  description: "Помощник за избор: няколко въпроса и стигате до подходящите продукти или до точния екип за задачата.",
};

export default async function ChooseSolutionPage() {
  const company = await getCompany();
  return (
    <>
      <PageHeader
        title="Един въпрос."
        accent="Точната следваща стъпка."
        tagline="Без безкрайно разглеждане — изберете какво търсите и стигнете до подходящия каталог или до точния екип"
        crumbs={[{ label: "Избери решение" }]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <Funnel phone={company.phone} phoneHref={company.phoneHref} />
      </div>
    </>
  );
}

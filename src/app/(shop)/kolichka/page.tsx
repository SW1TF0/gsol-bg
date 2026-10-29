import type { Metadata } from "next";
import { PageHeader } from "@/components/catalog/PageHeader";
import { CartView } from "@/components/cart/CartView";
import { CheckoutSteps } from "@/components/cart/CheckoutSteps";
import { getCompany } from "@/lib/settings-data";

export const metadata: Metadata = {
  title: "Количка",
  robots: { index: false },
};

export default async function CartPage() {
  const company = await getCompany();
  return (
    <>
      <PageHeader title="Вашата" accent="количка" crumbs={[{ label: "Количка" }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <CheckoutSteps current={1} />
        <CartView phone={company.phone} phoneHref={company.phoneHref} />
      </div>
    </>
  );
}

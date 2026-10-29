import type { Metadata } from "next";
import { PageHeader } from "@/components/catalog/PageHeader";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { CheckoutSteps } from "@/components/cart/CheckoutSteps";
import { getSettings } from "@/lib/settings-data";

export const metadata: Metadata = {
  title: "Поръчка",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const { shipping, company } = await getSettings();
  return (
    <>
      <PageHeader
        title="Данни и"
        accent="доставка"
        tagline="Поръчка без регистрация"
        crumbs={[{ label: "Количка", href: "/kolichka" }, { label: "Поръчка" }]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <CheckoutSteps current={2} />
        <CheckoutForm shippingPrices={shipping} phone={company.phone} phoneHref={company.phoneHref} />
      </div>
    </>
  );
}

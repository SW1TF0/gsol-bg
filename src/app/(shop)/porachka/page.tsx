import type { Metadata } from "next";
import { PageHeader } from "@/components/catalog/PageHeader";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getSettings } from "@/lib/settings-data";

export const metadata: Metadata = {
  title: "Поръчка",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const { shipping } = await getSettings();
  return (
    <>
      <PageHeader
        title="Данни и"
        accent="доставка"
        tagline="Поръчка без регистрация"
        crumbs={[{ label: "Количка", href: "/kolichka" }, { label: "Поръчка" }]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <CheckoutForm shippingPrices={shipping} />
      </div>
    </>
  );
}

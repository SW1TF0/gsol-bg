import type { Metadata } from "next";
import { PageHeader } from "@/components/catalog/PageHeader";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Количка",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <>
      <PageHeader title="Вашата" accent="количка" crumbs={[{ label: "Количка" }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <CartView />
      </div>
    </>
  );
}

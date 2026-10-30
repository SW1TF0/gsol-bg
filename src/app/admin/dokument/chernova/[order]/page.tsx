import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import type { InvoiceData } from "@/lib/invoices";
import { DocToolbar } from "@/components/documents/DocToolbar";
import { InvoiceDocument } from "@/components/documents/InvoiceDocument";

// Чернова преди издаване: същото съдържание, без номер и с жълта лента — номерът се дава само при „Издай“

export const metadata: Metadata = { title: { absolute: "Чернова на документ" }, robots: { index: false, follow: false } };

export default function DraftPage(props: PageProps<"/admin/dokument/chernova/[order]">) {
  return (
    <Suspense fallback={null}>
      <Draft params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Draft({ params, searchParams }: Pick<PageProps<"/admin/dokument/chernova/[order]">, "params" | "searchParams">) {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const orderId = Number((await params).order);
  const kind = (await searchParams).vid === "proforma" ? "proforma" : "invoice";
  if (!orderId) notFound();
  const { data, error } = await db.rpc("invoice_preview", { p_order_id: orderId });
  if (error || !data) notFound();

  return (
    <div className="min-h-dvh bg-[#e5e7eb] text-[#111827]">
      <DocToolbar printLabel="Отпечатай черновата" links={[{ href: `/admin/porachki/${orderId}`, label: "Към поръчката" }]} />
      <InvoiceDocument kind={kind} number={null} issueDate={new Date().toISOString()} data={data as InvoiceData} />
    </div>
  );
}

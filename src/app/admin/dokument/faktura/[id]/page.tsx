import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { invoiceKindLabels, type InvoiceData, type InvoiceKind } from "@/lib/invoices";
import { DocToolbar } from "@/components/documents/DocToolbar";
import { InvoiceDocument } from "@/components/documents/InvoiceDocument";

// Издаден документ — само за печат; не се редактира (грешка се поправя с кредитно известие)

export async function generateMetadata(props: PageProps<"/admin/dokument/faktura/[id]">): Promise<Metadata> {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const { data } = await db.from("invoices").select("kind, number").eq("id", Number((await props.params).id)).maybeSingle();
  return {
    title: { absolute: data ? `GSOL-${invoiceKindLabels[data.kind as InvoiceKind].split(" ")[0]}-${data.number}` : "Документ" },
    robots: { index: false, follow: false },
  };
}

export default function InvoicePage(props: PageProps<"/admin/dokument/faktura/[id]">) {
  return (
    <Suspense fallback={null}>
      <Invoice params={props.params} />
    </Suspense>
  );
}

async function Invoice({ params }: Pick<PageProps<"/admin/dokument/faktura/[id]">, "params">) {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const id = Number((await params).id);
  if (!id) notFound();
  const { data: inv } = await db.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!inv) notFound();

  return (
    <div className="min-h-dvh bg-[#e5e7eb] text-[#111827]">
      <DocToolbar
        printLabel="Отпечатай / PDF"
        links={[
          { href: `/admin/porachki/${inv.order_id}`, label: "Към поръчката" },
          { href: "/admin/fakturi", label: "Регистър" },
        ]}
      />
      {inv.cancelled && (
        <p className="no-print mx-auto mt-6 max-w-[860px] bg-[#fee2e2] px-4 py-2 text-[14px] text-[#991b1b]">
          Тази фактура е кредитирана с кредитно известие.
        </p>
      )}
      <InvoiceDocument kind={inv.kind as InvoiceKind} number={inv.number} issueDate={inv.issue_date} data={inv.data as InvoiceData} />
    </div>
  );
}

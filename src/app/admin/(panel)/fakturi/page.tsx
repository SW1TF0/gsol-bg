import Link from "next/link";
import { AdminHeader, Empty, Table } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatDay, formatPrice } from "@/lib/format";
import { invoiceKindLabels, parseInvoiceSettings, type InvoiceData, type InvoiceKind } from "@/lib/invoices";
import { InvoiceSettingsForm, SeriesForm } from "./forms";

export const metadata = { title: "Фактури" };

type Counter = { next: string; min: string; max: string; issued: number; locked: boolean };

export default async function InvoicesPage() {
  const { db, staff } = await requireStaff(["admin", "manager", "sales"]);
  const [{ data: counters }, { data: row }, { data: docs }] = await Promise.all([
    db.rpc("invoice_counters"),
    db.from("settings").select("value").eq("key", "invoices").maybeSingle(),
    db.from("invoices").select("id, kind, number, issue_date, order_id, total_cents, cancelled, data").order("id", { ascending: false }).limit(200),
  ]);
  const c = (counters ?? {}) as Record<"invoice" | "proforma", Counter>;
  const admin = staff.role === "admin";

  return (
    <>
      <AdminHeader title="Фактури" subtitle="Десет цифри, само нарастващ номер, без празнини · фактури 09…, проформи 095…" />
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {c.invoice && <SeriesForm series="invoice" title="Фактури и кредитни известия" canEdit={admin} {...c.invoice} />}
        {c.proforma && <SeriesForm series="proforma" title="Проформи" canEdit={admin} {...c.proforma} />}
        <InvoiceSettingsForm settings={parseInvoiceSettings(row?.value)} canEdit={admin} />
      </div>

      <h2 className="mb-4 font-display text-[14px] uppercase tracking-[1.5px] text-muted">Регистър</h2>
      {docs?.length ? (
        <Table head={["Номер", "Вид", "Дата", "Поръчка", "Получател", "Сума", "Статус"]}>
          {docs.map((d) => {
            const data = d.data as InvoiceData;
            return (
              <tr key={d.id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  <Link href={`/admin/dokument/faktura/${d.id}`} target="_blank" className="font-mono text-white hover:text-accent-ink">
                    {d.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{invoiceKindLabels[d.kind as InvoiceKind]}</td>
                <td className="px-4 py-3 text-muted">{formatDay(d.issue_date)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/porachki/${d.order_id}`} className="text-accent-ink hover:underline">
                    {data.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{data.recipient.name}</td>
                <td className={`px-4 py-3 ${d.total_cents < 0 ? "text-danger" : "text-white"}`}>{formatPrice(d.total_cents)}</td>
                <td className="px-4 py-3 text-muted">{d.cancelled ? "кредитирана" : "издадена"}</td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty>Още няма издадени документи. Издават се от страницата на поръчката.</Empty>
      )}
    </>
  );
}

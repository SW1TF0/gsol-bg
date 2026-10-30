import Link from "next/link";
import { Eye, FileDown, Pencil } from "lucide-react";
import { AdminHeader, Empty, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";
import { quoteStatusLabels, quoteTotals, type QuoteLine, type QuoteStatus } from "@/lib/quotes";
import { NewQuoteForm } from "./NewQuoteForm";

export const metadata = { title: "Оферти" };

const statusTone: Record<QuoteStatus, string> = {
  draft: "bg-surface text-muted",
  sent: "bg-accent/15 text-accent-ink",
  accepted: "bg-ok/15 text-ok",
  declined: "bg-danger/10 text-danger",
  expired: "bg-surface text-dim",
};

export default async function QuotesPage() {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const { data } = await db
    .from("quotes")
    .select("id, number, client_name, client_company, status, lines, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <>
      <AdminHeader title="Оферти" subtitle="Ценови оферти за клиенти — последните 100" />
      <NewQuoteForm />
      {data?.length ? (
        <Table head={["№ / клиент", "Статус", "Продажна с ДДС", "Доставна с ДДС", "Печалба без ДДС", "Марж", "Обновена", ""]}>
          {data.map((q) => {
            const t = quoteTotals(q.lines as QuoteLine[]);
            return (
              <tr key={q.id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  <Link href={`/admin/oferti/${q.id}`} className="font-display text-white hover:text-accent-ink">
                    {q.number}
                  </Link>
                  <div className="text-[13px] text-muted">
                    {q.client_name}
                    {q.client_company ? ` · ${q.client_company}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-[12px] ${statusTone[q.status]}`}>{quoteStatusLabels[q.status]}</span>
                </td>
                <td className="px-4 py-3 text-white">{formatPrice(t.sell)}</td>
                <td className="px-4 py-3 text-muted">
                  {formatPrice(t.cost)}
                  {t.partial && <span title="Някъде липсва доставна цена"> *</span>}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(t.profit)}
                  {t.partial && <span title="Частична — някъде липсва доставна цена"> *</span>}
                </td>
                <td className="px-4 py-3 text-muted">{t.margin === null ? "—" : `${(t.margin * 100).toFixed(1).replace(".", ",")}%`}</td>
                <td className="px-4 py-3 text-muted">{formatDate(q.updated_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Link href={`/admin/oferti/${q.id}`} aria-label="Редакция" title="Редакция" className="p-1.5 text-muted hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <Link href={`/admin/dokument/oferta/${q.id}`} aria-label="Клиентски преглед" title="Клиентски преглед" className="p-1.5 text-muted hover:text-white">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={`/admin/dokument/oferta/${q.id}?pechat=1`} aria-label="PDF" title="PDF" className="p-1.5 text-muted hover:text-white">
                      <FileDown className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty>Още няма оферти. Създайте от продукт, от количката или с полето горе.</Empty>
      )}
      <p className="mt-4 text-[13px] text-dim">* частична сума — на някой ред липсва доставна цена.</p>
    </>
  );
}

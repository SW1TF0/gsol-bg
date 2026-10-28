import Link from "next/link";
import { connection } from "next/server";
import { AdminHeader, Empty, Panel, Stat, StatusBadge, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Табло" };

export default async function DashboardPage() {
  await connection();
  const { db } = await requireStaff();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [newOrders, recent, month, promos, topCodes] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
    db
      .from("orders")
      .select("id, number, first_name, last_name, total_cents, status, created_at, promo_code")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("orders")
      .select("total_cents, discount_cents")
      .gte("created_at", since.toISOString())
      .not("status", "in", "(cancelled,returned)"),
    db.from("promo_codes").select("id", { count: "exact", head: true }).eq("is_active", true),
    db
      .from("promo_codes")
      .select("id, code, times_used, usage_limit")
      .gt("times_used", 0)
      .order("times_used", { ascending: false })
      .limit(5),
  ]);

  const monthRows = month.data ?? [];
  const revenue = monthRows.reduce((s, o) => s + o.total_cents, 0);
  const discounts = monthRows.reduce((s, o) => s + o.discount_cents, 0);

  return (
    <>
      <AdminHeader title="Табло" subtitle="Последните 30 дни" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Нови поръчки" value={String(newOrders.count ?? 0)} hint="чакат потвърждение" href="/admin/porachki?status=new" />
        <Stat label="Оборот" value={formatPrice(revenue)} hint={`${monthRows.length} поръчки`} />
        <Stat label="Дадени отстъпки" value={formatPrice(discounts)} hint="от промо кодове" />
        <Stat label="Активни промо кодове" value={String(promos.count ?? 0)} href="/admin/promo-kodove" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[14px] uppercase tracking-[1.5px] text-muted">Последни поръчки</h2>
            <Link href="/admin/porachki" className="text-[13px] text-muted hover:text-white">
              Всички →
            </Link>
          </div>
          {recent.data?.length ? (
            <Table head={["№", "Клиент", "Сума", "Статус", "Дата"]}>
              {recent.data.map((o) => (
                <tr key={o.id} className="hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/admin/porachki/${o.id}`} className="font-display text-white hover:text-accent">
                      {o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {o.first_name} {o.last_name}
                  </td>
                  <td className="px-4 py-3 text-white">
                    {formatPrice(o.total_cents)}
                    {o.promo_code && <span className="ml-2 text-[12px] text-ok">{o.promo_code}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty>Все още няма поръчки.</Empty>
          )}
        </div>

        <Panel title="Най-ползвани промо кодове">
          {topCodes.data?.length ? (
            <ul className="space-y-3">
              {topCodes.data.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-[14px]">
                  <Link href={`/admin/promo-kodove/${c.id}`} className="font-display text-white hover:text-accent">
                    {c.code}
                  </Link>
                  <span className="text-muted">
                    {c.times_used}
                    {c.usage_limit ? ` / ${c.usage_limit}` : ""} ползвания
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-muted">Още няма използвани кодове.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

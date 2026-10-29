import Link from "next/link";
import { Search } from "lucide-react";
import { AdminHeader, Empty, Pager, StatusBadge, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";
import { orderStatusLabels, paymentLabels, type PaymentMethod } from "@/lib/orders";
import { Constants } from "@/lib/supabase/database.types";

export const metadata = { title: "Поръчки" };

const PER_PAGE = 25;
type Status = (typeof Constants.public.Enums.order_status)[number];

export default async function OrdersPage(props: PageProps<"/admin/porachki">) {
  const { db } = await requireStaff();
  const params = await props.searchParams;
  const status = Constants.public.Enums.order_status.find((s) => s === params.status) as Status | undefined;
  const q = typeof params.q === "string" ? params.q.replace(/[,()%*\\]/g, " ").trim() : "";
  const page = Math.max(1, Number(params.page) || 1);

  let query = db
    .from("orders")
    .select("id, number, first_name, last_name, email, phone, total_cents, status, payment_method, created_at, promo_code", {
      count: "exact",
    })
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`number.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,last_name.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  const href = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (q) next.set("q", q);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    return s ? `/admin/porachki?${s}` : "/admin/porachki";
  };

  return (
    <>
      <AdminHeader title="Поръчки" subtitle={`${count ?? 0} резултата`} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Статус" className="flex flex-wrap gap-2">
          <Link href={href({ status: null, page: null })} className="chip" data-active={!status}>
            Всички
          </Link>
          {Constants.public.Enums.order_status.map((s) => (
            <Link key={s} href={href({ status: s, page: null })} className="chip" data-active={status === s}>
              {orderStatusLabels[s]}
            </Link>
          ))}
        </nav>
        <form className="relative ml-auto w-full sm:w-72" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">
            Търсене на поръчка
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="№, имейл, телефон, фамилия" className="input !h-9 pl-9 text-[14px]" />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        </form>
      </div>

      {data?.length ? (
        <Table head={["№", "Клиент", "Контакт", "Сума", "Плащане", "Статус", "Дата"]}>
          {data.map((o) => (
            <tr key={o.id} className="hover:bg-surface">
              <td className="px-4 py-3">
                <Link href={`/admin/porachki/${o.id}`} className="font-display text-white hover:text-accent-ink">
                  {o.number}
                </Link>
              </td>
              <td className="px-4 py-3">
                {o.first_name} {o.last_name}
              </td>
              <td className="px-4 py-3 text-[13px] text-muted">
                <div>{o.phone}</div>
                <div className="max-w-[200px] truncate">{o.email}</div>
              </td>
              <td className="px-4 py-3 text-white">
                {formatPrice(o.total_cents)}
                {o.promo_code && <div className="text-[12px] text-ok">{o.promo_code}</div>}
              </td>
              <td className="px-4 py-3 text-muted">{paymentLabels[o.payment_method as PaymentMethod]}</td>
              <td className="px-4 py-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3 text-muted">{formatDate(o.created_at)}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>Няма поръчки по тези критерии.</Empty>
      )}
      <Pager page={page} pages={pages} href={(p) => href({ page: p === 1 ? null : String(p) })} />
    </>
  );
}

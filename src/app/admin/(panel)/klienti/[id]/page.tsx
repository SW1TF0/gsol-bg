import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Mail, Phone, Trophy } from "lucide-react";
import { AdminHeader, Panel, Stat, StatusBadge, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { customerName } from "@/lib/customers";
import { formatPrice } from "@/lib/format";
import { inquiryTopics, type InquiryTopic } from "@/lib/inquiries";
import AdminLoading from "@/app/admin/(panel)/loading";
import { InquiryStatusBadge } from "../../zapitvaniya/badge";
import { unsubscribeCustomer } from "../actions";
import { CustomerForm } from "./CustomerForm";

export const metadata = { title: "Клиент" };

type Company = { company?: string; eik?: string; vat?: string; mol?: string; address?: string };

export default function CustomerPage(props: PageProps<"/admin/klienti/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <CustomerContent params={props.params} />
    </Suspense>
  );
}

async function CustomerContent({ params }: Pick<PageProps<"/admin/klienti/[id]">, "params">) {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const { data: c } = await db.from("customer_stats").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const [{ data: orders }, { data: inquiries }, { data: wins }] = await Promise.all([
    db
      .from("orders")
      .select("id, number, status, total_cents, promo_code, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    db.rpc("customer_inquiries", { p_customer: id }),
    // ilike без значение на малки/главни букви; _ и % в имейла са буквални
    db.from("raffle_winners").select("raffle_id, prize_id, position, is_reserve").ilike("email", c.email.replace(/[\\%_]/g, "\\$&")),
  ]);
  const [{ data: raffles }, { data: prizes }] = wins?.length
    ? await Promise.all([
        db.from("raffles").select("id, title").in("id", wins.map((w) => w.raffle_id)),
        db.from("raffle_prizes").select("id, title").in("id", wins.flatMap((w) => (w.prize_id ? [w.prize_id] : []))),
      ])
    : [{ data: [] }, { data: [] }];

  const company = c.company as Company | null;
  const average = c.orders_count ? Math.round(c.spent_cents / c.orders_count) : 0;
  const codes = [...new Set((orders ?? []).flatMap((o) => (o.promo_code ? [o.promo_code] : [])))];

  return (
    <>
      <Link href="/admin/klienti" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички клиенти
      </Link>
      <AdminHeader title={customerName(c)} subtitle={`Клиент от ${formatDate(c.created_at)}`} />

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Поръчки" value={String(c.orders_count)} hint="без отказани и върнати" />
        <Stat label="Похарчено" value={formatPrice(c.spent_cents)} />
        <Stat label="Средна поръчка" value={c.orders_count ? formatPrice(average) : "—"} />
        <Stat label="Последна поръчка" value={c.last_order_at ? formatDate(c.last_order_at).split(",")[0] : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title={`Поръчки (${orders?.length ?? 0})`}>
            {orders?.length ? (
              <Table head={["№", "Дата", "Сума", "Статус"]}>
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface">
                    <td className="px-4 py-3">
                      <Link href={`/admin/porachki/${o.id}`} className="font-display text-white hover:text-accent">
                        {o.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-white">
                      {formatPrice(o.total_cents)}
                      {o.promo_code && <div className="text-[12px] text-ok">{o.promo_code}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="text-[14px] text-muted">Няма поръчки.</p>
            )}
          </Panel>

          <Panel title={`Запитвания (${inquiries?.length ?? 0})`}>
            {inquiries?.length ? (
              <ul className="divide-y divide-line-soft">
                {inquiries.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-[14px]">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/zapitvaniya/${q.id}`} className="text-white hover:text-accent">
                        {inquiryTopics[q.topic as InquiryTopic]?.label ?? q.topic}
                      </Link>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{q.message}</p>
                      <div className="mt-1 text-[12px] text-dim">{formatDate(q.created_at)}</div>
                    </div>
                    <InquiryStatusBadge status={q.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted">Няма запитвания с този имейл или телефон.</p>
            )}
          </Panel>

          {(wins?.length ?? 0) > 0 && (
            <Panel title="Томболи">
              <ul className="space-y-2 text-[14px]">
                {wins!.map((w) => (
                  <li key={`${w.raffle_id}-${w.position}`} className="flex items-center gap-2.5">
                    <Trophy className="h-4 w-4 flex-none text-accent" />
                    <Link href={`/admin/tomboli/${w.raffle_id}`} className="text-white hover:text-accent">
                      {raffles?.find((r) => r.id === w.raffle_id)?.title ?? "Томбола"}
                    </Link>
                    <span className="text-muted">
                      · {w.is_reserve ? "резерва" : (prizes?.find((p) => p.id === w.prize_id)?.title ?? "награда")}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Контакт">
            <div className="space-y-2 text-[14px]">
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-muted hover:text-white">
                  <Phone className="h-4 w-4 text-accent" /> {c.phone}
                </a>
              )}
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 break-all text-muted hover:text-white">
                <Mail className="h-4 w-4 flex-none text-accent" /> {c.email}
              </a>
            </div>
            <div className="mt-4 border-t border-line pt-4 text-[14px]">
              {c.marketing_opt_in ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-ok">
                    Абониран за бюлетина{c.marketing_opt_in_at ? ` от ${formatDate(c.marketing_opt_in_at).split(",")[0]}` : ""}
                  </span>
                  <form action={unsubscribeCustomer}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="text-[13px] text-muted underline underline-offset-2 hover:text-accent">
                      Отпиши
                    </button>
                  </form>
                </div>
              ) : (
                <span className="text-dim">Не е дал съгласие за маркетингови съобщения</span>
              )}
            </div>
          </Panel>

          {company?.company && (
            <Panel title="Фирма (от фактурата)">
              <div className="flex items-start gap-2.5 text-[14px]">
                <Building2 className="mt-0.5 h-4 w-4 flex-none text-accent" />
                <div className="space-y-1">
                  <div className="text-white">{company.company}</div>
                  <div className="text-muted">
                    ЕИК {company.eik}
                    {company.vat ? ` · ${company.vat}` : ""}
                  </div>
                  {company.mol && <div className="text-muted">МОЛ {company.mol}</div>}
                  {company.address && <div className="text-muted">{company.address}</div>}
                </div>
              </div>
            </Panel>
          )}

          <Panel title="Бележки и етикети">
            <CustomerForm id={c.id} note={c.note ?? ""} tags={c.tags} />
          </Panel>

          {codes.length > 0 && (
            <Panel title="Използвани промо кодове">
              <div className="flex flex-wrap gap-2">
                {codes.map((code) => (
                  <span key={code} className="chip">
                    {code}
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

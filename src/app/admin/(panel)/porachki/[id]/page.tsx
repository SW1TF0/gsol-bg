import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { AdminHeader, Panel, StatusBadge, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";
import { orderStatusLabels, paymentLabels, shippingLabels, type PaymentMethod, type ShippingMethod } from "@/lib/orders";
import { NoteForm, StatusForm } from "./forms";
import AdminLoading from "@/app/admin/(panel)/loading";

export const metadata = { title: "Поръчка" };

type Invoice = { company?: string; eik?: string; vat?: string; mol?: string; address?: string };

// Номерът в адреса е известен чак при заявка — рамката на страницата излиза веднага, данните след това
export default function OrderPage(props: PageProps<"/admin/porachki/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <OrderPageContent params={props.params} />
    </Suspense>
  );
}

async function OrderPageContent({ params }: Pick<PageProps<"/admin/porachki/[id]">, "params">) {
  const { db } = await requireStaff();
  const id = Number((await params).id);
  if (!id) notFound();

  const [{ data: order }, { data: items }, { data: events }] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("*").eq("order_id", id).order("id"),
    db.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();

  const invoice = order.invoice as Invoice | null;
  const shipping = order.shipping_method as ShippingMethod;

  return (
    <>
      <Link href="/admin/porachki" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички поръчки
      </Link>
      <AdminHeader
        title={`Поръчка ${order.number}`}
        subtitle={`Създадена ${formatDate(order.created_at)}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Продукти">
            <ul className="divide-y divide-line-soft">
              {items?.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-[14px]">
                  <div className="min-w-0 flex-1">
                    <div className="text-white">{i.name}</div>
                    <div className="text-[12px] text-dim">
                      {i.sku} · {i.qty} × {formatPrice(i.unit_price_cents)}
                    </div>
                  </div>
                  <div className="text-right">
                    {i.discount_cents > 0 && <div className="text-[12px] text-ok">−{formatPrice(i.discount_cents)}</div>}
                    <div className="font-display text-white">{formatPrice(i.line_total_cents)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-[14px]">
              <Row label="Продукти" value={formatPrice(order.subtotal_cents)} />
              {order.discount_cents > 0 && (
                <Row label={`Отстъпка (${order.promo_code})`} value={`−${formatPrice(order.discount_cents)}`} tone="ok" />
              )}
              <Row label="Доставка" value={order.shipping_cents ? formatPrice(order.shipping_cents) : "безплатна"} />
              <Row label="Общо с ДДС" value={formatPrice(order.total_cents)} strong />
            </dl>
          </Panel>

          <Panel title="История">
            <NoteForm orderId={order.id} />
            <ol className="mt-5 space-y-3 text-[14px]">
              {events?.map((e) => {
                const data = e.data as { from?: string; to?: string; text?: string; promo_code?: string };
                return (
                  <li key={e.id} className="border-l-2 border-line pl-4">
                    <div className="text-[12px] text-dim">{formatDate(e.created_at)}</div>
                    <div className="text-text">
                      {e.type === "created" && <>Поръчката е създадена{data.promo_code ? ` с код ${data.promo_code}` : ""}.</>}
                      {e.type === "status" && (
                        <>
                          Статус: {orderStatusLabels[data.from ?? ""] ?? data.from} →{" "}
                          <b className="font-medium text-white">{orderStatusLabels[data.to ?? ""] ?? data.to}</b>
                        </>
                      )}
                      {e.type === "note" && <span className="whitespace-pre-line">{data.text}</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Статус">
            <StatusForm key={order.status} orderId={order.id} status={order.status} />
          </Panel>

          <Panel title="Клиент">
            <div className="space-y-2 text-[14px]">
              <div className="text-[16px] text-white">
                {order.first_name} {order.last_name}
              </div>
              <a href={`tel:${order.phone}`} className="flex items-center gap-2 text-muted hover:text-white">
                <Phone className="h-4 w-4 text-accent" /> {order.phone}
              </a>
              <a href={`mailto:${order.email}`} className="flex items-center gap-2 break-all text-muted hover:text-white">
                <Mail className="h-4 w-4 flex-none text-accent" /> {order.email}
              </a>
            </div>
          </Panel>

          <Panel title="Доставка и плащане">
            <dl className="space-y-2 text-[14px]">
              <Row label="Доставка" value={shippingLabels[shipping]} />
              <Row label="Град" value={order.shipping_city} />
              {order.econt_office && <Row label="Офис" value={order.econt_office} />}
              {order.shipping_address && <Row label="Адрес" value={order.shipping_address} />}
              <Row label="Плащане" value={paymentLabels[order.payment_method as PaymentMethod]} />
            </dl>
            {order.note && <p className="mt-4 whitespace-pre-line bg-bg-deep p-3 text-[14px] text-muted">{order.note}</p>}
          </Panel>

          {invoice && (
            <Panel title="Фактура">
              <dl className="space-y-2 text-[14px]">
                <Row label="Фирма" value={invoice.company ?? "—"} />
                <Row label="ЕИК" value={invoice.eik ?? "—"} />
                {invoice.vat && <Row label="ДДС №" value={invoice.vat} />}
                <Row label="МОЛ" value={invoice.mol ?? "—"} />
                <Row label="Адрес" value={invoice.address ?? "—"} />
              </dl>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "ok" }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right ${strong ? "font-display text-[18px] text-white" : tone === "ok" ? "text-ok" : "text-white"}`}>
        {value}
      </dd>
    </div>
  );
}

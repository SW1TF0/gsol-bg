import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, Phone } from "lucide-react";
import { AdminHeader, Panel, StatusBadge, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatDay, formatPrice } from "@/lib/format";
import { orderStatusLabels, paymentLabels, shippingLabels, type PaymentMethod, type ShippingMethod } from "@/lib/orders";
import { emailConfig } from "@/lib/email/send";
import { shipmentStateLabels } from "@/lib/econt-shared";
import { NoteForm, ShipmentButtons, StatusForm } from "./forms";
import AdminLoading from "@/app/admin/(panel)/loading";

export const metadata = { title: "Поръчка" };

const emailResultLabels: Record<string, string> = {
  sent: "изпратен",
  failed: "грешка при изпращане",
  disabled: "не е изпратен (изпращането не е настроено)",
};

type Invoice = { type?: "person" | "company"; name?: string; egn?: string; company?: string; eik?: string; vat?: string; mol?: string; address?: string };
type LegalRef = { version: number; sha256: string } | null;
type Legal = { terms: LegalRef; privacy: LegalRef; consent: string; accepted_at: string } | null;

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

  const [{ data: order }, { data: items }, { data: events }, { data: shipments }] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("*").eq("order_id", id).order("id"),
    db.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    db.from("shipments").select("*").eq("order_id", id).order("id", { ascending: false }),
  ]);
  if (!order) notFound();

  const invoice = order.invoice as Invoice | null;
  const legal = order.legal as Legal;
  const shipping = order.shipping_method as ShippingMethod;
  const shipment = shipments?.[0] ?? null;
  const shipmentEvents = (shipment?.events as { time: string; text: string; place: string | null }[] | undefined) ?? [];

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
                const data = e.data as {
                  from?: string;
                  to?: string;
                  text?: string;
                  promo_code?: string;
                  kind?: string;
                  status?: string;
                  result?: string;
                  message?: string;
                  number?: string;
                  error?: string;
                  env?: string;
                };
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
                      {e.type === "shipment_created" && (
                        <>
                          Товарителница <b className="font-medium text-white">{data.number}</b>
                          {data.env === "demo" ? " (пробна, тестова среда)" : ""}
                        </>
                      )}
                      {e.type === "shipment_failed" && (
                        <>
                          Товарителницата не се създаде: <span className="text-danger">{data.error}</span>
                        </>
                      )}
                      {e.type === "shipment_cancelled" && <>Товарителница {data.number} е анулирана.</>}
                      {e.type === "shipment_cancel_failed" && (
                        <>
                          Анулирането на {data.number} не мина: <span className="text-danger">{data.error}</span>
                        </>
                      )}
                      {e.type === "email" && (
                        <>
                          {data.kind === "confirmation" && "Имейл до клиента: потвърждение на поръчката"}
                          {data.kind === "shop_alert" && "Известие до магазина за новата поръчка"}
                          {data.kind === "status" && <>Имейл до клиента: „{orderStatusLabels[data.status ?? ""] ?? data.status}“</>}
                          {" — "}
                          <span className={data.result === "sent" ? "text-ok" : data.result === "failed" ? "text-accent-ink" : "text-dim"}>
                            {emailResultLabels[data.result ?? ""] ?? data.result}
                          </span>
                          {data.message && <span className="mt-1 block whitespace-pre-line text-muted">{data.message}</span>}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Статус">
            <StatusForm orderId={order.id} status={order.status} emailEnabled={emailConfig().enabled} />
          </Panel>

          <Panel title="Клиент">
            <div className="space-y-2 text-[14px]">
              <div className="text-[16px] text-white">
                {order.first_name} {order.last_name}
              </div>
              <a href={`tel:${order.phone}`} className="flex items-center gap-2 text-muted hover:text-white">
                <Phone className="h-4 w-4 text-accent-ink" /> {order.phone}
              </a>
              <a href={`mailto:${order.email}`} className="flex items-center gap-2 break-all text-muted hover:text-white">
                <Mail className="h-4 w-4 flex-none text-accent-ink" /> {order.email}
              </a>
              {order.customer_id && (
                <Link href={`/admin/klienti/${order.customer_id}`} className="inline-block pt-1 text-[13px] text-accent-ink hover:underline">
                  Профил на клиента →
                </Link>
              )}
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

          <Panel title="Еконт">
            <dl className="space-y-2 text-[14px]">
              {order.shipping_weight_kg !== null && (
                <Row label="Тегло" value={`${String(order.shipping_weight_kg).replace(".", ",")} кг`} />
              )}
              {order.shipping_source && (
                <Row
                  label="Цена за клиента"
                  value={
                    order.shipping_source === "econt"
                      ? "по тарифата на Еконт"
                      : order.shipping_source === "free"
                        ? "безплатна"
                        : "резервна цена (Еконт не отговори)"
                  }
                />
              )}
              {shipment && (
                <>
                  <Row
                    label="Товарителница"
                    value={[
                      shipment.number,
                      shipment.state !== "created" && (shipmentStateLabels[shipment.state] ?? shipment.state).toLowerCase(),
                      shipment.env === "demo" && "проба",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  {shipment.state === "created" && (
                    <>
                      {shipment.status && <Row label="Статус" value={shipment.status} />}
                      {shipment.expected_at && !shipment.delivered_at && (
                        <Row label="Очаквана доставка" value={formatDay(shipment.expected_at)} />
                      )}
                      {shipment.delivered_at && <Row label="Доставена" value={formatDate(shipment.delivered_at)} />}
                      {shipment.price_cents !== null && <Row label="Цена в Еконт" value={formatPrice(shipment.price_cents)} />}
                    </>
                  )}
                </>
              )}
            </dl>
            {shipment?.error && <p className="mt-3 text-[13px] text-danger">{shipment.error}</p>}
            {shipment?.pdf_url && shipment.state === "created" && (
              <a
                href={shipment.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-[13px] text-accent-ink hover:underline"
              >
                <FileText className="h-4 w-4" /> Товарителница (PDF)
              </a>
            )}
            {shipment?.state === "created" && shipmentEvents.length > 0 && (
              <ol className="mt-4 space-y-2 border-t border-line pt-3 text-[13px]">
                {shipmentEvents.slice(0, 6).map((ev, i) => (
                  <li key={i}>
                    <span className="text-dim">{formatDate(ev.time)}</span> · <span className="text-text">{ev.text}</span>
                    {ev.place && <span className="text-muted"> — {ev.place}</span>}
                  </li>
                ))}
              </ol>
            )}
            {!shipment && <p className="text-[13px] text-muted">Още няма товарителница.</p>}
            <ShipmentButtons orderId={order.id} state={shipment?.state ?? null} delivered={Boolean(shipment?.delivered_at)} />
          </Panel>

          {invoice && (
            <Panel title={invoice.type === "person" ? "Фактура — физическо лице" : "Фактура — фирма"}>
              <dl className="space-y-2 text-[14px]">
                {invoice.type === "person" ? (
                  <>
                    <Row label="Име" value={invoice.name ?? "—"} />
                    {invoice.egn && <Row label="ЕГН" value={invoice.egn} />}
                  </>
                ) : (
                  <>
                    <Row label="Фирма" value={invoice.company ?? "—"} />
                    <Row label="ЕИК / Булстат" value={invoice.eik ?? "—"} />
                    {invoice.vat && <Row label="ДДС №" value={invoice.vat} />}
                    <Row label="МОЛ" value={invoice.mol ?? "—"} />
                  </>
                )}
                <Row label="Адрес" value={invoice.address ?? "—"} />
              </dl>
            </Panel>
          )}

          {legal && (
            <Panel title="Правен запис">
              <dl className="space-y-2 text-[14px]">
                {legal.terms && <Row label="Общи условия" value={`версия ${legal.terms.version}`} />}
                {legal.privacy && <Row label="Поверителност" value={`версия ${legal.privacy.version}`} />}
                <Row label="Приети" value={formatDate(legal.accepted_at)} />
              </dl>
              <p className="mt-3 text-[13px] text-muted">„{legal.consent}“</p>
              {legal.terms && (
                <p className="mt-2 break-all font-mono text-[11px] text-dim" title="SHA-256 на текста на Общите условия">
                  SHA-256 {legal.terms.sha256}
                </p>
              )}
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

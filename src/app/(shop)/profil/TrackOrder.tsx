"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Check, PackageSearch, Ticket, X } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import { orderStatusLabels, paymentLabels, shippingLabels, type PaymentMethod, type ShippingMethod } from "@/lib/orders";
import { trackOrder, type TrackState } from "./actions";
import { keepValues } from "@/lib/forms";

const steps = ["new", "confirmed", "processing", "shipped", "delivered"] as const;

export function TrackOrder() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, null);
  const order = state?.order;

  return (
    <div className="space-y-8">
      <form onSubmit={keepValues(action)} className="cut-frame cut-lg">
        <div className="cut-inner grid gap-4 bg-surface-2 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-8">
          <div>
            <label htmlFor="t-number" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
              Номер на поръчката
            </label>
            <input id="t-number" name="number" placeholder="GS-100001" required className="input uppercase" />
          </div>
          <div>
            <label htmlFor="t-email" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
              Имейл от поръчката
            </label>
            <input id="t-email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <PackageSearch className="h-4 w-4" /> {pending ? "Търсене…" : "Провери"}
          </button>
          {state?.error && (
            <p role="alert" className="text-[14px] text-accent sm:col-span-3">
              {state.error}
            </p>
          )}
        </div>
      </form>

      {order && (
        <section aria-live="polite" className="bg-surface-2 p-6 ring-1 ring-line-soft sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[1.5px] text-dim">Поръчка</div>
              <div className="font-display text-[26px] text-white">{order.number}</div>
              <div className="text-[13px] text-muted">от {formatDate(order.created_at)}</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] uppercase tracking-[1.5px] text-dim">Общо</div>
              <div className="font-display text-[24px] text-white">{formatPrice(order.total_cents)}</div>
            </div>
          </div>

          {order.status === "cancelled" || order.status === "returned" ? (
            <p className="mt-8 flex items-center gap-2 bg-bg-deep p-4 text-white">
              <X className="h-5 w-5 text-accent" /> {orderStatusLabels[order.status]}
            </p>
          ) : (
            <ol className="mt-8 grid grid-cols-5 gap-2" aria-label="Статус на поръчката">
              {steps.map((s, i) => {
                const reached = steps.indexOf(order.status as (typeof steps)[number]) >= i;
                return (
                  <li key={s} className="text-center" aria-current={order.status === s ? "step" : undefined}>
                    <div className={`mx-auto mb-2 h-1.5 ${reached ? "bg-accent" : "bg-line"}`} />
                    <span
                      className={`inline-flex items-center gap-1 text-[12px] sm:text-[13px] ${reached ? "text-white" : "text-dim"}`}
                    >
                      {reached && <Check className="hidden h-3.5 w-3.5 text-accent sm:inline" />}
                      {orderStatusLabels[s]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <ul className="mt-8 divide-y divide-line-soft border-y border-line-soft text-[14px]">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4 py-3">
                <span className="text-text">
                  {item.qty} × {item.name}
                </span>
                <span className="whitespace-nowrap text-white">{formatPrice(item.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          {order.raffles.length > 0 && (
            <ul className="mt-6 space-y-2">
              {order.raffles.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/tomboli/${r.slug}`}
                    className="flex items-center gap-3 bg-accent/10 p-3 text-[14px] ring-1 ring-accent/30 hover:ring-accent"
                  >
                    <Ticket className="h-4 w-4 flex-none text-accent" />
                    <span>
                      <b className="font-medium text-white">{r.entries}</b> {r.entries === 1 ? "участие" : "участия"} в „{r.title}“
                      {r.status === "drawn" && " — тегленето е проведено"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[13px] text-muted">
            {shippingLabels[order.shipping_method as ShippingMethod]} · {paymentLabels[order.payment_method as PaymentMethod]} ·
            последна промяна {formatDate(order.updated_at)}
          </p>
        </section>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Tag, Ticket, X } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { normalizeCode } from "@/lib/promo";
import type { Quote, RafflePreview } from "@/lib/orders";
import { useCart } from "./CartProvider";

type Props = {
  quote: (Quote & { promoError: string | null; raffles?: RafflePreview[] }) | null;
  pending: boolean;
  error: string | null;
  shippingKnown?: boolean;
  children?: React.ReactNode;
};

/** Обобщение с промо код и суми — общо за количката и за поръчката. */
export function OrderSummary({ quote, pending, error, shippingKnown = false, children }: Props) {
  const { promoCode, setPromoCode, subtotal } = useCart();
  const [input, setInput] = useState("");

  const applied = quote?.promo?.ok ? quote.promo : null;
  const promoError = quote?.promoError ?? null;
  const shipping = quote ? quote.shipping_cents - quote.shipping_discount_cents : 0;
  const total = quote ? (shippingKnown ? quote.total_cents : quote.total_cents - shipping) : subtotal;
  const vat = Math.round(total - total / 1.2);

  return (
    <div className="cut-frame">
      <div className="cut-inner space-y-5 bg-surface-2 p-6">
        <h2 className="h-display flex items-center justify-between text-[18px]">
          Обобщение
          {pending && <Loader2 className="h-4 w-4 animate-spin text-dim" aria-label="Изчисляване" />}
        </h2>

        {promoCode ? (
          <div
            className={`flex items-center justify-between gap-3 px-3 py-2.5 text-[14px] ring-1 ${
              promoError ? "bg-danger/10 ring-danger/40" : "bg-ok/10 ring-ok/30"
            }`}
          >
            <span className="flex items-center gap-2">
              {promoError ? <X className="h-4 w-4 text-danger" /> : <Check className="h-4 w-4 text-ok" />}
              <span className="font-display tracking-wide text-white">{promoCode}</span>
            </span>
            <button
              type="button"
              onClick={() => setPromoCode(null)}
              className="text-[12px] uppercase tracking-wide text-dim hover:text-white"
            >
              Премахни
            </button>
          </div>
        ) : (
          <form
            method="post"
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const code = normalizeCode(input);
              if (code) setPromoCode(code);
              setInput("");
            }}
          >
            <label htmlFor="promo-code" className="sr-only">
              Промо код
            </label>
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
              <input
                id="promo-code"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Промо код"
                autoComplete="off"
                className="input !h-10 pl-9 uppercase placeholder:normal-case"
              />
            </div>
            <button type="submit" className="btn btn-sm btn-ghost !h-10" disabled={!input.trim()}>
              Приложи
            </button>
          </form>
        )}
        {promoError && (
          <p role="alert" className="-mt-2 text-[13px] text-danger">
            {promoError}
            {quote?.promo?.reason === "min_subtotal" && quote.promo.min_subtotal_cents
              ? ` Минимум: ${formatPrice(quote.promo.min_subtotal_cents)}.`
              : ""}
          </p>
        )}

        <dl className="space-y-2 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted">Продукти</dt>
            <dd className="text-white">{formatPrice(quote?.subtotal_cents ?? subtotal)}</dd>
          </div>
          {applied && quote && quote.discount_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Отстъпка ({applied.code})</dt>
              <dd className="text-ok">−{formatPrice(quote.discount_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Доставка</dt>
            <dd className="text-white">
              {!shippingKnown || !quote ? (
                <span className="text-muted">при поръчка</span>
              ) : shipping === 0 ? (
                <span className="text-ok">безплатна</span>
              ) : (
                formatPrice(shipping)
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="text-white">Общо с ДДС</dt>
            <dd className="font-display text-[24px] text-white">{formatPrice(total)}</dd>
          </div>
          <p className="text-right text-[12px] text-dim">включва {formatPrice(vat)} ДДС</p>
        </dl>

        {quote?.raffles?.map((r) => {
          const amount = quote.subtotal_cents - quote.discount_cents;
          return (
            <Link
              key={r.slug}
              href={`/tomboli/${r.slug}`}
              className="flex items-start gap-3 bg-accent/10 p-3 text-[13px] ring-1 ring-accent/30 hover:ring-accent"
            >
              <Ticket className="mt-0.5 h-4 w-4 flex-none text-accent-ink" />
              {r.entries > 0 ? (
                <span className="text-text">
                  С тази поръчка печелите <b className="font-medium text-white">{r.entries}</b>{" "}
                  {r.entries === 1 ? "участие" : "участия"} в „{r.title}“
                </span>
              ) : (
                <span className="text-text">
                  Добавете още {formatPrice(Math.max(0, r.min_order_cents - amount))}, за да участвате в „{r.title}“
                </span>
              )}
            </Link>
          );
        })}

        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

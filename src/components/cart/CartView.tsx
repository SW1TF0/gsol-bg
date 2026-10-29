"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCart } from "./CartProvider";
import { OrderSummary } from "./OrderSummary";
import { useQuote } from "./useQuote";

export function CartView({ phone, phoneHref }: { phone: string; phoneHref: string }) {
  const { lines, ready, setQty, remove } = useCart();
  const { quote, pending, error } = useQuote();

  if (!ready) return <div className="h-64 animate-pulse bg-surface-2" aria-busy="true" />;

  if (!lines.length) {
    return (
      <div className="cut-frame cut-lg mx-auto max-w-xl">
        <div className="cut-inner bg-surface-2 p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-accent-ink" strokeWidth={1.5} />
          <p className="h-display mt-5 text-[22px]">Количката е празна</p>
          <p className="mt-2 text-muted">Разгледайте промоциите или изберете готова конфигурация.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/promocii" className="btn btn-primary">
              Промоции
            </Link>
            <Link href="/katalog/kompyutri" className="btn btn-ghost">
              Конфигурации
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-line-soft border-y border-line-soft">
        {lines.map((line) => (
          <li key={line.id} className="grid grid-cols-[88px_1fr] gap-4 py-5 sm:grid-cols-[100px_1fr_auto] sm:items-center">
            <Link href={`/produkt/${line.slug}`} className="relative block aspect-square bg-plate">
              {line.image && (
                <Image src={line.image} alt="" fill sizes="100px" className="object-contain p-2 mix-blend-multiply" />
              )}
            </Link>
            <div className="min-w-0">
              <Link href={`/produkt/${line.slug}`} className="line-clamp-2 text-[14px] text-white hover:text-accent-ink">
                {line.name}
              </Link>
              <p className="mt-1 text-[13px] text-dim">{formatPrice(line.price)} / бр.</p>
              <button
                type="button"
                onClick={() => remove(line.id)}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-dim hover:text-accent-ink"
              >
                <Trash2 className="h-3.5 w-3.5" /> Премахни
              </button>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-6 sm:col-span-1 sm:justify-end">
              <div className="flex h-10 items-center bg-surface-2 ring-1 ring-line">
                <button
                  type="button"
                  aria-label="Намали количеството"
                  onClick={() => setQty(line.id, line.qty - 1)}
                  className="flex h-full w-9 items-center justify-center text-muted hover:text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-display text-white">{line.qty}</span>
                <button
                  type="button"
                  aria-label="Увеличи количеството"
                  onClick={() => setQty(line.id, line.qty + 1)}
                  className="flex h-full w-9 items-center justify-center text-muted hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <LineTotal
                total={line.price * line.qty}
                discount={quote?.lines.find((q) => q.product_id === line.id)?.discount_cents ?? 0}
              />
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit lg:sticky lg:top-[94px]">
        <OrderSummary quote={quote} pending={pending} error={error}>
          <Link href="/porachka" className="btn btn-primary w-full">
            Продължи към поръчка
          </Link>
          <p className="text-[12px] text-dim">
            Без регистрация · Не дължите нищо преди потвърждение · Въпроси на{" "}
            <a href={phoneHref} className="text-muted hover:text-white">
              {phone}
            </a>
          </p>
        </OrderSummary>
      </aside>
    </div>
  );
}

function LineTotal({ total, discount }: { total: number; discount: number }) {
  return (
    <div className="w-28 text-right">
      {discount > 0 && <s className="block text-[12px] text-dim">{formatPrice(total)}</s>}
      <span className="font-display text-[18px] text-white">{formatPrice(total - discount)}</span>
    </div>
  );
}

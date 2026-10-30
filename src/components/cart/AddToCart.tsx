"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart, type CartLine } from "./CartProvider";
import { StaffQuoteButton } from "@/components/StaffQuoteButton";
import { formatPrice } from "@/lib/format";

type Item = Omit<CartLine, "qty">;

/** Малкият бутон в продуктовите карти. */
export function AddToCartButton({ item, disabled }: { item: Item; disabled?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        add(item);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
      className="btn btn-sm btn-primary w-full"
    >
      {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      {added ? "Добавено" : "В количката"}
    </button>
  );
}

/** Блокът за покупка на продуктовата страница: количество, добавяне и „купи сега“.
 *  На телефон, щом блокът излезе от екрана, долу остава лента с цената и бутона. */
export function BuyBox({ item, disabled }: { item: Item; disabled?: boolean }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Лентата се показва само когато блокът е над екрана (прочетен), не преди да е стигнат
    const io = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Докато лентата е видима, долният край на страницата (футърът) не остава под нея
  useEffect(() => {
    document.body.classList.toggle("max-md:pb-[72px]", offscreen);
    return () => document.body.classList.remove("max-md:pb-[72px]");
  }, [offscreen]);

  return (
    <div ref={box} className="flex flex-wrap items-center gap-3">
      <div className="flex h-[50px] items-center bg-surface-2 ring-1 ring-line">
        <button
          type="button"
          aria-label="Намали количеството"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="flex h-full w-11 items-center justify-center text-muted hover:text-white"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center font-display text-lg text-white" aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          aria-label="Увеличи количеството"
          onClick={() => setQty((q) => Math.min(99, q + 1))}
          className="flex h-full w-11 items-center justify-center text-muted hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          add(item, qty);
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
        className="btn btn-lg btn-primary flex-1"
      >
        {added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
        {added ? "Добавено в количката" : "Добави в количката"}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          add(item, qty, { silent: true });
          router.push("/kolichka");
        }}
        className="btn btn-lg btn-outline"
      >
        <span>Купи сега</span>
      </button>
      <StaffQuoteButton
        source="product"
        label="Изготви оферта"
        items={() => [{ product_id: Number(item.id), qty }]}
        className="basis-full"
      />
      {offscreen && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-bg-deep/95 px-4 py-3 backdrop-blur md:hidden">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] text-muted">{item.name}</span>
            <span className="font-display text-[18px] text-white">{formatPrice(item.price)}</span>
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              add(item, qty);
              setAdded(true);
              setTimeout(() => setAdded(false), 1800);
            }}
            className="btn btn-primary"
          >
            {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            {added ? "Добавено" : "В количката"}
          </button>
        </div>
      )}
    </div>
  );
}

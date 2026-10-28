"use client";

import { useEffect, useState, useTransition } from "react";
import { quoteCart } from "@/app/(shop)/actions";
import type { Quote, RafflePreview, ShippingMethod } from "@/lib/orders";
import { useCart } from "./CartProvider";

type QuoteState = (Quote & { promoError: string | null; raffles: RafflePreview[] }) | null;

/** Взима оферта от сървъра при всяка промяна на количката, кода или доставката. */
export function useQuote(shipping: ShippingMethod = "econt_office") {
  const { lines, promoCode, ready, syncWithQuote } = useCart();
  const [quote, setQuote] = useState<QuoteState>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const key = JSON.stringify([lines.map((l) => [l.id, l.qty]), promoCode, shipping]);

  useEffect(() => {
    if (!ready || !lines.length) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const q = await quoteCart(
            lines.map((l) => ({ productId: l.id, qty: l.qty })),
            promoCode,
            shipping,
          );
          if (cancelled) return;
          setQuote(q);
          setError(null);
          syncWithQuote(q.lines, q.missing);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "Грешка при изчисляване на цената.");
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // key обобщава lines/promoCode/shipping; syncWithQuote е стабилна за целите на офертата
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return { quote: lines.length ? quote : null, error, pending };
}

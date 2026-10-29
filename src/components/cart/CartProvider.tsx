"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Количката живее в браузъра (localStorage). При поръчка цените се проверяват отново на сървъра.

export type CartLine = {
  id: number;
  slug: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  promoCode: string | null;
  setPromoCode: (code: string | null) => void;
  /** Обновява цените по офертата от сървъра и маха продуктите, които вече не се предлагат. */
  syncWithQuote: (lines: { product_id: number; unit_price_cents: number; name: string }[], missing: number[]) => void;
  /** silent: без известие (напр. „Купете сега“ води направо в количката) */
  add: (line: Omit<CartLine, "qty">, qty?: number, options?: { silent?: boolean }) => void;
  /** Последно добавеният продукт — за известието „Продуктът е добавен в количката“ */
  added: { name: string; image?: string; at: number } | null;
  dismissAdded: () => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "gsol-cart-v1";
const PROMO_KEY = "gsol-promo-v1";

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // няма достъп до хранилището (частен прозорец) — количката остава само в паметта
  }
}

function readPromo() {
  try {
    return localStorage.getItem(PROMO_KEY);
  } catch {
    return null;
  }
}

function writePromo(code: string | null) {
  try {
    if (code) localStorage.setItem(PROMO_KEY, code);
    else localStorage.removeItem(PROMO_KEY);
  } catch {
    // виж write()
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [promoCode, setPromoState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [added, setAdded] = useState<CartContextValue["added"]>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- еднократно зареждане от localStorage след хидратация
    setLines(read());
    setPromoState(readPromo());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setLines(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      write(next);
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      promoCode,
      setPromoCode: (code) => {
        setPromoState(code);
        writePromo(code);
      },
      syncWithQuote: (quoted, missing) =>
        update((prev) => {
          const next = prev
            .filter((l) => !missing.includes(l.id))
            .map((l) => {
              const q = quoted.find((x) => x.product_id === l.id);
              return q && (q.unit_price_cents !== l.price || q.name !== l.name)
                ? { ...l, price: q.unit_price_cents, name: q.name }
                : l;
            });
          const changed = next.length !== prev.length || next.some((l, i) => l !== prev[i]);
          return changed ? next : prev;
        }),
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
      add: (line, qty = 1, options) => {
        update((prev) => {
          const existing = prev.find((l) => l.id === line.id);
          if (existing) return prev.map((l) => (l.id === line.id ? { ...l, qty: l.qty + qty } : l));
          return [...prev, { ...line, qty }];
        });
        if (!options?.silent) setAdded({ name: line.name, image: line.image, at: Date.now() });
      },
      added,
      dismissAdded: () => setAdded(null),
      setQty: (id, qty) =>
        update((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(99, qty)) } : l))),
      remove: (id) => update((prev) => prev.filter((l) => l.id !== id)),
      clear: () => update(() => []),
    }),
    [lines, ready, promoCode, update, added],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart трябва да е вътре в CartProvider");
  return ctx;
}

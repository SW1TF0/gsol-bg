"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/kolichka"
      className="relative flex h-10 w-10 items-center justify-center text-white transition-colors hover:text-accent-ink"
      aria-label={`Количка${ready && count ? `, ${count} продукта` : ""}`}
    >
      <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
      {ready && count > 0 && (
        <span className="absolute -right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center bg-accent px-1 font-display text-[11px] font-medium text-on-accent">
          {count}
        </span>
      )}
    </Link>
  );
}

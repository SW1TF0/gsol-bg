"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleCheck, X } from "lucide-react";
import { useCart } from "./CartProvider";

/**
 * „Продуктът е добавен в количката“ под хедъра. Рисува се само докато се вижда —
 * невидим слой не бива да хваща натисканията.
 */
export function CartToast() {
  const { added, dismissAdded } = useCart();

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(dismissAdded, 6000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissAdded();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
    // нов продукт → нов таймер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [added?.at]);

  if (!added) return null;
  return (
    <div
      role="status"
      className="fixed right-4 top-[calc(var(--header-sticky)+12px)] z-[60] w-[min(92vw,380px)] bg-surface-2 p-4 shadow-2xl ring-1 ring-line"
    >
      <div className="flex items-start gap-3">
        {added.image ? (
          <span className="relative h-14 w-14 flex-none bg-plate">
            <Image src={added.image} alt="" fill sizes="56px" className="object-contain p-1" />
          </span>
        ) : (
          <CircleCheck className="h-6 w-6 flex-none text-ok" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[14px] text-ok">
            <CircleCheck className="h-4 w-4" /> Продуктът е добавен в количката
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-muted">{added.name}</p>
        </div>
        <button type="button" onClick={dismissAdded} aria-label="Затвори" className="text-dim hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href="/kolichka" onClick={dismissAdded} className="btn btn-sm btn-ghost">
          Вижте количката
        </Link>
        <Link href="/porachka" onClick={dismissAdded} className="btn btn-sm btn-primary">
          Към поръчка
        </Link>
      </div>
    </div>
  );
}

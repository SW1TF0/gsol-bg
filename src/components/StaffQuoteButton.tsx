"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { canMakeQuotes, quoteFromShop } from "@/app/admin/(panel)/oferti/actions";

// „Изготви оферта“ / „Оферта от количката“ — само за служителите с оферти. За клиентите не се рисува:
// питаме сървъра само ако в браузъра има бисквитка за вход (иначе страницата не прави заявка).

const hasSession = () => /(^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

export function StaffQuoteButton({
  items,
  source,
  label,
  className = "",
}: {
  items: () => { product_id: number; qty: number }[];
  source: "product" | "cart";
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!hasSession()) return;
    let active = true;
    canMakeQuotes().then((ok) => active && setAllowed(ok));
    return () => {
      active = false;
    };
  }, []);

  if (!allowed) return null;
  return (
    <div className={className}>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await quoteFromShop(items(), source, window.location.pathname + window.location.search);
            if ("error" in res) setError(res.error);
            else router.push(`/admin/oferti/${res.id}`);
          })
        }
        className="flex items-center gap-2 border border-dashed border-accent/60 px-3 py-2 text-[13px] text-accent-ink hover:bg-accent/10"
        title="Видимо само за служители"
      >
        <FileSpreadsheet className="h-4 w-4" /> {pending ? "Създаване…" : label}
      </button>
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  );
}

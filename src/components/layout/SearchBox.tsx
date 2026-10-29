"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { suggest } from "@/app/(shop)/search-actions";

type Hit = Awaited<ReturnType<typeof suggest>>[number];

/** Търсачката в хедъра: бързи резултати докато се пише; Enter води към пълното търсене */
export function SearchBox({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      start(async () => {
        const result = await suggest(term);
        if (!cancelled) setHits(result);
      });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const term = q.trim();
  const show = open && term.length >= 2 && hits !== null;

  return (
    <div ref={box} className={`relative ${className}`}>
      <form action="/tursene" role="search" onSubmit={() => setOpen(false)}>
        <label htmlFor={id} className="sr-only">
          Търсене на продукт
        </label>
        <input
          id={id}
          name="q"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (e.target.value.trim().length < 2) setHits(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Продукт, компонент, модел"
          autoComplete="off"
          role="combobox"
          aria-controls={`${id}-list`}
          aria-expanded={show}
          aria-autocomplete="list"
          className="h-10 w-full bg-surface-2 pl-10 pr-9 text-[14px] text-white ring-1 ring-line outline-none placeholder:text-dim focus:ring-accent"
        />
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        {pending && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-dim" />}
      </form>

      {show && (
        <div id={`${id}-list`} className="absolute inset-x-0 top-full z-50 mt-1 bg-surface-2 shadow-2xl ring-1 ring-line">
          {hits.length ? (
            <ul>
              {hits.map((h) => (
                <li key={h.slug}>
                  <Link
                    href={`/produkt/${h.slug}`}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface"
                  >
                    <span className="relative h-10 w-10 flex-none bg-plate">
                      {h.image && <Image src={h.image} alt="" fill sizes="40px" className="object-contain p-0.5" />}
                    </span>
                    <span className="line-clamp-2 min-w-0 flex-1 text-[13px] text-text">{h.name}</span>
                    <span className="whitespace-nowrap text-[13px] text-white">{formatPrice(h.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-[13px] text-muted">Няма бързи резултати — натиснете Enter за пълно търсене.</p>
          )}
          <Link
            href={`/tursene?q=${encodeURIComponent(term)}`}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="block border-t border-line px-3 py-2.5 text-[13px] text-accent-ink hover:bg-surface"
          >
            Всички резултати за „{term}“ →
          </Link>
        </div>
      )}
    </div>
  );
}

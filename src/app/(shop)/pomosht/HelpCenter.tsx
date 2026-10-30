"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { HelpCategory } from "@/lib/help-content";

type Item = { category: string; question: string; text: string; answer: React.ReactNode };

/** Търсене и теми в браузъра: думите се търсят във въпроса и в отговора */
export function HelpCenter({ categories, items }: { categories: HelpCategory[]; items: Item[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState<number | null>(0);

  const shown = useMemo(() => {
    const words = query.toLocaleLowerCase("bg").split(/\s+/).filter(Boolean);
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => category === "all" || item.category === category)
      .filter(({ item }) => {
        const hay = `${item.question} ${item.text}`.toLocaleLowerCase("bg");
        return words.every((w) => hay.includes(w));
      });
  }, [items, query, category]);

  const count = (id: string) => (id === "all" ? items.length : items.filter((i) => i.category === id).length);

  return (
    <div>
      <label className="relative block max-w-2xl">
        <span className="sr-only">Търсене в помощта</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-dim" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: смяна на процесор, доставка, гаранция…"
          className="input !h-14 pl-12 text-[16px]"
        />
      </label>

      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Теми">
        {[{ id: "all", label: "Всички теми" }, ...categories].map((c) => (
          <button key={c.id} type="button" onClick={() => setCategory(c.id)} className="chip" data-active={category === c.id} aria-pressed={category === c.id}>
            {c.label} <span className="text-dim">{count(c.id)}</span>
          </button>
        ))}
      </div>

      <p className="mt-6 text-[13px] text-dim" aria-live="polite">
        {shown.length} {shown.length === 1 ? "отговор" : "отговора"}
      </p>

      {shown.length ? (
        <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft">
          {shown.map(({ item, index }) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => setOpen((o) => (o === index ? null : index))}
                aria-expanded={open === index}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-[16px] text-white hover:text-accent-ink"
              >
                {item.question}
                <ChevronDown className={`h-5 w-5 flex-none text-dim transition-transform ${open === index ? "rotate-180" : ""}`} />
              </button>
              {open === index && <div className="-mt-2 pb-4">{item.answer}</div>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 bg-surface-2 p-6">
          <p className="h-display text-[18px]">Няма отговор по тази дума</p>
          <p className="mt-2 text-muted">Опитайте с друга дума, изберете тема или ни се обадете.</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ClipboardCopy, Printer } from "lucide-react";

// Лентата над документа (не се печата): печат / PDF, копиране на текст за имейл и връзки.
// PDF-ът е от браузъра — заглавието на страницата става име на файла (напр. GSOL-OF-….pdf).

export function DocToolbar({
  printLabel,
  autoPrint,
  copyText,
  links,
}: {
  printLabel: string;
  autoPrint?: boolean;
  copyText?: string;
  links: { href: string; label: string }[];
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="no-print sticky top-0 z-10 border-b border-[#e5e7eb] bg-[#f8fafc]">
      <div className="mx-auto flex max-w-[860px] flex-wrap items-center gap-2 px-4 py-3 text-[14px]">
        <button type="button" onClick={() => window.print()} className="flex items-center gap-2 bg-[#111827] px-4 py-2 text-[#fff] hover:bg-[#1f2937]">
          <Printer className="h-4 w-4" /> {printLabel}
        </button>
        {copyText && (
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(copyText);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            className="flex items-center gap-2 border border-[#d1d5db] bg-[#fff] px-4 py-2 text-[#111827] hover:bg-[#f3f4f6]"
          >
            {copied ? <Check className="h-4 w-4 text-[#16a34a]" /> : <ClipboardCopy className="h-4 w-4" />}
            {copied ? "Копирано" : "Копирай за имейл"}
          </button>
        )}
        <span className="ml-auto flex flex-wrap gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-[#1d4ed8] hover:underline">
              {l.label}
            </Link>
          ))}
        </span>
      </div>
    </div>
  );
}

/** Знакът GSOL с постоянни цветове — документите са еднакви в светла и тъмна тема */
export function DocLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
        <path d="M12 2 2 12v26h26l10-10V2H12Z" fill="#ff002b" />
        <path d="M15 11h15v5H17l-2 2v6l2 2h8v-4h-5v-4h10v13H14l-5-5V16l6-5Z" fill="#fff" />
      </svg>
      <span className="font-display text-[24px] font-semibold uppercase tracking-wide text-[#111827]">
        GSOL<span className="normal-case text-[#6b7280]">.bg</span>
      </span>
    </div>
  );
}

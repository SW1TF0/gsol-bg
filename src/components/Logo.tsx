import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // Ъглов знак „G“ в духа на скосените форми
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M12 2 2 12v26h26l10-10V2H12Z" fill="var(--color-accent)" />
      <path d="M15 11h15v5H17l-2 2v6l2 2h8v-4h-5v-4h10v13H14l-5-5V16l6-5Z" fill="var(--color-on-accent)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="GSOL — начало">
      <LogoMark />
      <span className="font-display text-[22px] font-semibold uppercase tracking-wide text-white">
        GSOL<span className="normal-case text-dim">.bg</span>
      </span>
    </Link>
  );
}

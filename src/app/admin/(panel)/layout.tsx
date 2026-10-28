import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { AdminNav, AdminNavFallback } from "@/components/admin/AdminNav";
import { requireStaff, roleLabels } from "@/lib/admin/auth";
import { signOut } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: { default: "Админ", template: "%s | GSOL админ" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh bg-bg-deep">
      <aside className="sticky top-0 hidden h-dvh w-[250px] flex-none flex-col border-r border-line-soft bg-black px-3 py-5 shadow-[inset_0_2px_0_var(--color-accent)] lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2.5 px-3">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-[18px] uppercase tracking-wide text-white">
            GSOL <span className="text-accent">админ</span>
          </span>
        </Link>
        <Suspense fallback={<AdminNavFallback />}>
          <AdminNav />
        </Suspense>
        <div className="mt-auto space-y-2 border-t border-line-soft px-3 pt-4">
          <Suspense fallback={<div className="h-10" />}>
            <CurrentUser />
          </Suspense>
          <Link href="/" className="flex items-center gap-2 text-[13px] text-muted hover:text-white">
            <ExternalLink className="h-3.5 w-3.5" /> Към сайта
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-line-soft bg-black px-4 py-3 shadow-[inset_0_2px_0_var(--color-accent)] lg:hidden">
          <Link href="/admin" className="font-display uppercase text-white">
            GSOL <span className="text-accent">админ</span>
          </Link>
          <nav className="flex gap-3 text-[13px]">
            <Link href="/admin/porachki">Поръчки</Link>
            <Link href="/admin/produkti">Продукти</Link>
            <Link href="/admin/promo-kodove">Кодове</Link>
          </nav>
        </div>
        <main className="mx-auto max-w-[1280px] px-4 py-8 lg:px-8">
          <Suspense fallback={<AdminSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

async function CurrentUser() {
  const { user, staff } = await requireStaff();
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-[13px] text-white">{staff.display_name ?? user.email}</div>
        <div className="text-[11px] uppercase tracking-wide text-dim">{roleLabels[staff.role]}</div>
      </div>
      <form action={signOut}>
        <button type="submit" aria-label="Изход" className="p-2 text-muted hover:text-accent">
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-9 w-64 animate-pulse bg-surface-2" />
      <div className="h-96 animate-pulse bg-surface-2" />
    </div>
  );
}

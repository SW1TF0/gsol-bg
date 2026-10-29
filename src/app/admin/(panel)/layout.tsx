import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { AdminMobileMenu, AdminMobileMenuFallback, AdminNav, AdminNavFallback } from "@/components/admin/AdminNav";
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
          <RoleNav />
        </Suspense>
        <div className="mt-auto space-y-2 border-t border-line-soft px-3 pt-4">
          <SidebarFooter />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line-soft bg-black px-4 shadow-[inset_0_2px_0_var(--color-accent)] lg:hidden">
          <Link href="/admin" className="font-display uppercase text-white">
            GSOL <span className="text-accent">админ</span>
          </Link>
          <Suspense fallback={<AdminMobileMenuFallback />}>
            <RoleMobileMenu />
          </Suspense>
        </div>
        <main className="mx-auto max-w-[1280px] px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

async function RoleNav() {
  const { staff } = await requireStaff();
  return <AdminNav role={staff.role} />;
}

async function RoleMobileMenu() {
  const { staff } = await requireStaff();
  return <AdminMobileMenu role={staff.role} footer={<SidebarFooter />} />;
}

function SidebarFooter() {
  return (
    <>
      <Suspense fallback={<div className="h-10" />}>
        <CurrentUser />
      </Suspense>
      <Link href="/" className="flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ExternalLink className="h-3.5 w-3.5" /> Към сайта
      </Link>
    </>
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

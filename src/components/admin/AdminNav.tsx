"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Gauge, Inbox, Menu, Package, Receipt, Settings, Ticket, TicketPercent, Users, X } from "lucide-react";

const items = [
  { href: "/admin", label: "Табло", icon: Gauge, exact: true },
  { href: "/admin/porachki", label: "Поръчки", icon: Receipt },
  { href: "/admin/produkti", label: "Продукти", icon: Package },
  { href: "/admin/promo-kodove", label: "Промо кодове", icon: TicketPercent },
  { href: "/admin/tomboli", label: "Томболи", icon: Ticket },
  { href: "/admin/zapitvaniya", label: "Запитвания", icon: Inbox },
  { href: "/admin/stranitsi", label: "Страници", icon: FileText },
];

const soon = [
  { label: "Клиенти", icon: Users },
  { label: "Настройки", icon: Settings },
];

export function AdminNav() {
  return <NavList pathname={usePathname()} />;
}

/** Същото меню без активен елемент — показва се, докато адресът се зарежда */
export function AdminNavFallback() {
  return <NavList pathname="" />;
}

/** Бутон „Меню“ за тесни екрани — показва цялото меню и долната част на страничната лента */
export function AdminMobileMenu({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <MenuButton open={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col overflow-y-auto bg-black px-3 pb-6 pt-4">
          <NavList pathname={pathname} onNavigate={close} />
          <div className="mt-6 space-y-2 border-t border-line-soft px-3 pt-4">{footer}</div>
        </div>
      )}
    </>
  );
}

/** Неактивен бутон, докато адресът се зарежда */
export function AdminMobileMenuFallback() {
  return <MenuButton open={false} />;
}

function MenuButton({ open, onClick }: { open: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={open ? "Затвори менюто" : "Отвори менюто"}
      aria-expanded={open}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center text-white"
    >
      {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
    </button>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Админ меню" className="space-y-1">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex h-11 items-center gap-3 px-4 text-[14px] transition-colors ${
              active ? "bg-accent text-white" : "text-text hover:bg-surface hover:text-white"
            }`}
            style={{ clipPath: "polygon(0 100%, 0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%)" }}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
      <div className="px-4 pb-2 pt-6 text-[11px] uppercase tracking-[1.5px] text-dim">Скоро</div>
      {soon.map(({ label, icon: Icon }) => (
        <span key={label} className="flex h-10 items-center gap-3 px-4 text-[14px] text-dim">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          {label}
        </span>
      ))}
    </nav>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Gauge,
  Inbox,
  Menu,
  Package,
  Receipt,
  Settings,
  Ticket,
  TicketPercent,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { StaffRole } from "@/lib/staff";

// roles: кои роли виждат раздела (същите като в requireStaff на страницата); без roles — всички
const items: { href: string; label: string; icon: typeof Gauge; exact?: boolean; roles?: StaffRole[] }[] = [
  { href: "/admin", label: "Табло", icon: Gauge, exact: true },
  { href: "/admin/porachki", label: "Поръчки", icon: Receipt },
  { href: "/admin/produkti", label: "Продукти", icon: Package },
  { href: "/admin/klienti", label: "Клиенти", icon: Users, roles: ["admin", "manager", "sales"] },
  { href: "/admin/promo-kodove", label: "Промо кодове", icon: TicketPercent },
  { href: "/admin/tomboli", label: "Томболи", icon: Ticket, roles: ["admin", "manager"] },
  { href: "/admin/zapitvaniya", label: "Запитвания", icon: Inbox },
  { href: "/admin/stranitsi", label: "Страници", icon: FileText },
  { href: "/admin/sluzhiteli", label: "Служители", icon: UserCog, roles: ["admin"] },
  { href: "/admin/nastroyki", label: "Настройки", icon: Settings, roles: ["admin"] },
];

export function AdminNav({ role }: { role: StaffRole }) {
  return <NavList pathname={usePathname()} role={role} />;
}

/** Общите раздели без активен елемент — показват се, докато се зареждат адресът и ролята */
export function AdminNavFallback() {
  return <NavList pathname="" />;
}

/** Бутон „Меню“ за тесни екрани — показва цялото меню и долната част на страничната лента */
export function AdminMobileMenu({ footer, role }: { footer: React.ReactNode; role: StaffRole }) {
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
          <NavList pathname={pathname} role={role} onNavigate={close} />
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

function NavList({ pathname, role, onNavigate }: { pathname: string; role?: StaffRole; onNavigate?: () => void }) {
  const visible = items.filter((i) => !i.roles || (role && i.roles.includes(role)));
  return (
    <nav aria-label="Админ меню" className="space-y-1">
      {visible.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex h-11 items-center gap-3 px-4 text-[14px] transition-colors ${
              active ? "bg-accent text-on-accent" : "text-text hover:bg-surface hover:text-white"
            }`}
            style={{ clipPath: "polygon(0 100%, 0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%)" }}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

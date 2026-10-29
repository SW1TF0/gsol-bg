import Link from "next/link";
import { Mail, Truck } from "lucide-react";
import { AdminHeader, Panel, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { parseSettings, settingKeys } from "@/lib/settings";
import { emailConfig } from "@/lib/email/send";
import { BankForm, CompanyForm, ShippingForm } from "./forms";

export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const { db } = await requireStaff(["admin"]);
  const { data } = await db.from("settings").select("key, value, updated_at").in("key", [...settingKeys]);
  const settings = parseSettings(data ?? []);
  const lastSaved = (data ?? []).map((r) => r.updated_at).sort().at(-1);

  return (
    <>
      <AdminHeader
        title="Настройки"
        subtitle={`Фирмени данни, доставка и банкова сметка · последна промяна ${formatDate(lastSaved)}`}
      />
      {!settings.bank.iban && (
        <p className="mb-6 bg-accent/10 px-4 py-3 text-[14px] text-text ring-1 ring-accent/30">
          Няма въведен IBAN — клиентите, избрали банков превод, ще чакат данните от вас след потвърждението.
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <CompanyForm company={settings.company} />
        <div className="space-y-6">
          <Panel title="Еконт">
            <p className="text-[14px] text-muted">
              Жива цена по теглото, товарителници след поръчка, статус на пратките, достъп и тегла по категории.
            </p>
            <Link href="/admin/nastroyki/ekont" className="btn btn-sm btn-ghost mt-4">
              <Truck className="h-4 w-4" /> Настройки на Еконт
            </Link>
          </Panel>
          <ShippingForm shipping={settings.shipping} />
          <BankForm bank={settings.bank} />
          <Panel title="Имейли">
            <p className="text-[14px] text-muted">
              {emailConfig().enabled
                ? "Изпращането е включено: потвърждения до клиентите и известия до магазина."
                : "Изпращането още не е настроено — писмата не тръгват."}
            </p>
            <Link href="/admin/nastroyki/imeyli" className="btn btn-sm btn-ghost mt-4">
              <Mail className="h-4 w-4" /> Преглед и настройка
            </Link>
          </Panel>
        </div>
      </div>
    </>
  );
}

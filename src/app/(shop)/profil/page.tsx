import type { Metadata } from "next";
import Link from "next/link";
import { Ticket, UserRound } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { TrackOrder } from "./TrackOrder";

export const metadata: Metadata = {
  title: "Моите поръчки",
  description: "Проверете статуса на поръчката си с номера и имейла от поръчката.",
  robots: { index: false },
};

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Моите" accent="поръчки" tagline="Проверка на статус без регистрация" crumbs={[{ label: "Моите поръчки" }]} />
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pb-24 lg:grid-cols-[1fr_320px]">
        <TrackOrder />
        <aside className="h-fit space-y-4">
          <div className="bg-surface-2 p-6 ring-1 ring-line-soft">
            <UserRound className="h-6 w-6 text-accent-ink" strokeWidth={1.5} />
            <p className="h-display mt-4 text-[16px]">Клиентски профил — скоро</p>
            <p className="mt-2 text-[14px] text-muted">
              С профил ще виждате всички поръчки на едно място, запазени адреси и участията си в томболите.
            </p>
          </div>
          <div className="bg-surface-2 p-6 ring-1 ring-line-soft">
            <Ticket className="h-6 w-6 text-accent-ink" strokeWidth={1.5} />
            <p className="mt-4 text-[14px] text-muted">
              Номерът на поръчката е в потвърждението, което получавате след поръчка. Не го намирате?{" "}
              <Link href="/kontakti" className="text-white underline underline-offset-2">
                Пишете ни
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

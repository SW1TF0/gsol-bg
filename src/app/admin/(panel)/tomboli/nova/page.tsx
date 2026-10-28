import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { categoryOptions } from "../../promo-kodove/categories";
import { RaffleForm } from "../RaffleForm";

export const metadata = { title: "Нова томбола" };

export default async function NewRafflePage() {
  const { db } = await requireStaff(["admin", "manager"]);
  const categories = await categoryOptions(db);
  return (
    <>
      <Link href="/admin/tomboli" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички томболи
      </Link>
      <AdminHeader title="Нова томбола" subtitle="След записа добавете наградите и пуснете томболата като „Активна“" />
      <div className="max-w-4xl">
        <RaffleForm categories={categories} />
      </div>
    </>
  );
}

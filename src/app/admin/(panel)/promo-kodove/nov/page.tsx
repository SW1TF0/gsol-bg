import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { PromoForm } from "../PromoForm";
import { categoryOptions } from "../categories";

export const metadata = { title: "Нов промо код" };

export default async function NewPromoPage() {
  const { db } = await requireStaff(["admin", "manager"]);
  const categories = await categoryOptions(db);
  return (
    <>
      <Link href="/admin/promo-kodove" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички кодове
      </Link>
      <AdminHeader title="Нов промо код" subtitle="Един код за всички или партида уникални кодове (за флаери, партньори, томболи)" />
      <div className="max-w-4xl">
        <PromoForm categories={categories} />
      </div>
    </>
  );
}

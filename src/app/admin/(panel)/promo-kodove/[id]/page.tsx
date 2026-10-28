import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminHeader, Panel, Stat, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";
import { PromoForm } from "../PromoForm";
import { categoryOptions } from "../categories";
import { describeDiscount } from "../describe";

export const metadata = { title: "Промо код" };

export default async function PromoPage(props: PageProps<"/admin/promo-kodove/[id]">) {
  const { db } = await requireStaff(["admin", "manager"]);
  const id = Number((await props.params).id);
  if (!id) notFound();

  const [{ data: promo }, { data: uses }, categories] = await Promise.all([
    db.from("promo_codes").select("*").eq("id", id).maybeSingle(),
    db
      .from("promo_redemptions")
      .select("id, email, discount_cents, created_at, order_id")
      .eq("promo_code_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    categoryOptions(db),
  ]);
  if (!promo) notFound();

  const orderIds = (uses ?? []).map((u) => u.order_id);
  const { data: orders } = orderIds.length
    ? await db.from("orders").select("id, number, total_cents, status").in("id", orderIds)
    : { data: [] };
  const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
  const revenue = (orders ?? []).filter((o) => !["cancelled", "returned"].includes(o.status)).reduce((s, o) => s + o.total_cents, 0);
  const given = (uses ?? []).reduce((s, u) => s + u.discount_cents, 0);

  return (
    <>
      <Link
        href={promo.batch_id ? `/admin/promo-kodove?partida=${promo.batch_id}` : "/admin/promo-kodove"}
        className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> {promo.batch_id ? "Към партидата" : "Всички кодове"}
      </Link>
      <AdminHeader title={promo.code} subtitle={`${describeDiscount(promo)} · създаден ${formatDate(promo.created_at)}`} />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Ползвания" value={`${promo.times_used}${promo.usage_limit ? ` / ${promo.usage_limit}` : ""}`} />
        <Stat label="Оборот с кода" value={formatPrice(revenue)} />
        <Stat label="Дадена отстъпка" value={formatPrice(given)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <PromoForm
          categories={categories}
          defaults={{
            ...promo,
            percent: promo.percent === null ? null : Number(promo.percent),
          }}
        />
        <Panel title="Последни използвания" className="h-fit">
          {uses?.length ? (
            <ul className="space-y-3 text-[14px]">
              {uses.map((u) => {
                const o = orderById.get(u.order_id);
                return (
                  <li key={u.id} className="flex justify-between gap-3">
                    <div className="min-w-0">
                      {o ? (
                        <Link href={`/admin/porachki/${o.id}`} className="font-display text-white hover:text-accent">
                          {o.number}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <div className="truncate text-[12px] text-dim">{u.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-ok">−{formatPrice(u.discount_cents)}</div>
                      <div className="text-[12px] text-dim">{formatDate(u.created_at)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] text-muted">Кодът още не е използван.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

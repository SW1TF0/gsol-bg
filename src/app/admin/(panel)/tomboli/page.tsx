import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminHeader, Empty, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { raffleStatusLabels } from "@/lib/raffles";

export const metadata = { title: "Томболи" };

const tones: Record<string, string> = {
  draft: "bg-surface text-muted",
  active: "bg-accent text-white",
  drawn: "bg-ok text-black",
  cancelled: "bg-surface text-dim",
};

export default async function RafflesPage() {
  const { db } = await requireStaff(["admin", "manager"]);
  const { data } = await db
    .from("raffles")
    .select("id, title, slug, status, starts_at, ends_at, raffle_prizes(quantity)")
    .order("starts_at", { ascending: false });

  return (
    <>
      <AdminHeader
        title="Томболи"
        subtitle="Участията се изчисляват автоматично от потвърдените поръчки"
        actions={
          <Link href="/admin/tomboli/nova" className="btn btn-sm btn-primary">
            <Plus className="h-4 w-4" /> Нова томбола
          </Link>
        }
      />
      {data?.length ? (
        <Table head={["Томбола", "Период", "Награди", "Статус"]}>
          {data.map((r) => (
            <tr key={r.id} className="hover:bg-surface">
              <td className="px-4 py-3">
                <Link href={`/admin/tomboli/${r.id}`} className="text-white hover:text-accent">
                  {r.title}
                </Link>
                <div className="font-mono text-[12px] text-dim">/tomboli/{r.slug}</div>
              </td>
              <td className="px-4 py-3 text-[13px] text-muted">
                {formatDate(r.starts_at)} — {formatDate(r.ends_at)}
              </td>
              <td className="px-4 py-3 text-muted">{r.raffle_prizes.reduce((s, p) => s + p.quantity, 0)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex h-6 items-center px-2.5 font-display text-[11px] uppercase tracking-wide ${tones[r.status]}`}>
                  {raffleStatusLabels[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>
          Още няма томболи.{" "}
          <Link href="/admin/tomboli/nova" className="text-accent hover:underline">
            Създайте първата
          </Link>
          .
        </Empty>
      )}
    </>
  );
}

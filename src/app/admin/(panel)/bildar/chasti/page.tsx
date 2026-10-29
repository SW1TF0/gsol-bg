import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { AdminHeader, Empty, Table } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";
import { specLine } from "@/lib/builder/fields";
import { partKinds, partLabels, type PartKind } from "@/lib/builder/parts";
import { togglePartStock } from "../actions";

export const metadata = { title: "Части за билдъра" };

export default async function PartsPage(props: PageProps<"/admin/bildar/chasti">) {
  const { db } = await requireStaff(["admin", "manager"]);
  const vid = (await props.searchParams).vid;
  const kind = partKinds.includes(vid as PartKind) ? (vid as PartKind) : "cpu";

  const [{ data: parts }, { data: used }] = await Promise.all([
    db.from("components").select("*").eq("kind", kind).eq("is_active", true).order("cost_cents"),
    db.from("machine_parts").select("component_id").eq("kind", kind),
  ]);
  const usage = new Map<number, number>();
  for (const u of used ?? []) usage.set(u.component_id, (usage.get(u.component_id) ?? 0) + 1);

  return (
    <>
      <Link href="/admin/bildar" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Билдър
      </Link>
      <AdminHeader
        title="Части"
        subtitle="Доставните цени и доставчиците се виждат само тук — никога в сайта"
        actions={
          <Link href={`/admin/bildar/chasti/nova?vid=${kind}`} className="btn btn-sm btn-primary">
            <Plus className="h-4 w-4" /> Нова част
          </Link>
        }
      />
      <nav aria-label="Вид част" className="mb-6 flex flex-wrap gap-2">
        {partKinds.map((k) => (
          <Link key={k} href={`/admin/bildar/chasti?vid=${k}`} className="chip" data-active={k === kind}>
            {partLabels[k]}
          </Link>
        ))}
      </nav>

      {parts?.length ? (
        <Table head={["Част", "Спецификации", "Доставна с ДДС", "В машини", "Наличност"]}>
          {parts.map((p) => (
            <tr key={p.id} className="hover:bg-surface">
              <td className="px-4 py-3">
                <Link href={`/admin/bildar/chasti/${p.id}`} className="text-white hover:text-accent-ink">
                  {p.name}
                </Link>
                <div className="text-[12px] text-dim">
                  {p.brand}
                  {p.is_sample && <span className="ml-2 uppercase tracking-wide text-accent-ink">примерна</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-[12px] text-muted">{specLine(kind, p.specs as Record<string, unknown>)}</td>
              <td className="px-4 py-3 text-white">{formatPrice(p.cost_cents)}</td>
              <td className="px-4 py-3 text-muted">{usage.get(p.id) ?? 0}</td>
              <td className="px-4 py-3">
                <form action={togglePartStock}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="in_stock" value={p.in_stock ? "0" : "1"} />
                  <button type="submit" className={`text-[13px] underline underline-offset-2 ${p.in_stock ? "text-ok" : "text-dim"}`}>
                    {p.in_stock ? "налична" : "изчерпана"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>Няма части от този вид.</Empty>
      )}
    </>
  );
}

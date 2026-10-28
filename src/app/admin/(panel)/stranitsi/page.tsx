import Link from "next/link";
import { ExternalLink, Scale } from "lucide-react";
import { AdminHeader, Pill, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";

export const metadata = { title: "Страници" };

export default async function PagesAdmin() {
  const { db } = await requireStaff();
  const { data } = await db.from("pages").select("slug, title, is_published, updated_at").order("sort_order");

  return (
    <>
      <AdminHeader title="Страници" subtitle="Информационни и правни страници на сайта" />
      <div className="mb-6 flex items-start gap-3 bg-accent/10 p-4 text-[14px] text-text ring-1 ring-accent/30">
        <Scale className="mt-0.5 h-5 w-5 flex-none text-accent" strokeWidth={1.5} />
        <p>
          Общите условия, поверителността, връщането и гаранцията са <b className="font-medium text-white">чернови</b>.
          Прегледайте ги с юрист преди пускане на сайта. Можете да поставите и текстовете от сегашния сайт.
        </p>
      </div>
      <Table head={["Страница", "Адрес", "Статус", "Последна промяна", ""]}>
        {(data ?? []).map((p) => (
          <tr key={p.slug} className="hover:bg-surface">
            <td className="px-4 py-3">
              <Link href={`/admin/stranitsi/${p.slug}`} className="text-white hover:text-accent">
                {p.title}
              </Link>
            </td>
            <td className="px-4 py-3 font-mono text-[13px] text-muted">/{p.slug}</td>
            <td className="px-4 py-3">
              <Pill on={p.is_published}>{p.is_published ? "Публикувана" : "Скрита"}</Pill>
            </td>
            <td className="px-4 py-3 text-muted">{formatDate(p.updated_at)}</td>
            <td className="px-4 py-3 text-right">
              <Link href={`/${p.slug}`} target="_blank" aria-label={`Виж ${p.title} в сайта`} className="text-muted hover:text-white">
                <ExternalLink className="ml-auto h-4 w-4" />
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

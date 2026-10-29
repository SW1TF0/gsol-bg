import Link from "next/link";
import { AdminHeader, Empty, Pager, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { inquiryStatusLabels, inquiryTopics, type InquiryTopic } from "@/lib/inquiries";
import { Constants } from "@/lib/supabase/database.types";
import { InquiryStatusBadge } from "./badge";

export const metadata = { title: "Запитвания" };

const PER_PAGE = 30;
type Status = (typeof Constants.public.Enums.inquiry_status)[number];

export default async function InquiriesPage(props: PageProps<"/admin/zapitvaniya">) {
  const { db } = await requireStaff();
  const params = await props.searchParams;
  const status = Constants.public.Enums.inquiry_status.find((s) => s === params.status) as Status | undefined;
  const page = Math.max(1, Number(params.page) || 1);

  let query = db
    .from("inquiries")
    .select("id, topic, name, contact, message, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  query = status ? query.eq("status", status) : query.neq("status", "spam");
  const { data, count } = await query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const href = (s: string | null, p = 1) => {
    const q = new URLSearchParams();
    if (s) q.set("status", s);
    if (p > 1) q.set("page", String(p));
    const str = q.toString();
    return str ? `/admin/zapitvaniya?${str}` : "/admin/zapitvaniya";
  };

  return (
    <>
      <AdminHeader title="Запитвания" subtitle={`${count ?? 0} резултата · от сайта: запитване, контакти, IT преглед`} />
      <nav aria-label="Статус" className="mb-6 flex flex-wrap gap-2">
        <Link href={href(null)} className="chip" data-active={!status}>
          Активни
        </Link>
        {Constants.public.Enums.inquiry_status.map((s) => (
          <Link key={s} href={href(s)} className="chip" data-active={status === s}>
            {inquiryStatusLabels[s]}
          </Link>
        ))}
      </nav>

      {data?.length ? (
        <Table head={["Дата", "Тема", "Клиент", "Съобщение", "Статус"]}>
          {data.map((q) => (
            <tr key={q.id} className="hover:bg-surface">
              <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(q.created_at)}</td>
              <td className="px-4 py-3 text-white">{inquiryTopics[q.topic as InquiryTopic]?.label ?? q.topic}</td>
              <td className="px-4 py-3">
                <Link href={`/admin/zapitvaniya/${q.id}`} className="text-white hover:text-accent-ink">
                  {q.name}
                </Link>
                <div className="text-[12px] text-dim">{q.contact}</div>
              </td>
              <td className="max-w-[360px] px-4 py-3 text-muted">
                <span className="line-clamp-2">{q.message}</span>
              </td>
              <td className="px-4 py-3">
                <InquiryStatusBadge status={q.status} />
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>Няма запитвания{status ? " с този статус" : ""}.</Empty>
      )}
      <Pager page={page} pages={pages} href={(p) => href(status ?? null, p)} />
    </>
  );
}

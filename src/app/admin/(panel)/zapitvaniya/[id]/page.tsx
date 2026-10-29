import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { AdminHeader, Panel, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { inquiryTopics, type InquiryTopic } from "@/lib/inquiries";
import AdminLoading from "@/app/admin/(panel)/loading";
import { InquiryStatusBadge } from "../badge";
import { InquiryForm } from "./InquiryForm";

export const metadata = { title: "Запитване" };

const detailLabels: Record<string, string> = {
  city: "Град / локации",
  devices: "Служители / устройства",
  budget: "Бюджет",
  purpose: "Предназначение",
  contact_time: "Удобен час",
};

export default function InquiryPage(props: PageProps<"/admin/zapitvaniya/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <InquiryContent params={props.params} />
    </Suspense>
  );
}

async function InquiryContent({ params }: Pick<PageProps<"/admin/zapitvaniya/[id]">, "params">) {
  const { db } = await requireStaff();
  const id = Number((await params).id);
  if (!id) notFound();
  const { data: q } = await db.from("inquiries").select("*").eq("id", id).maybeSingle();
  if (!q) notFound();

  const details = Object.entries((q.details as Record<string, string>) ?? {});
  const isEmail = q.contact.includes("@");

  return (
    <>
      <Link href="/admin/zapitvaniya" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички запитвания
      </Link>
      <AdminHeader
        title={inquiryTopics[q.topic as InquiryTopic]?.label ?? q.topic}
        subtitle={`Получено ${formatDate(q.created_at)}${q.source_url ? ` · от ${q.source_url}` : ""}`}
        actions={<InquiryStatusBadge status={q.status} />}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Съобщение">
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-text">{q.message}</p>
            {details.length > 0 && (
              <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-[14px] sm:grid-cols-2">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-dim">{detailLabels[k] ?? k}</dt>
                    <dd className="text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>
          <Panel title="Обработка">
            <InquiryForm key={q.status} id={q.id} status={q.status} notes={q.notes ?? ""} />
          </Panel>
        </div>
        <Panel title="Клиент" className="h-fit">
          <div className="text-[16px] text-white">{q.name}</div>
          <a
            href={isEmail ? `mailto:${q.contact}` : `tel:${q.contact.replace(/\s/g, "")}`}
            className="mt-3 flex items-center gap-2 break-all text-[14px] text-muted hover:text-white"
          >
            {isEmail ? <Mail className="h-4 w-4 flex-none text-accent-ink" /> : <Phone className="h-4 w-4 flex-none text-accent-ink" />}
            {q.contact}
          </a>
        </Panel>
      </div>
    </>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import type { QuoteLine } from "@/lib/quotes";
import AdminLoading from "@/app/admin/(panel)/loading";
import { QuoteEditor } from "./QuoteEditor";

export const metadata = { title: "Оферта" };

export default function QuotePage(props: PageProps<"/admin/oferti/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <QuoteContent params={props.params} />
    </Suspense>
  );
}

async function QuoteContent({ params }: Pick<PageProps<"/admin/oferti/[id]">, "params">) {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const id = Number((await params).id);
  if (!id) notFound();
  const [{ data: quote }, { data: versions }] = await Promise.all([
    db.from("quotes").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    db.from("quote_versions").select("version, saved_at").eq("quote_id", id).order("version", { ascending: false }).limit(20),
  ]);
  if (!quote) notFound();

  return (
    <>
      <Link href="/admin/oferti" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички оферти
      </Link>
      <AdminHeader title={`Оферта ${quote.number}`} subtitle={`Версия ${quote.version}`} />
      {/* key: след запис или възстановяване редакторът тръгва наново от записаното */}
      <QuoteEditor
        key={quote.version}
        quote={{
          id: quote.id,
          number: quote.number,
          version: quote.version,
          status: quote.status,
          client_name: quote.client_name,
          client_company: quote.client_company,
          client_eik: quote.client_eik,
          client_email: quote.client_email,
          client_phone: quote.client_phone,
          valid_until: quote.valid_until,
          note: quote.note,
          lines: quote.lines as QuoteLine[],
          source_url: quote.source_url,
        }}
        versions={(versions ?? []).map((v) => ({ version: v.version, savedAt: v.saved_at }))}
      />
    </>
  );
}

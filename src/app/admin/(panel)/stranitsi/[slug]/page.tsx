import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminHeader, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import AdminLoading from "@/app/admin/(panel)/loading";
import { PageEditor } from "./PageEditor";

export const metadata = { title: "Редакция на страница" };

export default function EditPage(props: PageProps<"/admin/stranitsi/[slug]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EditContent params={props.params} />
    </Suspense>
  );
}

async function EditContent({ params }: Pick<PageProps<"/admin/stranitsi/[slug]">, "params">) {
  const { db } = await requireStaff(["admin", "manager", "editor"]);
  const { slug } = await params;
  const { data: page } = await db.from("pages").select("*").eq("slug", slug).maybeSingle();
  if (!page) notFound();

  return (
    <>
      <Link href="/admin/stranitsi" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички страници
      </Link>
      <AdminHeader
        title={page.title}
        subtitle={`/${page.slug} · последна промяна ${formatDate(page.updated_at)}`}
        actions={
          <Link href={`/${page.slug}`} target="_blank" className="btn btn-sm btn-ghost">
            <ExternalLink className="h-4 w-4" /> Виж в сайта
          </Link>
        }
      />
      <PageEditor
        page={{ slug: page.slug, title: page.title, intro: page.intro ?? "", body: page.body, is_published: page.is_published }}
      />
    </>
  );
}

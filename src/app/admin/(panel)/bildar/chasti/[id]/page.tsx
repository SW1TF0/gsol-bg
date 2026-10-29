import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { partKinds, partLabels, type PartKind } from "@/lib/builder/parts";
import AdminLoading from "@/app/admin/(panel)/loading";
import { PartForm } from "./PartForm";

export const metadata = { title: "Част" };

export default function PartPage(props: PageProps<"/admin/bildar/chasti/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <PartContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function PartContent({ params, searchParams }: Omit<PageProps<"/admin/bildar/chasti/[id]">, "children">) {
  const { db } = await requireStaff(["admin", "manager"]);
  const { id } = await params;
  const query = await searchParams;

  let part = null;
  if (id !== "nova") {
    if (!/^\d+$/.test(id)) notFound();
    const { data } = await db.from("components").select("*").eq("id", Number(id)).maybeSingle();
    if (!data) notFound();
    part = data;
  }
  const kind = (part?.kind ?? (partKinds.includes(query.vid as PartKind) ? query.vid : "cpu")) as PartKind;

  return (
    <>
      <Link href={`/admin/bildar/chasti?vid=${kind}`} className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Части · {partLabels[kind]}
      </Link>
      <AdminHeader
        title={part ? part.name : "Нова част"}
        subtitle={part?.is_sample ? "Примерна част — при запис става ваша и вносът не я пипа" : "Ръчно добавена част"}
      />
      {query.zapisana && <p className="mb-6 bg-ok/10 px-4 py-3 text-[14px] text-text ring-1 ring-ok/30">Частта е добавена.</p>}
      <div className="max-w-4xl">
        <PartForm
          part={{
            id: part?.id,
            kind,
            name: part?.name,
            brand: part?.brand,
            part_number: part?.part_number,
            supplier: part?.supplier,
            cost_cents: part?.cost_cents,
            lead_days: part?.lead_days,
            image_url: part?.image_url,
            in_stock: part?.in_stock,
            specs: (part?.specs as Record<string, unknown>) ?? {},
          }}
        />
      </div>
    </>
  );
}

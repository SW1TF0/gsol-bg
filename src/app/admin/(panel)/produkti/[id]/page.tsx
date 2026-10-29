import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminHeader, Panel, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { ProductForm } from "./ProductForm";
import AdminLoading from "@/app/admin/(panel)/loading";

export const metadata = { title: "Продукт" };

// Номерът в адреса е известен чак при заявка — рамката на страницата излиза веднага, данните след това
export default function ProductEditPage(props: PageProps<"/admin/produkti/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ProductEditPageContent params={props.params} />
    </Suspense>
  );
}

async function ProductEditPageContent({ params }: Pick<PageProps<"/admin/produkti/[id]">, "params">) {
  const { db } = await requireStaff();
  const id = Number((await params).id);
  if (!id) notFound();

  const [{ data: product }, { data: categories }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("categories").select("id, name, parent_id").order("sort_order"),
  ]);
  if (!product) notFound();

  const tops = (categories ?? []).filter((c) => !c.parent_id);
  const options = tops.flatMap((t) => [
    { id: t.id, label: t.name },
    ...(categories ?? []).filter((c) => c.parent_id === t.id).map((c) => ({ id: c.id, label: `${t.name} › ${c.name}` })),
  ]);
  const specs = (product.specs as { k: string; v: string }[]) ?? [];

  return (
    <>
      <Link href="/admin/produkti" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички продукти
      </Link>
      <AdminHeader
        title="Редакция на продукт"
        subtitle={`Код ${product.sku ?? "—"} · обновен ${formatDate(product.updated_at)}`}
        actions={
          <Link href={`/produkt/${product.slug}`} target="_blank" className="btn btn-sm btn-ghost">
            <ExternalLink className="h-4 w-4" /> Виж в сайта
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ProductForm
          product={{
            id: product.id,
            name: product.name,
            price_cents: product.price_cents,
            regular_price_cents: product.regular_price_cents,
            stock_status: product.stock_status,
            delivery_days: product.delivery_days,
            weight_kg: product.weight_kg,
            summary: product.summary,
            category_id: product.category_id,
            is_active: product.is_active,
            is_promo: product.is_promo,
            free_windows: product.free_windows,
          }}
          categories={options}
        />

        <div className="space-y-6">
          <Panel title="Снимки">
            <div className="grid grid-cols-3 gap-2">
              {product.images.map((src) => (
                <span key={src} className="relative aspect-square bg-plate">
                  <Image src={src} alt="" fill sizes="120px" className="object-contain p-2 mix-blend-multiply" />
                </span>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-dim">Качването на снимки идва с модула за файлове.</p>
          </Panel>
          {specs.length > 0 && (
            <Panel title={`Характеристики (${specs.length})`}>
              <dl className="max-h-80 space-y-2 overflow-y-auto text-[13px]">
                {specs.map((s, i) => (
                  <div key={i}>
                    <dt className="text-dim">{s.k}</dt>
                    <dd className="whitespace-pre-line text-text">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

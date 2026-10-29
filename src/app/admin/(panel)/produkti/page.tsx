import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdminHeader, Empty, Pager, Pill, Table } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Продукти" };

const PER_PAGE = 30;
const stockLabels: Record<string, string> = { in_stock: "Налично", on_request: "По запитване", out_of_stock: "Няма" };

export default async function ProductsPage(props: PageProps<"/admin/produkti">) {
  const { db } = await requireStaff();
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q.replace(/[,()%*\\]/g, " ").trim() : "";
  const cat = Number(params.cat) || null;
  const filter = typeof params.f === "string" ? params.f : "";
  const page = Math.max(1, Number(params.page) || 1);

  const { data: categories } = await db.from("categories").select("id, name, parent_id").order("sort_order");
  const tops = (categories ?? []).filter((c) => !c.parent_id);
  const ids = cat ? [cat, ...(categories ?? []).filter((c) => c.parent_id === cat).map((c) => c.id)] : null;

  let query = db
    .from("products")
    .select("id, slug, name, sku, brand, price_cents, regular_price_cents, images, is_active, is_promo, stock_status, category_id", {
      count: "exact",
    })
    .order("id", { ascending: false });
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`);
  if (ids) query = query.in("category_id", ids);
  if (filter === "promo") query = query.eq("is_promo", true);
  if (filter === "hidden") query = query.eq("is_active", false);
  const { data, count } = await query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const href = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (cat) next.set("cat", String(cat));
    if (filter) next.set("f", filter);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    return s ? `/admin/produkti?${s}` : "/admin/produkti";
  };

  return (
    <>
      <AdminHeader title="Продукти" subtitle={`${count ?? 0} резултата`} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link href={href({ cat: null, page: null })} className="chip" data-active={!cat}>
          Всички
        </Link>
        {tops.map((c) => (
          <Link key={c.id} href={href({ cat: String(c.id), page: null })} className="chip" data-active={cat === c.id}>
            {c.name}
          </Link>
        ))}
        <span className="mx-2 h-6 w-px bg-line" aria-hidden="true" />
        <Link href={href({ f: filter === "promo" ? null : "promo", page: null })} className="chip" data-active={filter === "promo"}>
          В промоция
        </Link>
        <Link href={href({ f: filter === "hidden" ? null : "hidden", page: null })} className="chip" data-active={filter === "hidden"}>
          Скрити
        </Link>
        <form className="relative ml-auto w-full sm:w-72" role="search">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {filter && <input type="hidden" name="f" value={filter} />}
          <label htmlFor="q" className="sr-only">
            Търсене на продукт
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Име, код, марка" className="input !h-9 pl-9 text-[14px]" />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        </form>
      </div>

      {data?.length ? (
        <Table head={["", "Продукт", "Категория", "Цена", "Наличност", "Статус"]}>
          {data.map((p) => (
            <tr key={p.id} className="hover:bg-surface">
              <td className="w-16 px-4 py-2">
                <span className="relative block h-11 w-11 bg-plate">
                  {p.images[0] && (
                    <Image src={p.images[0]} alt="" fill sizes="44px" className="object-contain p-1 mix-blend-multiply" />
                  )}
                </span>
              </td>
              <td className="max-w-[420px] px-4 py-2">
                <Link href={`/admin/produkti/${p.id}`} className="line-clamp-2 text-white hover:text-accent-ink">
                  {p.name}
                </Link>
                <div className="text-[12px] text-dim">
                  {p.sku} · {p.brand ?? "без марка"}
                </div>
              </td>
              <td className="px-4 py-2 text-muted">{p.category_id ? catName.get(p.category_id) : "—"}</td>
              <td className="whitespace-nowrap px-4 py-2">
                {p.regular_price_cents && p.regular_price_cents > p.price_cents && (
                  <s className="block text-[12px] text-dim">{formatPrice(p.regular_price_cents)}</s>
                )}
                <span className="text-white">{formatPrice(p.price_cents)}</span>
              </td>
              <td className="px-4 py-2 text-muted">{stockLabels[p.stock_status] ?? p.stock_status}</td>
              <td className="space-x-1 whitespace-nowrap px-4 py-2">
                <Pill on={p.is_active}>{p.is_active ? "Видим" : "Скрит"}</Pill>
                {p.is_promo && <span className="inline-flex h-6 items-center bg-accent px-2.5 text-[12px] text-on-accent">Промо</span>}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>Няма продукти по тези критерии.</Empty>
      )}
      <Pager page={page} pages={pages} href={(p) => href({ page: p === 1 ? null : String(p) })} />
    </>
  );
}

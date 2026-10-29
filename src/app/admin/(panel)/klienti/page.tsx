import Link from "next/link";
import { Download, Search } from "lucide-react";
import { AdminHeader, Empty, Pager, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { customerFilters, customerName, customerSorts, type CustomerFilter, type CustomerSort } from "@/lib/customers";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Клиенти" };

const PER_PAGE = 25;

function inactiveSince() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString();
}

export default async function CustomersPage(props: PageProps<"/admin/klienti">) {
  const { db, staff } = await requireStaff(["admin", "manager", "sales"]);
  const params = await props.searchParams;
  const filter = (params.filter as CustomerFilter) in customerFilters ? (params.filter as CustomerFilter) : "all";
  const sort = (params.sort as CustomerSort) in customerSorts ? (params.sort as CustomerSort) : "recent";
  const q = typeof params.q === "string" ? params.q.replace(/[,()%*\\]/g, " ").trim() : "";
  const tag = typeof params.tag === "string" ? params.tag.slice(0, 30) : "";
  const page = Math.max(1, Number(params.page) || 1);

  let query = db
    .from("customer_stats")
    .select("id, email, phone, first_name, last_name, company, marketing_opt_in, tags, orders_count, spent_cents, last_order_at", {
      count: "exact",
    });
  if (filter === "repeat") query = query.gte("orders_count", 2);
  if (filter === "subscribed") query = query.eq("marketing_opt_in", true);
  if (filter === "companies") query = query.not("company", "is", null);
  if (filter === "inactive") query = query.lt("last_order_at", inactiveSince());
  if (tag) query = query.contains("tags", [tag]);
  if (q) query = query.or(`email.ilike.%${q}%,phone.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  query =
    sort === "spent"
      ? query.order("spent_cents", { ascending: false })
      : sort === "orders"
        ? query.order("orders_count", { ascending: false })
        : sort === "new"
          ? query.order("created_at", { ascending: false })
          : query.order("last_order_at", { ascending: false, nullsFirst: false });
  const { data, count } = await query.order("id").range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  const href = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (filter !== "all") next.set("filter", filter);
    if (sort !== "recent") next.set("sort", sort);
    if (q) next.set("q", q);
    if (tag) next.set("tag", tag);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    return s ? `/admin/klienti?${s}` : "/admin/klienti";
  };

  return (
    <>
      <AdminHeader
        title="Клиенти"
        subtitle={`${count ?? 0} ${count === 1 ? "клиент" : "клиента"} · създават се автоматично от поръчките`}
        actions={
          staff.role !== "sales" && (
            // Сваляне на файл, не страница — обикновена връзка, без клиентска навигация
            <a href="/admin/klienti/export" download className="btn btn-sm btn-ghost">
              <Download className="h-4 w-4" /> Абонирани (CSV)
            </a>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Филтър" className="flex flex-wrap gap-2">
          {Object.entries(customerFilters).map(([key, label]) => (
            <Link key={key} href={href({ filter: key === "all" ? null : key, page: null })} className="chip" data-active={filter === key}>
              {label}
            </Link>
          ))}
          {tag && (
            <Link href={href({ tag: null, page: null })} className="chip" data-active>
              #{tag} ×
            </Link>
          )}
        </nav>
        <form className="relative ml-auto w-full sm:w-72" role="search">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          {sort !== "recent" && <input type="hidden" name="sort" value={sort} />}
          {tag && <input type="hidden" name="tag" value={tag} />}
          <label htmlFor="q" className="sr-only">
            Търсене на клиент
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Име, имейл, телефон" className="input !h-9 pl-9 text-[14px]" />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        </form>
      </div>
      <nav aria-label="Подредба" className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-dim">
        Подредба:
        {Object.entries(customerSorts).map(([key, label]) => (
          <Link
            key={key}
            href={href({ sort: key === "recent" ? null : key, page: null })}
            aria-current={sort === key ? "true" : undefined}
            className={sort === key ? "text-white" : "hover:text-white"}
          >
            {label}
          </Link>
        ))}
      </nav>

      {data?.length ? (
        <Table head={["Клиент", "Телефон", "Поръчки", "Похарчено", "Последна поръчка", ""]}>
          {data.map((c) => (
            <tr key={c.id} className="hover:bg-surface">
              <td className="px-4 py-3">
                <Link href={`/admin/klienti/${c.id}`} className="text-white hover:text-accent-ink">
                  {customerName(c)}
                </Link>
                <div className="max-w-[240px] truncate text-[12px] text-dim">{c.email}</div>
              </td>
              <td className="px-4 py-3 text-[13px] text-muted">{c.phone}</td>
              <td className="px-4 py-3 text-white">{c.orders_count}</td>
              <td className="px-4 py-3 text-white">{formatPrice(c.spent_cents)}</td>
              <td className="px-4 py-3 text-[13px] text-muted">{formatDate(c.last_order_at)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {c.company && <span className="bg-surface px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">Фирма</span>}
                  {c.marketing_opt_in && (
                    <span className="bg-ok/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-ok">Абониран</span>
                  )}
                  {c.tags.map((t) => (
                    <Link
                      key={t}
                      href={href({ tag: t, page: null })}
                      className="bg-accent/15 px-2 py-0.5 text-[11px] text-text hover:text-white"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>Няма клиенти по тези критерии.</Empty>
      )}
      <Pager page={page} pages={pages} href={(p) => href({ page: p === 1 ? null : String(p) })} />
    </>
  );
}

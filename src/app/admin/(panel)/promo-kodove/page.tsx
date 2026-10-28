import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { AdminHeader, Empty, Pager, Pill, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { toggleBatch, togglePromo } from "./actions";
import { describeDiscount } from "./describe";

export const metadata = { title: "Промо кодове" };

const PER_PAGE = 50;

/** Добавя флагове „изтекъл“ и „изчерпан“ спрямо текущия момент на заявката */
function withStatus<T extends { ends_at: string | null; usage_limit: number | null; times_used: number }>(rows: T[]) {
  const now = new Date();
  return rows.map((r) => ({
    ...r,
    expired: Boolean(r.ends_at && new Date(r.ends_at) < now),
    exhausted: r.usage_limit !== null && r.times_used >= r.usage_limit,
  }));
}

export default async function PromoCodesPage(props: PageProps<"/admin/promo-kodove">) {
  const { db } = await requireStaff();
  const params = await props.searchParams;
  const batch = typeof params.partida === "string" && /^[0-9a-f-]{36}$/.test(params.partida) ? params.partida : null;
  const q = typeof params.q === "string" ? params.q.replace(/[,()%*\\]/g, " ").trim().toUpperCase() : "";
  const page = Math.max(1, Number(params.page) || 1);

  let query = db
    .from("promo_codes")
    .select("id, code, description, discount_type, percent, amount_cents, times_used, usage_limit, starts_at, ends_at, is_active, partner, batch_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false });
  if (batch) query = query.eq("batch_id", batch);
  else query = query.or(`batch_id.is.null`);
  if (q) query = query.or(`code.ilike.%${q}%,partner.ilike.%${q}%,description.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  // Партидите се показват като един ред, за да не заливат списъка
  const { data: batchRows } = batch
    ? { data: [] }
    : await db.from("promo_codes").select("batch_id, times_used, is_active, partner, created_at").not("batch_id", "is", null);
  const batches = new Map<string, { count: number; used: number; active: number; partner: string | null; created: string }>();
  for (const r of batchRows ?? []) {
    const b = batches.get(r.batch_id!) ?? { count: 0, used: 0, active: 0, partner: r.partner, created: r.created_at };
    b.count += 1;
    b.used += r.times_used > 0 ? 1 : 0;
    b.active += r.is_active ? 1 : 0;
    batches.set(r.batch_id!, b);
  }

  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const rows = withStatus(data ?? []);

  return (
    <>
      <AdminHeader
        title={batch ? "Партида кодове" : "Промо кодове"}
        subtitle={batch ? `${count ?? 0} уникални кода` : `${count ?? 0} единични кода · ${batches.size} партиди`}
        actions={
          <>
            {batch && (
              <>
                <a href={`/admin/promo-kodove/export?partida=${batch}`} className="btn btn-sm btn-ghost">
                  <Download className="h-4 w-4" /> Свали CSV
                </a>
                <form action={toggleBatch}>
                  <input type="hidden" name="batch" value={batch} />
                  <input type="hidden" name="active" value="false" />
                  <button type="submit" className="btn btn-sm btn-ghost">
                    Спри всички
                  </button>
                </form>
              </>
            )}
            <Link href="/admin/promo-kodove/nov" className="btn btn-sm btn-primary">
              <Plus className="h-4 w-4" /> Нов код
            </Link>
          </>
        }
      />

      {batch && (
        <Link href="/admin/promo-kodove" className="mb-4 inline-block text-[13px] text-muted hover:text-white">
          ← Всички кодове
        </Link>
      )}

      {!batch && batches.size > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-display text-[14px] uppercase tracking-[1.5px] text-muted">Партиди</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...batches.entries()].map(([id, b]) => (
              <Link key={id} href={`/admin/promo-kodove?partida=${id}`} className="bg-surface-2 p-4 ring-1 ring-line-soft hover:ring-accent">
                <div className="text-white">{b.partner ?? "Партида без име"}</div>
                <div className="mt-1 text-[13px] text-muted">
                  {b.count} кода · използвани {b.used} · активни {b.active}
                </div>
                <div className="mt-1 text-[12px] text-dim">{formatDate(b.created)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <form className="relative mb-4 w-full sm:w-72" role="search">
        {batch && <input type="hidden" name="partida" value={batch} />}
        <label htmlFor="q" className="sr-only">
          Търсене на код
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Код, партньор, описание" className="input !h-9 pl-9 text-[14px]" />
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
      </form>

      {rows.length ? (
        <Table head={["Код", "Отстъпка", "Ползвания", "Срок", "Статус", ""]}>
          {rows.map(({ expired, exhausted, ...p }) => {
            return (
              <tr key={p.id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  <Link href={`/admin/promo-kodove/${p.id}`} className="font-display tracking-wide text-white hover:text-accent">
                    {p.code}
                  </Link>
                  {(p.partner || p.description) && (
                    <div className="max-w-[260px] truncate text-[12px] text-dim">{p.partner ?? p.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-white">{describeDiscount(p)}</td>
                <td className="px-4 py-3 text-muted">
                  {p.times_used}
                  {p.usage_limit ? ` / ${p.usage_limit}` : ""}
                </td>
                <td className="px-4 py-3 text-[13px] text-muted">
                  {p.starts_at || p.ends_at ? (
                    <>
                      {p.starts_at ? formatDate(p.starts_at) : "от сега"} — {p.ends_at ? formatDate(p.ends_at) : "без край"}
                    </>
                  ) : (
                    "без срок"
                  )}
                </td>
                <td className="px-4 py-3">
                  {expired ? (
                    <Pill on={false}>Изтекъл</Pill>
                  ) : exhausted ? (
                    <Pill on={false}>Изчерпан</Pill>
                  ) : (
                    <Pill on={p.is_active}>{p.is_active ? "Активен" : "Спрян"}</Pill>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={togglePromo}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={String(!p.is_active)} />
                    <button type="submit" className="text-[12px] uppercase tracking-wide text-muted hover:text-white">
                      {p.is_active ? "Спри" : "Пусни"}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty>
          {batch ? "Няма кодове в тази партида." : "Още няма промо кодове."}{" "}
          <Link href="/admin/promo-kodove/nov" className="text-accent hover:underline">
            Създайте първия
          </Link>
          .
        </Empty>
      )}
      <Pager
        page={page}
        pages={pages}
        href={(p) => {
          const next = new URLSearchParams();
          if (batch) next.set("partida", batch);
          if (q) next.set("q", q);
          if (p > 1) next.set("page", String(p));
          const s = next.toString();
          return s ? `/admin/promo-kodove?${s}` : "/admin/promo-kodove";
        }}
      />
    </>
  );
}

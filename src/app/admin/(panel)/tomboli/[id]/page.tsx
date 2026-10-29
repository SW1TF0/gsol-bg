import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { AdminHeader, Panel, Stat, Table, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { formatPrice, plural } from "@/lib/format";
import { raffleStatusLabels } from "@/lib/raffles";
import AdminLoading from "@/app/admin/(panel)/loading";
import { categoryOptions } from "../../promo-kodove/categories";
import { RaffleForm } from "../RaffleForm";
import { deletePrize, markNotified } from "../actions";
import { DrawForm, PrizeForm } from "./forms";

export const metadata = { title: "Томбола" };

export default function RafflePage(props: PageProps<"/admin/tomboli/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <RaffleContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function RaffleContent({ params, searchParams }: Omit<PageProps<"/admin/tomboli/[id]">, "children">) {
  const { db } = await requireStaff(["admin", "manager"]);
  const id = Number((await params).id);
  const justCreated = (await searchParams).nova === "1";
  if (!id) notFound();

  const [{ data: raffle }, { data: prizes }, { data: participants }, { data: winners }, { data: draw }, categories] =
    await Promise.all([
      db.from("raffles").select("*").eq("id", id).maybeSingle(),
      db.from("raffle_prizes").select("*").eq("raffle_id", id).order("position").order("id"),
      db.rpc("raffle_participants", { p_raffle_id: id }),
      db.from("raffle_winners").select("*").eq("raffle_id", id).order("position"),
      db.from("raffle_draws").select("seed, participants, total_entries, drawn_at").eq("raffle_id", id).maybeSingle(),
      categoryOptions(db),
    ]);
  if (!raffle) notFound();

  const people = new Set((participants ?? []).map((p) => p.email)).size;
  const totalEntries = (participants ?? []).reduce((s, p) => s + p.entries, 0);
  const prizeCount = (prizes ?? []).reduce((s, p) => s + p.quantity, 0);
  const prizeTitle = new Map((prizes ?? []).map((p) => [p.id, p.title]));
  const orderNumber = new Map((participants ?? []).map((p) => [p.order_id, p.order_number]));
  const ended = await hasEnded(raffle.ends_at);
  const drawn = raffle.status === "drawn";

  return (
    <>
      <Link href="/admin/tomboli" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Всички томболи
      </Link>
      <AdminHeader
        title={raffle.title}
        subtitle={`${raffleStatusLabels[raffle.status]} · ${formatDate(raffle.starts_at)} — ${formatDate(raffle.ends_at)}`}
        actions={
          raffle.status === "active" || drawn ? (
            <Link href={`/tomboli/${raffle.slug}`} target="_blank" className="btn btn-sm btn-ghost">
              <ExternalLink className="h-4 w-4" /> Виж в сайта
            </Link>
          ) : undefined
        }
      />

      {justCreated && (
        <p role="status" className="mb-6 bg-ok/10 px-4 py-3 text-[14px] text-text ring-1 ring-ok/30">
          {raffle.status === "draft"
            ? "Томболата е създадена като чернова. Добавете наградите по-долу и сменете статуса на „Активна“, за да се появи в сайта."
            : "Томболата е създадена. Добавете наградите по-долу."}
        </p>
      )}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Участници" value={String(people)} hint="уникални имейли" />
        <Stat label="Участия" value={String(totalEntries)} hint={`от ${plural(participants?.length ?? 0, "поръчка", "поръчки")}`} />
        <Stat label="Награди" value={String(prizeCount)} hint={`+ ${raffle.reserves_count} резерв.`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {drawn ? (
            <Panel title="Победители">
              <ol className="space-y-3">
                {(winners ?? []).map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 bg-bg-deep p-3 text-[14px]">
                    <div>
                      <div className="text-white">
                        <span className="mr-2 font-display text-accent">#{w.position}</span>
                        {w.display_name}
                        {w.is_reserve && <span className="ml-2 text-[12px] uppercase tracking-wide text-dim">резерва</span>}
                      </div>
                      <div className="text-[13px] text-muted">
                        {w.email}
                        {w.prize_id && <> · {prizeTitle.get(w.prize_id)}</>}
                        {w.order_id && (
                          <>
                            {" · "}
                            <Link href={`/admin/porachki/${w.order_id}`} className="font-mono hover:text-white">
                              {orderNumber.get(w.order_id) ?? "поръчка"}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                    {w.notified_at ? (
                      <span className="text-[12px] text-ok">Уведомен {formatDate(w.notified_at)}</span>
                    ) : (
                      <form action={markNotified}>
                        <input type="hidden" name="id" value={w.id} />
                        <button type="submit" className="btn btn-sm btn-ghost">
                          Отбележи уведомен
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
              {draw && (
                <p className="mt-4 break-all text-[12px] text-dim">
                  Изтеглено {formatDate(draw.drawn_at)} · {plural(draw.participants, "участник", "участници")} ·{" "}
                  {plural(draw.total_entries, "участие", "участия")} · seed{" "}
                  <span className="font-mono text-muted">{draw.seed}</span>
                </p>
              )}
            </Panel>
          ) : (
            <Panel title="Теглене">
              <DrawForm raffleId={raffle.id} canDraw={raffle.status === "active" && ended && prizeCount > 0 && totalEntries > 0} />
              <p className="mt-3 text-[13px] text-muted">
                {raffle.status !== "active"
                  ? "Томболата трябва да е „Активна“."
                  : !ended
                    ? `Тегленето е възможно след края — ${formatDate(raffle.ends_at)}.`
                    : prizeCount === 0
                      ? "Добавете поне една награда."
                      : totalEntries === 0
                        ? "Няма участия."
                        : "Победителите се избират случайно според броя участия. Един човек печели само веднъж."}
              </p>
            </Panel>
          )}

          <Panel title={`Участници (${plural(participants?.length ?? 0, "поръчка", "поръчки")})`}>
            {participants?.length ? (
              <Table head={["Поръчка", "Клиент", "Сума", "Участия"]}>
                {participants.slice(0, 200).map((p) => (
                  <tr key={p.order_id}>
                    <td className="px-4 py-2">
                      <Link href={`/admin/porachki/${p.order_id}`} className="font-display text-white hover:text-accent">
                        {p.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {p.first_name} {p.last_name}
                      <div className="text-[12px] text-dim">{p.email}</div>
                    </td>
                    <td className="px-4 py-2 text-muted">{formatPrice(p.amount_cents)}</td>
                    <td className="px-4 py-2 font-display text-white">{p.entries}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="text-[14px] text-muted">Още няма участия. Броят се потвърдените поръчки в периода на томболата.</p>
            )}
          </Panel>

          {drawn ? (
            <p className="text-[13px] text-dim">Изтеглена томбола не може да се редактира.</p>
          ) : (
            <RaffleForm
              categories={categories}
              defaults={{ ...raffle, count_statuses: raffle.count_statuses as string[] }}
            />
          )}
        </div>

        <Panel title={`Награди (${prizeCount})`} className="h-fit">
          <ul className="space-y-3">
            {(prizes ?? []).map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 bg-bg-deep p-3 text-[14px]">
                <div>
                  <div className="text-white">
                    {p.title} {p.quantity > 1 && <span className="text-accent">× {p.quantity}</span>}
                  </div>
                  {p.description && <div className="text-[13px] text-muted">{p.description}</div>}
                </div>
                {!drawn && (
                  <form action={deletePrize}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" aria-label={`Изтрий ${p.title}`} className="p-1 text-dim hover:text-accent">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {!drawn && <PrizeForm raffleId={raffle.id} />}
        </Panel>
      </div>
    </>
  );
}

/** Извън рендера, за да не е „нечисто“ четене на часовника в компонента */
async function hasEnded(endsAt: string) {
  return new Date(endsAt).getTime() <= Date.now();
}

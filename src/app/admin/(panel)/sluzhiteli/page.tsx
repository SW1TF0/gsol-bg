import { AdminHeader, Panel, formatDate } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { siteUrl } from "@/lib/email/notify";
import { roleDescriptions, roleLabels, staffRoles } from "@/lib/staff";
import { cancelInvite } from "./actions";
import { AccessButton, ApproveForm, CopyLink, InviteForm, StaffEditForm } from "./forms";

export const metadata = { title: "Служители" };

const isExpired = (iso: string) => new Date(iso).getTime() < Date.now();

export default async function StaffPage() {
  const { db } = await requireStaff(["admin"]);
  const [{ data: members }, { data: pending }, { data: invites }, url] = await Promise.all([
    db.rpc("staff_members"),
    db.rpc("staff_pending_users"),
    db.from("staff_invites").select("id, email, role, display_name, created_at, expires_at").is("accepted_at", null).order("created_at", { ascending: false }),
    siteUrl(),
  ]);
  const active = (members ?? []).filter((m) => !m.disabled_at).length;

  return (
    <>
      <AdminHeader title="Служители" subtitle={`${active} с активен достъп · кой какво вижда зависи от ролята`} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title={`Екип (${members?.length ?? 0})`}>
            <ul className="divide-y divide-line-soft">
              {members?.map((m) => {
                const label = m.display_name || m.email;
                return (
                  <li key={m.user_id} className={`space-y-3 py-4 ${m.disabled_at ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[15px] text-white">
                          {label}
                          {m.is_self && <span className="ml-2 text-[12px] uppercase tracking-wide text-dim">вие</span>}
                        </div>
                        <div className="break-all text-[13px] text-muted">{m.email}</div>
                        <div className="mt-1 text-[12px] text-dim">
                          {roleLabels[m.role]} · последен вход {formatDate(m.last_sign_in_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        {m.disabled_at ? (
                          <div className="text-[12px] uppercase tracking-wide text-accent-ink">
                            Спрян от {formatDate(m.disabled_at).split(",")[0]}
                          </div>
                        ) : (
                          <div className="text-[12px] uppercase tracking-wide text-ok">Активен</div>
                        )}
                        {!m.is_self && <AccessButton userId={m.user_id} disabled={Boolean(m.disabled_at)} label={label} />}
                      </div>
                    </div>
                    <StaffEditForm userId={m.user_id} name={m.display_name ?? ""} role={m.role} isSelf={m.is_self} />
                  </li>
                );
              })}
            </ul>
          </Panel>

          {(pending?.length ?? 0) > 0 && (
            <Panel title={`Регистрирани без роля (${pending!.length})`}>
              <p className="mb-3 text-[13px] text-muted">
                Тези хора са се регистрирали в /admin/vhod без покана. Дайте достъп само на хора, които познавате.
              </p>
              <ul className="divide-y divide-line-soft">
                {pending!.map((u) => (
                  <li key={u.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="break-all text-[14px] text-white">{u.email}</div>
                      <div className="text-[12px] text-dim">
                        Регистриран {formatDate(u.created_at)} ·{" "}
                        {u.confirmed ? "имейлът е потвърден" : "имейлът още не е потвърден"}
                      </div>
                    </div>
                    <ApproveForm email={u.email} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {(invites?.length ?? 0) > 0 && (
            <Panel title={`Изпратени покани (${invites!.length})`}>
              <ul className="divide-y divide-line-soft">
                {invites!.map((i) => {
                  const expired = isExpired(i.expires_at);
                  return (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="break-all text-[14px] text-white">
                          {i.display_name ? `${i.display_name} · ` : ""}
                          {i.email}
                        </div>
                        <div className={`text-[12px] ${expired ? "text-accent-ink" : "text-dim"}`}>
                          {roleLabels[i.role]} · {expired ? "изтекла" : "валидна до"} {formatDate(i.expires_at).split(",")[0]}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <CopyLink link={`${url}/admin/vhod?pokana=${encodeURIComponent(i.email)}`} />
                        <form action={cancelInvite}>
                          <input type="hidden" name="id" value={i.id} />
                          <button type="submit" className="text-[13px] text-muted underline underline-offset-2 hover:text-accent-ink">
                            Отмени
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[12px] text-dim">Изтеклата покана се подновява, като поканите същия имейл отново.</p>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Покани служител">
            <InviteForm />
            <p className="mt-4 text-[13px] text-muted">
              Човекът се регистрира с поканения имейл и потвърждава регистрацията. Ролята се включва автоматично. Ако
              вече има профил, достъпът се включва веднага.
            </p>
          </Panel>

          <Panel title="Роли">
            <dl className="space-y-3 text-[14px]">
              {staffRoles.map((r) => (
                <div key={r}>
                  <dt className="text-white">{roleLabels[r]}</dt>
                  <dd className="text-muted">{roleDescriptions[r]}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

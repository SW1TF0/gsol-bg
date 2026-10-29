"use client";

import { useActionState, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { keepValues } from "@/lib/forms";
import { roleLabels, staffRoles, type StaffRole } from "@/lib/staff";
import { inviteStaff, setStaffAccess, updateStaff, type InviteState, type StaffFormState } from "./actions";

const mailText = {
  sent: "Изпратихме покана по имейл.",
  failed: "Имейлът не се изпрати — пратете връзката ръчно.",
  disabled: "Имейлите още не са настроени — пратете връзката ръчно (Viber, WhatsApp, имейл).",
};

function RoleSelect({ id, defaultValue, disabled, small }: { id: string; defaultValue: StaffRole; disabled?: boolean; small?: boolean }) {
  return (
    <select id={id} name="role" defaultValue={defaultValue} disabled={disabled} className={`input ${small ? "!h-9 text-[14px]" : ""}`}>
      {staffRoles.map((r) => (
        <option key={r} value={r}>
          {roleLabels[r]}
        </option>
      ))}
    </select>
  );
}

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Копирайте връзката:", link);
        }
      }}
      className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-white"
    >
      {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
      {copied ? "Копирано" : "Копирай връзката"}
    </button>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(async (prev, form) => {
    const result = await inviteStaff(prev, form);
    if (result?.result) (document.getElementById("invite-form") as HTMLFormElement | null)?.reset();
    return result;
  }, null);

  return (
    <form id="invite-form" method="post" onSubmit={keepValues(action)} className="space-y-4">
      <div>
        <label htmlFor="invite-email" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
          Имейл
        </label>
        <input id="invite-email" name="email" type="email" required autoComplete="off" className="input" />
      </div>
      <div>
        <label htmlFor="invite-name" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
          Име (по желание)
        </label>
        <input id="invite-name" name="name" maxLength={60} placeholder="Както ще се вижда в админа" className="input" />
      </div>
      <div>
        <label htmlFor="invite-role" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
          Роля
        </label>
        <RoleSelect id="invite-role" defaultValue="sales" />
      </div>
      <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
        <UserPlus className="h-4 w-4" /> {pending ? "Изпращане…" : "Покани"}
      </button>
      {state?.error && (
        <p role="alert" className="text-[14px] text-danger">
          {state.error}
        </p>
      )}
      {state?.result === "granted" && (
        <p role="status" className="bg-ok/10 p-3 text-[14px] text-text ring-1 ring-ok/30">
          {state.email} вече има профил — достъпът е включен веднага.
        </p>
      )}
      {state?.result === "invited" && state.link && (
        <div role="status" className="space-y-2 bg-bg-deep p-3 text-[14px]">
          <p className="text-text">
            Поканата за <span className="text-white">{state.email}</span> е създадена.{" "}
            {state.mail && <span className="text-muted">{mailText[state.mail]}</span>}
          </p>
          <p className="break-all font-mono text-[12px] text-dim">{state.link}</p>
          <CopyLink link={state.link} />
        </div>
      )}
    </form>
  );
}

/** Име и роля на служител; при своя профил ролята не се сменя */
export function StaffEditForm({ userId, name, role, isSelf }: { userId: string; name: string; role: StaffRole; isSelf: boolean }) {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(updateStaff, null);
  return (
    <form method="post" onSubmit={keepValues(action)} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <div className="min-w-[160px] flex-1">
        <label htmlFor={`name-${userId}`} className="sr-only">
          Име
        </label>
        <input id={`name-${userId}`} name="display_name" defaultValue={name} maxLength={60} placeholder="Име" className="input !h-9 text-[14px]" />
      </div>
      <div className="w-[160px]">
        <label htmlFor={`role-${userId}`} className="sr-only">
          Роля
        </label>
        <RoleSelect id={`role-${userId}`} defaultValue={role} disabled={isSelf} small />
        {isSelf && <input type="hidden" name="role" value={role} />}
      </div>
      <button type="submit" className="btn btn-sm btn-ghost !h-9" disabled={pending}>
        {pending ? "…" : "Запиши"}
      </button>
      {state?.ok && <Check className="h-4 w-4 self-center text-ok" aria-label="Записано" />}
      {state?.error && (
        <p role="alert" className="w-full text-[13px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AccessButton({ userId, disabled, label }: { userId: string; disabled: boolean; label: string }) {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(setStaffAccess, null);
  return (
    <form
      method="post"
      onSubmit={(e) => {
        if (!disabled && !window.confirm(`Да спра ли достъпа на ${label}? Ще бъде изведен при следващото действие.`)) {
          e.preventDefault();
          return;
        }
        keepValues(action)(e);
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="disable" value={disabled ? "0" : "1"} />
      <button
        type="submit"
        disabled={pending}
        className={`text-[13px] underline underline-offset-2 ${disabled ? "text-ok hover:text-white" : "text-muted hover:text-accent-ink"}`}
      >
        {disabled ? "Върни достъпа" : "Спри достъпа"}
      </button>
      {state?.error && (
        <span role="alert" className="ml-2 text-[13px] text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

/** Одобрение на регистриран без покана — същата функция като поканата */
export function ApproveForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteStaff, null);
  return (
    <form method="post" onSubmit={keepValues(action)} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <label htmlFor={`approve-${email}`} className="sr-only">
        Роля
      </label>
      <div className="w-[160px]">
        <RoleSelect id={`approve-${email}`} defaultValue="sales" small />
      </div>
      <button type="submit" className="btn btn-sm btn-primary !h-9" disabled={pending}>
        Дай достъп
      </button>
      {state?.error && (
        <span role="alert" className="text-[13px] text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

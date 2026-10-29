"use server";

import { refresh } from "next/cache";
import { requireStaff } from "@/lib/admin/auth";
import { roleLabels, staffRoles, type StaffRole } from "@/lib/staff";
import { getSettings } from "@/lib/settings-data";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/notify";
import { staffInvite } from "@/lib/email/templates";

export type InviteState = {
  error?: string;
  result?: "granted" | "invited";
  email?: string;
  link?: string;
  mail?: SendResult;
} | null;
export type StaffFormState = { ok?: boolean; error?: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Грешките от базата идват като кодове
const errorMessages: Record<string, string> = {
  LAST_ADMIN: "Трябва да остане поне един активен администратор.",
  FORBIDDEN: "Само администратор управлява служителите.",
  INVALID_EMAIL: "Невалиден имейл.",
};
const dbError = (message: string) => errorMessages[message.trim()] ?? "Промяната не се записа. Опитайте отново.";

const readRole = (form: FormData) => {
  const role = String(form.get("role") ?? "") as StaffRole;
  return staffRoles.includes(role) ? role : null;
};

/** Връзка за регистрация с попълнен имейл */
async function inviteLink(email: string) {
  return `${await siteUrl()}/admin/vhod?pokana=${encodeURIComponent(email)}`;
}

export async function inviteStaff(_prev: InviteState, form: FormData): Promise<InviteState> {
  const { db, user, staff } = await requireStaff(["admin"]);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const role = readRole(form);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Въведете валиден имейл." };
  if (!role) return { error: "Изберете роля." };

  const { data, error } = await db.rpc("invite_staff", { p_email: email, p_role: role, p_name: name || undefined });
  if (error) return { error: dbError(error.message) };

  const result = data === "granted" ? "granted" : "invited";
  const link = await inviteLink(email);
  let mail: SendResult | undefined;
  if (result === "invited") {
    const { company } = await getSettings();
    const invitedBy = staff.display_name ?? user.email ?? "Администратор";
    mail = await sendEmail(
      email,
      staffInvite({ company, siteUrl: await siteUrl() }, { roleLabel: roleLabels[role], name: name || null, link, invitedBy }),
      { replyTo: user.email },
    );
  }
  refresh();
  return { result, email, link, mail };
}

export async function updateStaff(_prev: StaffFormState, form: FormData): Promise<StaffFormState> {
  const { db, user } = await requireStaff(["admin"]);
  const id = String(form.get("user_id") ?? "");
  if (!UUID.test(id)) return { error: "Невалиден служител." };
  const name = String(form.get("display_name") ?? "").trim().slice(0, 60);
  const role = readRole(form);
  if (!role) return { error: "Изберете роля." };

  // Собствената роля не се сменя оттук — да не заключите сами себе си
  const changes = id === user.id ? { display_name: name || null } : { display_name: name || null, role };
  const { error } = await db.from("staff").update(changes).eq("user_id", id);
  if (error) return { error: dbError(error.message) };
  refresh();
  return { ok: true };
}

export async function setStaffAccess(_prev: StaffFormState, form: FormData): Promise<StaffFormState> {
  const { db, user } = await requireStaff(["admin"]);
  const id = String(form.get("user_id") ?? "");
  if (!UUID.test(id)) return { error: "Невалиден служител." };
  if (id === user.id) return { error: "Не можете да спрете собствения си достъп." };
  const disable = form.get("disable") === "1";

  const { error } = await db
    .from("staff")
    .update({ disabled_at: disable ? new Date().toISOString() : null })
    .eq("user_id", id);
  if (error) return { error: dbError(error.message) };
  refresh();
  return { ok: true };
}

export async function cancelInvite(form: FormData) {
  const { db } = await requireStaff(["admin"]);
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await db.from("staff_invites").delete().eq("id", id).is("accepted_at", null);
  refresh();
}

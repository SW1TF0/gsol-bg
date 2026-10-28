import "server-only";
import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/clients";
import type { Enums } from "@/lib/supabase/database.types";

export type StaffRole = Enums<"staff_role">;

export const roleLabels: Record<StaffRole, string> = {
  admin: "Администратор",
  manager: "Мениджър",
  sales: "Продажби",
  technician: "Техник",
  editor: "Редактор",
};

/**
 * Връща клиента със сесията и служителя. Пренасочва към входа, ако няма сесия или роля.
 * Подайте roles, за да ограничите страницата до определени роли.
 */
export async function requireStaff(roles?: StaffRole[]) {
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/admin/vhod");

  const { data: staff } = await db
    .from("staff")
    .select("role, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!staff) redirect("/admin/vhod?greshka=nyama-dostap");
  if (roles && !roles.includes(staff.role)) redirect("/admin?greshka=zabraneno");

  return { db, user, staff };
}

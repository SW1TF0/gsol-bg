import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sessionClient } from "@/lib/supabase/clients";
import type { StaffRole } from "@/lib/staff";

export { roleLabels, type StaffRole } from "@/lib/staff";

// Веднъж на заявка: менюто, потребителят в ъгъла и страницата питат едно и също
const loadStaff = cache(async () => {
  // Админът винаги се рендерира при заявка: Supabase чете текущото време при проверка на сесията
  await connection();
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { db, user: null, staff: null };

  const { data: staff } = await db
    .from("staff")
    .select("role, display_name, disabled_at")
    .eq("user_id", user.id)
    .maybeSingle();
  return { db, user, staff };
});

/**
 * Връща клиента със сесията и служителя. Пренасочва към входа, ако няма сесия, роля или достъпът е спрян.
 * Подайте roles, за да ограничите страницата до определени роли.
 */
export async function requireStaff(roles?: StaffRole[]) {
  const { db, user, staff } = await loadStaff();
  if (!user) redirect("/admin/vhod");
  if (!staff) redirect("/admin/vhod?greshka=nyama-dostap");
  if (staff.disabled_at) redirect("/admin/vhod?greshka=spryan");
  if (roles && !roles.includes(staff.role)) redirect("/admin?greshka=zabraneno");

  return { db, user, staff };
}

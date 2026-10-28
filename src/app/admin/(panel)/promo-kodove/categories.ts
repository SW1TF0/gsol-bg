import "server-only";
import type { sessionClient } from "@/lib/supabase/clients";

type Db = Awaited<ReturnType<typeof sessionClient>>;

/** Категориите като плосък списък „Родител › Дете“ за избор в формите */
export async function categoryOptions(db: Db) {
  const { data } = await db.from("categories").select("id, name, parent_id").order("sort_order");
  const rows = data ?? [];
  return rows
    .filter((c) => !c.parent_id)
    .flatMap((top) => [
      { id: top.id, label: top.name },
      ...rows.filter((c) => c.parent_id === top.id).map((c) => ({ id: c.id, label: `${top.name} › ${c.name}` })),
    ]);
}

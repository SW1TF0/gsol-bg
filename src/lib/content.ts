import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicClient } from "@/lib/supabase/clients";

// Информационните страници (Общи условия, Доставка и т.н.) идват от таблица pages.
// Админът изчиства кеша с updateTag("pages") след редакция.

export async function getPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  const { data } = await publicClient()
    .from("pages")
    .select("slug, title, intro, body, updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data;
}

/** Текущата версия на правен текст (записва се с всяка поръчка) */
export async function getLegalVersion(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  const { data } = await publicClient()
    .from("legal_versions")
    .select("version, sha256, created_at")
    .eq("slug", slug)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getPageSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  const { data } = await publicClient().from("pages").select("slug").eq("is_published", true);
  return (data ?? []).map((p) => p.slug);
}

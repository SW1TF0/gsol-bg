import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicClient } from "@/lib/supabase/clients";
import { parseSettings, settingKeys } from "./settings";

// Публичните настройки за сайта. Админът изчиства кеша с updateTag("settings").

export async function getSettings() {
  "use cache";
  cacheLife("days");
  cacheTag("settings");
  const { data } = await publicClient().from("settings").select("key, value").in("key", [...settingKeys]);
  return parseSettings(data ?? []);
}

export async function getCompany() {
  return (await getSettings()).company;
}

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicClient } from "@/lib/supabase/clients";
import type { RaffleRules } from "./raffles";

// Публичните данни за томболите. Админът изчиства кеша с updateTag("raffles").

export type PublicRaffle = RaffleRules & {
  id: number;
  slug: string;
  title: string;
  intro: string | null;
  rules: string;
  image_url: string | null;
  starts_at: string;
  ends_at: string;
  status: "active" | "drawn";
  prizes: { title: string; description: string | null; image_url: string | null; quantity: number }[];
  stats: { participants: number; entries: number };
  winners: { position: number; name: string; prize: string | null }[] | null;
  seed: string | null;
};

export async function getRaffle(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("raffles");
  const { data } = await publicClient().rpc("get_raffle", { p_slug: slug });
  return (data as PublicRaffle | null) ?? null;
}

export async function listRaffles() {
  "use cache";
  cacheLife("minutes");
  cacheTag("raffles");
  const { data } = await publicClient()
    .from("raffles")
    .select("slug, title, intro, image_url, starts_at, ends_at, status, raffle_prizes(title, quantity)")
    .in("status", ["active", "drawn"])
    .order("ends_at", { ascending: false });
  return data ?? [];
}

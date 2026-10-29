import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicClient } from "@/lib/supabase/clients";
import type { AnyPart, PartKind } from "./parts";

// Частите за конфигуратора — без доставни цени и доставчици (функцията в базата не ги връща).

export async function getConfiguratorParts(): Promise<AnyPart[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("builder");
  const { data } = await publicClient().rpc("configurator_parts");
  return (data ?? []).map((r) => ({ id: r.id, kind: r.kind, name: r.name, brand: r.brand, specs: r.specs as never, image: r.image_url }) as AnyPart);
}

/** Частите на публикувана машина — за „Промени тази конфигурация“ */
export async function getMachineSelection(slug: string): Promise<Partial<Record<PartKind, number>>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("builder");
  const { data } = await publicClient().rpc("machine_build", { p_slug: slug.slice(0, 200) });
  return (data as Partial<Record<PartKind, number>> | null) ?? {};
}

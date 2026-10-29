"use server";

import { suggestProducts } from "@/lib/catalog";

/** Бързи резултати, докато клиентът пише в търсачката на хедъра */
export async function suggest(q: string) {
  return suggestProducts(String(q ?? ""));
}

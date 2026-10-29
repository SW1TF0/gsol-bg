import { formatPrice } from "./format.ts";

// Общи помощници за томболите — ползват се и в сайта, и в админа.

export const raffleStatusLabels: Record<string, string> = {
  draft: "Чернова",
  active: "Активна",
  drawn: "Изтеглена",
  cancelled: "Отменена",
};

export type RaffleRules = {
  min_order_cents: number;
  base_entries: number;
  per_amount_cents: number | null;
  bonus_entries: number;
  has_bonus_items: boolean;
  max_entries_per_order: number | null;
};

/**
 * Правилата за участия на човешки език — показват се в сайта и в админа.
 * bonusNames са категориите и продуктите с бонус участия (ако са известни).
 */
export function describeEntryRules(r: RaffleRules, bonusNames: string[] = []) {
  const lines: string[] = [];
  const min = r.min_order_cents > 0 ? ` над ${formatPrice(r.min_order_cents)}` : "";
  if (r.base_entries > 0) {
    lines.push(`Всяка потвърдена поръчка${min} носи ${r.base_entries} ${r.base_entries === 1 ? "участие" : "участия"}.`);
  } else if (min) {
    lines.push(`Участват потвърдените поръчки${min}.`);
  }
  if (r.per_amount_cents) lines.push(`+1 участие за всеки ${formatPrice(r.per_amount_cents)} от сумата на продуктите.`);
  if (r.bonus_entries > 0 && r.has_bonus_items) {
    const shown = bonusNames.slice(0, 5).join(", ");
    const from = !bonusNames.length
      ? "от участващите в кампанията"
      : bonusNames.length > 5
        ? `от: ${shown} и още ${bonusNames.length - 5}`
        : `от: ${shown}`;
    lines.push(`+${r.bonus_entries} ${r.bonus_entries === 1 ? "участие" : "участия"} за всеки продукт ${from}.`);
  }
  if (r.max_entries_per_order) lines.push(`До ${r.max_entries_per_order} участия на поръчка.`);
  lines.push("Участията се зачитат, след като поръчката бъде потвърдена. Отказани и върнати поръчки отпадат.");
  return lines;
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sht", ъ: "a", ь: "", ю: "yu", я: "ya",
};

/** „Коледна томбола 2026“ → „koledna-tombola-2026“ */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

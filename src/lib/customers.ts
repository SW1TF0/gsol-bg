// Клиенти в админа — филтри, подредба и етикети.

export const customerFilters = {
  all: "Всички",
  repeat: "Повторни (2+ поръчки)",
  subscribed: "Абонирани",
  companies: "Фирми",
  inactive: "Без поръчка от 6 месеца",
} as const;
export type CustomerFilter = keyof typeof customerFilters;

export const customerSorts = {
  recent: "Последна поръчка",
  spent: "Най-много похарчено",
  orders: "Най-много поръчки",
  new: "Нови клиенти",
} as const;
export type CustomerSort = keyof typeof customerSorts;

/** „vip, Фирма,  vip“ → ["vip", "Фирма"] — до 10 етикета по 30 знака */
export function parseTags(value: string) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of value.split(",")) {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 30);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length === 10) break;
  }
  return tags;
}

export function customerName(c: { first_name: string | null; last_name: string | null; email: string }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
}

/** Ред за CSV: стойности в кавички, кавичките се удвояват; формулите се неутрализират */
export function csvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      let text = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    })
    .join(",");
}

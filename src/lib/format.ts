const eur = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/** Цените се пазят в евроценти. */
export function formatPrice(cents: number) {
  return eur.format(cents / 100);
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

const dateFmt = new Intl.DateTimeFormat("bg-BG", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Sofia",
});

export function formatDate(iso: string | null | undefined) {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

const dayFmt = new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Sofia" });

/** Само датата — за дни без час (напр. очаквана доставка) */
export function formatDay(iso: string | null | undefined) {
  return iso ? dayFmt.format(new Date(iso)) : "—";
}

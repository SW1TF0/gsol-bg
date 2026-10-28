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

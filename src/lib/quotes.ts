// Ценови оферти: сметките на редактора (продажна и доставна стойност, печалба без ДДС, марж),
// разпределянето на желана печалба и текстът за имейл. Ползват се и в браузъра (сметки на живо),
// и на сървъра (документът за клиента). Доставна цена, печалба и марж никога не отиват при клиента.

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: "Чернова",
  sent: "Изпратена",
  accepted: "Приета",
  declined: "Отказана",
  expired: "Изтекла",
};

export type QuoteLine = {
  id: string;
  name: string;
  qty: number;
  /** Продажна ед. цена с ДДС; null — „При запитване“ (не влиза в сумата) */
  price_cents: number | null;
  /** Доставна ед. цена с ДДС; null — неизвестна (сумите стават „частични“) */
  cost_cents: number | null;
  supplier: string;
  supplier_code: string;
  specs: string[];
  product_id: number | null;
  slug: string | null;
};

const VAT = 1.2;

/** Печалба на реда без ДДС (в центове) или null, ако липсва цена */
export function lineProfit(l: QuoteLine): number | null {
  if (l.price_cents === null || l.cost_cents === null) return null;
  return Math.round(((l.price_cents - l.cost_cents) * l.qty) / VAT);
}

/** Марж на реда: печалба / продажна стойност (и двете без ДДС) */
export function lineMargin(l: QuoteLine): number | null {
  if (l.price_cents === null || l.cost_cents === null || l.price_cents === 0) return null;
  return (l.price_cents - l.cost_cents) / l.price_cents;
}

export type QuoteTotals = {
  /** Продажна стойност с ДДС (без редовете „При запитване“) */
  sell: number;
  /** Доставна стойност с ДДС (само известните) */
  cost: number;
  /** Печалба без ДДС (само редовете с двете цени) */
  profit: number;
  margin: number | null;
  /** Има ред с цена, но без доставна цена — сумите са непълни */
  partial: boolean;
  /** За клиента: данъчна основа и ДДС */
  base: number;
  vat: number;
};

export function quoteTotals(lines: QuoteLine[]): QuoteTotals {
  let sell = 0;
  let cost = 0;
  let profit = 0;
  let sellWithCost = 0;
  let partial = false;
  for (const l of lines) {
    if (l.price_cents === null) continue;
    sell += l.price_cents * l.qty;
    if (l.cost_cents === null) {
      partial = true;
      continue;
    }
    cost += l.cost_cents * l.qty;
    sellWithCost += l.price_cents * l.qty;
    profit += lineProfit(l) ?? 0;
  }
  const base = Math.round(sell / VAT);
  return {
    sell,
    cost,
    profit,
    margin: sellWithCost > 0 ? profit / Math.round(sellWithCost / VAT) : null,
    partial,
    base,
    vat: sell - base,
  };
}

/**
 * Желана обща печалба без ДДС: разликата до нея се разпределя поравно между редовете (като продажна
 * цена с ДДС), стотинките от закръглянето отиват в последния ред. Иска доставна и продажна цена навсякъде.
 */
export function distributeProfit(lines: QuoteLine[], targetProfitCents: number): { lines: QuoteLine[] } | { error: string } {
  if (!lines.length) return { error: "Офертата няма редове." };
  const missing = lines.findIndex((l) => l.price_cents === null || l.cost_cents === null);
  if (missing >= 0) return { error: `Ред ${missing + 1} няма продажна или доставна цена.` };

  const current = lines.reduce((s, l) => s + ((l.price_cents! - l.cost_cents!) * l.qty) / VAT, 0);
  const deltaWithVat = Math.round((targetProfitCents - current) * VAT);
  const perLine = Math.trunc(deltaWithVat / lines.length);

  let added = 0;
  const out = lines.map((l, i) => {
    const last = i === lines.length - 1;
    const lineDelta = last ? deltaWithVat - added : perLine;
    const unitDelta = Math.round(lineDelta / l.qty);
    added += unitDelta * l.qty;
    return { ...l, price_cents: l.price_cents! + unitDelta };
  });
  const negative = out.findIndex((l) => l.price_cents! < 0);
  if (negative >= 0) return { error: `Цената на ред ${negative + 1} става отрицателна — желаната печалба е твърде ниска.` };
  return { lines: out };
}

/** Готов текст за писмо до клиента — без доставни цени и печалба */
export function quoteEmailText(
  quote: { number: string; client_name: string; valid_until: string; note: string; lines: QuoteLine[] },
  company: { brand: string; phone: string; email: string },
  format: { price: (cents: number) => string; day: (iso: string) => string },
) {
  const totals = quoteTotals(quote.lines);
  const rows = quote.lines.map((l) =>
    l.price_cents === null
      ? `• ${l.name} — ${l.qty} бр. — при запитване`
      : `• ${l.name} — ${l.qty} бр. × ${format.price(l.price_cents)} = ${format.price(l.price_cents * l.qty)}`,
  );
  return [
    `Здравейте, ${quote.client_name},`,
    "",
    `Изпращаме ви ценова оферта ${quote.number}, валидна до ${format.day(quote.valid_until)}.`,
    "",
    ...rows,
    "",
    `Общо с ДДС: ${format.price(totals.sell)}`,
    ...(quote.note ? ["", quote.note] : []),
    "",
    "Цените са крайни, в евро, с ДДС. Наличността и срокът се потвърждават при поръчка.",
    "",
    "Поздрави,",
    `${company.brand} · ${company.phone} · ${company.email} · gsol.bg`,
  ].join("\n");
}

import { formatDate, formatPrice } from "../format.ts";
import { orderStatusLabels, paymentLabels, shippingLabels, type PaymentMethod, type ShippingMethod } from "../orders.ts";
import { formatIban, type Bank, type Company } from "../settings.ts";

// Писмата към клиента и към магазина. Чист HTML с вградени стилове (имейл клиентите не четат CSS файлове)
// и текстов вариант за всяко писмо. Всичко, въведено от клиента, минава през esc().

export type Email = { subject: string; html: string; text: string };

export type ReceiptItem = {
  name: string;
  sku: string | null;
  qty: number;
  unit_price_cents: number;
  discount_cents: number;
  line_total_cents: number;
};

export type Receipt = {
  number: string;
  created_at: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  promo_code: string | null;
  shipping_method: ShippingMethod;
  payment_method: PaymentMethod;
  items: ReceiptItem[];
  raffles: { slug: string; title: string; entries: number }[];
};

export type Customer = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  shipping_city: string;
  shipping_address?: string | null;
  econt_office?: string | null;
  invoice?: { company: string; eik: string; vat?: string; mol: string; address: string } | null;
  note?: string | null;
};

type Ctx = { company: Company; siteUrl: string };

const ACCENT = "#ff002b";
const INK = "#18181b";
const MUTED = "#6b6b73";
const LINE = "#e4e4e7";

export function esc(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const nl2br = (value: string) => esc(value).replace(/\r?\n/g, "<br>");

function layout(ctx: Ctx, { preheader, title, body }: { preheader: string; title: string; body: string }) {
  const { company } = ctx;
  return `<!doctype html>
<html lang="bg">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:${INK};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:3px solid ${ACCENT};">
<tr><td style="background:#000000;padding:18px 28px;">
<a href="${esc(ctx.siteUrl)}" style="color:#ffffff;text-decoration:none;font-size:22px;font-weight:bold;letter-spacing:1px;">${esc(company.brand)}<span style="color:${ACCENT};">.bg</span></a>
</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${INK};">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid ${LINE};font-size:12px;line-height:1.6;color:${MUTED};">
${esc(company.legalName)} · ЕИК ${esc(company.eik)}<br>
${esc(company.address)} · <a href="${esc(company.phoneHref)}" style="color:${MUTED};">${esc(company.phone)}</a> · <a href="mailto:${esc(company.email)}" style="color:${MUTED};">${esc(company.email)}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${html}</p>`;

const button = (href: string, label: string) =>
  `<p style="margin:20px 0;"><a href="${esc(href)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;">${esc(label)}</a></p>`;

const box = (html: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:#f4f4f5;"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.6;">${html}</td></tr></table>`;

function rows(pairs: [string, string][]) {
  return pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 12px 3px 0;color:${MUTED};font-size:14px;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:3px 0;font-size:14px;">${v}</td></tr>`,
    )
    .join("");
}

function itemsTable(r: Receipt) {
  const lines = r.items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;">${esc(i.name)}${i.sku ? `<br><span style="color:${MUTED};font-size:12px;">${esc(i.sku)}</span>` : ""}</td>
<td style="padding:10px 8px;border-bottom:1px solid ${LINE};font-size:14px;white-space:nowrap;text-align:center;">× ${i.qty}</td>
<td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;white-space:nowrap;text-align:right;">${formatPrice(i.line_total_cents)}</td>
</tr>`,
    )
    .join("");
  const sum = (label: string, value: string, strong = false) =>
    `<tr><td colspan="2" style="padding:4px 0;font-size:${strong ? 16 : 14}px;${strong ? "font-weight:bold;" : `color:${MUTED};`}">${esc(label)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap;font-size:${strong ? 16 : 14}px;${strong ? "font-weight:bold;" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
${lines}
<tr><td colspan="3" style="height:8px;"></td></tr>
${sum("Продукти", formatPrice(r.subtotal_cents))}
${r.discount_cents ? sum(`Отстъпка${r.promo_code ? ` (${r.promo_code})` : ""}`, `−${formatPrice(r.discount_cents)}`) : ""}
${sum("Доставка", r.shipping_cents ? formatPrice(r.shipping_cents) : "безплатна")}
${sum("Общо с ДДС", formatPrice(r.total_cents), true)}
</table>`;
}

function itemsText(r: Receipt) {
  return [
    ...r.items.map((i) => `- ${i.name} × ${i.qty} — ${formatPrice(i.line_total_cents)}`),
    "",
    `Продукти: ${formatPrice(r.subtotal_cents)}`,
    ...(r.discount_cents ? [`Отстъпка${r.promo_code ? ` (${r.promo_code})` : ""}: −${formatPrice(r.discount_cents)}`] : []),
    `Доставка: ${r.shipping_cents ? formatPrice(r.shipping_cents) : "безплатна"}`,
    `Общо с ДДС: ${formatPrice(r.total_cents)}`,
  ].join("\n");
}

function deliveryLine(r: Receipt, c: Customer) {
  const where = r.shipping_method === "econt_office" ? c.econt_office : c.shipping_address;
  return `${shippingLabels[r.shipping_method]}: ${[c.shipping_city, where].filter(Boolean).join(", ")}`;
}

/** Потвърждение към клиента веднага след поръчката */
export function orderConfirmation(ctx: Ctx, r: Receipt, c: Customer, bank: Bank): Email {
  const byBank = r.payment_method === "bank" && bank.iban;
  const trackUrl = `${ctx.siteUrl}/profil`;
  const bankHtml = byBank
    ? box(
        `<b>Данни за банков превод</b><table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:6px;">${rows([
          ["Получател", esc(bank.holder)],
          ["IBAN", `<span style="font-family:monospace;">${esc(formatIban(bank.iban))}</span>`],
          ["BIC", esc(bank.bic)],
          ["Банка", esc(bank.bankName)],
          ["Сума", `<b>${formatPrice(r.total_cents)}</b>`],
          ["Основание", `Поръчка ${esc(r.number)}`],
        ])}</table><span style="color:${MUTED};">Изпращаме след постъпване на плащането.</span>`,
      )
    : "";
  const raffleHtml = r.raffles
    .map((t) => p(`🎟 С тази поръчка участвате с <b>${t.entries}</b> ${t.entries === 1 ? "участие" : "участия"} в „${esc(t.title)}“.`))
    .join("");

  const html = layout(ctx, {
    preheader: `Поръчка ${r.number} — ${formatPrice(r.total_cents)}. Ще се свържем с вас за потвърждение.`,
    title: `Благодарим за поръчката, ${c.first_name}!`,
    body: [
      p(`Приехме поръчка <b>${esc(r.number)}</b> от ${esc(formatDate(r.created_at))}. Ще ви се обадим или пишем, за да потвърдим наличността и срока на доставка.`),
      itemsTable(r),
      box(
        `<table role="presentation" cellpadding="0" cellspacing="0">${rows([
          ["Доставка", esc(deliveryLine(r, c))],
          ["Плащане", esc(paymentLabels[r.payment_method])],
          ["Получател", esc(`${c.first_name} ${c.last_name}, ${c.phone}`)],
          ["Фактура", c.invoice ? esc(`${c.invoice.company}, ЕИК ${c.invoice.eik}`) : ""],
          ["Бележка", c.note ? nl2br(c.note) : ""],
        ])}</table>`,
      ),
      bankHtml,
      raffleHtml,
      p(`Можете да следите статуса с номера на поръчката и този имейл:`),
      button(trackUrl, "Проследи поръчката"),
      p(`<span style="color:${MUTED};font-size:13px;">Въпроси? Отговорете на този имейл или се обадете на ${esc(ctx.company.phone)} (${esc(ctx.company.hours)}).</span>`),
    ].join(""),
  });

  const text = [
    `Благодарим за поръчката, ${c.first_name}!`,
    "",
    `Приехме поръчка ${r.number}. Ще ви се обадим или пишем, за да потвърдим наличността и срока на доставка.`,
    "",
    itemsText(r),
    "",
    `Доставка: ${deliveryLine(r, c)}`,
    `Плащане: ${paymentLabels[r.payment_method]}`,
    ...(byBank
      ? ["", "Данни за банков превод:", `Получател: ${bank.holder}`, `IBAN: ${formatIban(bank.iban)}`, ...(bank.bic ? [`BIC: ${bank.bic}`] : []), `Сума: ${formatPrice(r.total_cents)}`, `Основание: Поръчка ${r.number}`]
      : []),
    ...r.raffles.map((t) => `Участвате с ${t.entries} участия в „${t.title}“.`),
    "",
    `Проследяване: ${trackUrl}`,
    `Въпроси: ${ctx.company.phone} · ${ctx.company.email}`,
  ].join("\n");

  return { subject: `Поръчка ${r.number} е приета — ${ctx.company.brand}`, html, text };
}

/** Известие до магазина за нова поръчка */
export function shopOrderAlert(ctx: Ctx, r: Receipt, c: Customer, adminUrl: string): Email {
  const html = layout(ctx, {
    preheader: `${c.first_name} ${c.last_name} · ${formatPrice(r.total_cents)} · ${paymentLabels[r.payment_method]}`,
    title: `Нова поръчка ${r.number} — ${formatPrice(r.total_cents)}`,
    body: [
      box(
        `<table role="presentation" cellpadding="0" cellspacing="0">${rows([
          ["Клиент", esc(`${c.first_name} ${c.last_name}`)],
          ["Телефон", `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}" style="color:${INK};">${esc(c.phone)}</a>`],
          ["Имейл", `<a href="mailto:${esc(c.email)}" style="color:${INK};">${esc(c.email)}</a>`],
          ["Доставка", esc(deliveryLine(r, c))],
          ["Плащане", esc(paymentLabels[r.payment_method])],
          ["Фактура", c.invoice ? esc(`${c.invoice.company}, ЕИК ${c.invoice.eik}${c.invoice.vat ? `, ${c.invoice.vat}` : ""}, МОЛ ${c.invoice.mol}, ${c.invoice.address}`) : ""],
          ["Бележка", c.note ? nl2br(c.note) : ""],
        ])}</table>`,
      ),
      itemsTable(r),
      button(adminUrl, "Отвори в админа"),
    ].join(""),
  });
  const text = [
    `Нова поръчка ${r.number} — ${formatPrice(r.total_cents)}`,
    "",
    `Клиент: ${c.first_name} ${c.last_name}`,
    `Телефон: ${c.phone}`,
    `Имейл: ${c.email}`,
    `Доставка: ${deliveryLine(r, c)}`,
    `Плащане: ${paymentLabels[r.payment_method]}`,
    ...(c.invoice ? [`Фактура: ${c.invoice.company}, ЕИК ${c.invoice.eik}, МОЛ ${c.invoice.mol}, ${c.invoice.address}`] : []),
    ...(c.note ? [`Бележка: ${c.note}`] : []),
    "",
    itemsText(r),
    "",
    `Админ: ${adminUrl}`,
  ].join("\n");
  return { subject: `Нова поръчка ${r.number} — ${formatPrice(r.total_cents)}`, html, text };
}

export type InquiryEmail = {
  topicLabel: string;
  name: string;
  contact: string;
  message: string;
  details: Record<string, string>;
  sourceUrl: string | null;
};

const detailLabels: Record<string, string> = {
  city: "Населено място",
  devices: "Устройства",
  budget: "Бюджет",
  purpose: "За какво",
  contact_time: "Удобно време",
};

/** Известие до магазина за ново запитване */
export function inquiryAlert(ctx: Ctx, q: InquiryEmail, adminUrl: string): Email {
  const isEmail = q.contact.includes("@");
  const contactHtml = isEmail
    ? `<a href="mailto:${esc(q.contact)}" style="color:${INK};">${esc(q.contact)}</a>`
    : `<a href="tel:${esc(q.contact.replace(/[^\d+]/g, ""))}" style="color:${INK};">${esc(q.contact)}</a>`;
  const details = Object.entries(q.details).map(([k, v]) => [detailLabels[k] ?? k, esc(v)] as [string, string]);
  const html = layout(ctx, {
    preheader: `${q.topicLabel} · ${q.name} · ${q.contact}`,
    title: `Ново запитване: ${q.topicLabel}`,
    body: [
      box(
        `<table role="presentation" cellpadding="0" cellspacing="0">${rows([
          ["Име", esc(q.name)],
          ["Контакт", contactHtml],
          ...details,
          ["От страница", q.sourceUrl ? esc(q.sourceUrl) : ""],
        ])}</table>`,
      ),
      p(nl2br(q.message)),
      button(adminUrl, "Отвори запитванията"),
    ].join(""),
  });
  const text = [
    `Ново запитване: ${q.topicLabel}`,
    "",
    `Име: ${q.name}`,
    `Контакт: ${q.contact}`,
    ...Object.entries(q.details).map(([k, v]) => `${detailLabels[k] ?? k}: ${v}`),
    "",
    q.message,
    "",
    `Админ: ${adminUrl}`,
  ].join("\n");
  return { subject: `Запитване: ${q.topicLabel} — ${q.name}`, html, text };
}

const statusTexts: Record<string, { title: string; text: string }> = {
  confirmed: { title: "Поръчката ви е потвърдена", text: "Подготвяме я за изпращане. Ще ви пишем, когато пратката тръгне." },
  processing: { title: "Подготвяме поръчката ви", text: "Сглобяваме, тестваме и опаковаме продуктите." },
  shipped: { title: "Поръчката ви е изпратена", text: "Пратката е предадена на Еконт и пътува към вас." },
  delivered: { title: "Поръчката е доставена", text: "Благодарим за доверието! Ако имате въпрос за продукта, пишете ни." },
  cancelled: { title: "Поръчката е отказана", text: "Ако това е грешка или искате да поръчате отново, свържете се с нас." },
  returned: { title: "Поръчката е върната", text: "Ще се свържем с вас за възстановяване на сумата, ако има такава." },
};

/** Статуси, при които може да се прати писмо на клиента */
export const notifiableStatuses = Object.keys(statusTexts);

/** Писмо към клиента при смяна на статуса от админа */
export function orderStatusEmail(
  ctx: Ctx,
  o: { number: string; status: string; first_name: string; total_cents: number },
  message: string,
): Email {
  const t = statusTexts[o.status] ?? { title: `Статус: ${orderStatusLabels[o.status] ?? o.status}`, text: "" };
  const trackUrl = `${ctx.siteUrl}/profil`;
  const html = layout(ctx, {
    preheader: `${o.number}: ${t.title}`,
    title: t.title,
    body: [
      p(`Здравейте, ${esc(o.first_name)}! Поръчка <b>${esc(o.number)}</b> (${formatPrice(o.total_cents)}) е със статус „${esc(orderStatusLabels[o.status] ?? o.status)}“.`),
      t.text ? p(esc(t.text)) : "",
      message ? box(nl2br(message)) : "",
      button(trackUrl, "Проследи поръчката"),
      p(`<span style="color:${MUTED};font-size:13px;">Въпроси? Отговорете на този имейл или се обадете на ${esc(ctx.company.phone)}.</span>`),
    ].join(""),
  });
  const text = [
    t.title,
    "",
    `Поръчка ${o.number} (${formatPrice(o.total_cents)}) е със статус „${orderStatusLabels[o.status] ?? o.status}“.`,
    t.text,
    ...(message ? ["", message] : []),
    "",
    `Проследяване: ${trackUrl}`,
    `Въпроси: ${ctx.company.phone} · ${ctx.company.email}`,
  ].join("\n");
  return { subject: `${o.number}: ${t.title}`, html, text };
}

/** Покана за служител в админ панела */
export function staffInvite(ctx: Ctx, i: { roleLabel: string; name: string | null; link: string; invitedBy: string }): Email {
  const html = layout(ctx, {
    preheader: `${i.invitedBy} ви кани в админ панела като ${i.roleLabel}.`,
    title: `${i.name ? `${i.name}, поканени` : "Поканени"} сте в админ панела`,
    body: [
      p(`${esc(i.invitedBy)} ви добави в админ панела на ${esc(ctx.company.brand)} с роля <b>${esc(i.roleLabel)}</b>.`),
      p("Създайте парола с този имейл и потвърдете регистрацията от писмото, което ще получите. Достъпът се включва веднага след потвърждението."),
      button(i.link, "Създай профил"),
      p(`<span style="color:${MUTED};font-size:13px;">Поканата важи 14 дни. Ако не я очаквате, просто игнорирайте това писмо.</span>`),
    ].join(""),
  });
  const text = [
    `Поканени сте в админ панела на ${ctx.company.brand} с роля ${i.roleLabel}.`,
    "",
    "Създайте парола с този имейл и потвърдете регистрацията. Достъпът се включва веднага след потвърждението.",
    "",
    i.link,
    "",
    "Поканата важи 14 дни.",
  ].join("\n");
  return { subject: `Покана за админ панела на ${ctx.company.brand}`, html, text };
}

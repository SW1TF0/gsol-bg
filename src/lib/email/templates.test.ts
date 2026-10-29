import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "../format.ts";
import { defaultSettings } from "../settings.ts";
import { esc, inquiryAlert, orderConfirmation, orderStatusEmail, shopOrderAlert, staffInvite, type Customer, type Receipt } from "./templates.ts";

const ctx = { company: defaultSettings.company, siteUrl: "https://gsol.bg" };

const receipt: Receipt = {
  number: "GS-100200",
  created_at: "2026-10-29T10:00:00Z",
  subtotal_cents: 10000,
  discount_cents: 1000,
  shipping_cents: 0,
  total_cents: 9000,
  promo_code: "TEST10",
  shipping_method: "econt_address",
  payment_method: "cod",
  items: [{ name: "Мишка <b>X</b>", sku: null, qty: 2, unit_price_cents: 5000, discount_cents: 1000, line_total_cents: 9000 }],
  raffles: [],
};

const customer: Customer = {
  first_name: "Иван",
  last_name: "<script>alert(1)</script>",
  email: "ivan@example.com",
  phone: "0888 123 456",
  shipping_city: "Кърджали",
  shipping_address: "ул. „Тест“ 1",
  note: "ред 1\nред 2 & още",
};

test("escape на въведеното от клиента", () => {
  assert.equal(esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  const alert = shopOrderAlert(ctx, receipt, customer, "https://gsol.bg/admin/porachki/1");
  assert.ok(!alert.html.includes("<script>"));
  assert.ok(alert.html.includes("&lt;script&gt;"));
  assert.ok(alert.html.includes("Мишка &lt;b&gt;X&lt;/b&gt;"));
  assert.ok(alert.html.includes("ред 1<br>ред 2 &amp; още"));
});

test("потвърждението съдържа сумите, а банковите данни — само при превод с IBAN", () => {
  const cod = orderConfirmation(ctx, receipt, customer, { ...defaultSettings.bank, iban: "BG80BNBG96611020345678" });
  // Правно поръчката е предложение — писмото казва „получена“, не „приета“
  assert.equal(cod.subject, "Поръчка GS-100200 е получена — GSOL");
  assert.ok(!cod.html.includes("Приехме"));
  assert.ok(cod.html.includes(formatPrice(9000)));
  assert.ok(cod.html.includes("Отстъпка (TEST10)"));
  assert.ok(cod.html.includes("безплатна"));
  assert.ok(!cod.html.includes("IBAN"));

  const bank = orderConfirmation(ctx, { ...receipt, payment_method: "bank" }, customer, { ...defaultSettings.bank, iban: "BG80BNBG96611020345678" });
  assert.ok(bank.html.includes("BG80 BNBG 9661 1020 3456 78"));
  assert.ok(bank.text.includes("Основание: Поръчка GS-100200"));

  const noIban = orderConfirmation(ctx, { ...receipt, payment_method: "bank" }, customer, defaultSettings.bank);
  assert.ok(!noIban.html.includes("Данни за банков превод"));
});

test("текстов вариант и връзка за проследяване", () => {
  const email = orderConfirmation(ctx, receipt, customer, defaultSettings.bank);
  assert.ok(email.text.includes("Мишка <b>X</b> × 2"));
  assert.ok(email.text.includes("https://gsol.bg/profil"));
  assert.ok(email.html.includes('href="https://gsol.bg/profil"'));
});

test("фактура на физическо лице и на фирма", () => {
  const person = shopOrderAlert(ctx, receipt, { ...customer, invoice: { type: "person", name: "Иван Петров", egn: "8001011234", address: "ул. Тест 1" } }, "/a");
  assert.ok(person.text.includes("Фактура: Физическо лице: Иван Петров, ЕГН 8001011234, ул. Тест 1"));
  const company = shopOrderAlert(ctx, receipt, { ...customer, invoice: { company: "Тест ЕООД", eik: "123456789", mol: "Иван", address: "ул. Тест 2" } }, "/a");
  assert.ok(company.text.includes("Фактура: Тест ЕООД, ЕИК 123456789, МОЛ Иван, ул. Тест 2"));
});

test("статус и запитване", () => {
  const shipped = orderStatusEmail(ctx, { number: "GS-1", status: "shipped", first_name: "Иван", total_cents: 100 }, "Пратка 123");
  assert.equal(shipped.subject, "GS-1: Поръчката ви е изпратена");
  assert.ok(shipped.html.includes("Пратка 123"));

  const q = inquiryAlert(ctx, { topicLabel: "Ремонт", name: "Мария", contact: "m@example.com", message: "Здравейте", details: { city: "Ардино" }, sourceUrl: null }, "https://gsol.bg/admin/zapitvaniya");
  assert.ok(q.html.includes("mailto:m@example.com"));
  assert.ok(q.text.includes("Населено място: Ардино"));
});

test("покана за служител", () => {
  const e = staffInvite(ctx, { roleLabel: "Мениджър", name: "Мария <M>", link: "https://gsol.bg/admin/vhod?pokana=m%40x.bg", invitedBy: "Красимир" });
  assert.ok(e.html.includes("Мария &lt;M&gt;, поканени"));
  assert.ok(e.html.includes('href="https://gsol.bg/admin/vhod?pokana=m%40x.bg"'));
  assert.ok(e.text.includes("Мениджър"));
});

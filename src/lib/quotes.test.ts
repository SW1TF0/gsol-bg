import { test } from "node:test";
import assert from "node:assert/strict";
import { distributeProfit, lineMargin, lineProfit, quoteTotals, type QuoteLine } from "./quotes.ts";
import { amountInWordsBg, numberToWordsBg } from "./money-words.ts";

const line = (price: number | null, cost: number | null, qty = 1): QuoteLine => ({
  id: Math.random().toString(36).slice(2),
  name: "Ред",
  qty,
  price_cents: price,
  cost_cents: cost,
  supplier: "",
  supplier_code: "",
  specs: [],
  product_id: null,
  slug: null,
});

test("печалба и марж на ред — без ДДС", () => {
  const l = line(12000, 6000, 2);
  assert.equal(lineProfit(l), 10000); // (120 − 60) × 2 / 1,2
  assert.equal(lineMargin(l), 0.5);
  assert.equal(lineProfit(line(12000, null)), null);
});

test("сумите: „При запитване“ не влиза, липсваща доставна цена прави сумата частична", () => {
  const t = quoteTotals([line(12000, 6000), line(null, null), line(6000, null)]);
  assert.equal(t.sell, 18000);
  assert.equal(t.cost, 6000);
  assert.equal(t.profit, 5000);
  assert.equal(t.partial, true);
  assert.equal(t.base + t.vat, t.sell);
  assert.equal(t.base, 15000);
});

test("желана печалба: разликата поравно, стотинките в последния ред", () => {
  const lines = [line(12000, 6000), line(24000, 18000, 3), line(3000, 1000)];
  const res = distributeProfit(lines, 50000);
  assert.ok("lines" in res);
  const after = quoteTotals(res.lines);
  // Целта се постига до няколко стотинки (последният ред е с количество 1 и поема остатъка)
  assert.ok(Math.abs(after.profit - 50000) <= 2, `печалба ${after.profit}`);
  assert.equal(res.lines[0].cost_cents, 6000);
});

test("желана печалба иска цени на всеки ред и не прави отрицателни цени", () => {
  assert.ok("error" in distributeProfit([line(12000, null)], 1000));
  assert.ok("error" in distributeProfit([line(1000, 900)], -100000));
});

test("числа словом", () => {
  assert.equal(numberToWordsBg(1), "едно");
  assert.equal(numberToWordsBg(2), "две");
  assert.equal(numberToWordsBg(11), "единадесет");
  assert.equal(numberToWordsBg(21), "двадесет и едно");
  assert.equal(numberToWordsBg(105), "сто и пет");
  assert.equal(numberToWordsBg(120), "сто и двадесет");
  assert.equal(numberToWordsBg(121), "сто двадесет и едно");
  assert.equal(numberToWordsBg(621), "шестстотин двадесет и едно");
  assert.equal(numberToWordsBg(1000), "хиляда");
  assert.equal(numberToWordsBg(1001), "хиляда и едно");
  assert.equal(numberToWordsBg(1100), "хиляда и сто");
  assert.equal(numberToWordsBg(1121), "хиляда сто двадесет и едно");
  assert.equal(numberToWordsBg(2500), "две хиляди и петстотин");
  assert.equal(numberToWordsBg(5112), "пет хиляди сто и дванадесет");
  assert.equal(numberToWordsBg(21500), "двадесет и една хиляди и петстотин");
  assert.equal(numberToWordsBg(2_000_000), "два милиона");
  assert.equal(numberToWordsBg(1_002_000), "един милион и две хиляди");
});

test("сума словом в евро", () => {
  assert.equal(amountInWordsBg(62127), "Шестстотин двадесет и едно евро и 27 евроцента");
  assert.equal(amountInWordsBg(100), "Едно евро и 0 евроцента");
  assert.equal(amountInWordsBg(201), "Две евро и 1 евроцент");
  assert.equal(amountInWordsBg(-62127), "Минус шестстотин двадесет и едно евро и 27 евроцента");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { csvRow, customerName, parseTags } from "./customers.ts";

test("етикети — без повторения и празни", () => {
  assert.deepEqual(parseTags("vip, Фирма,  VIP , ,сервиз  клиент"), ["vip", "Фирма", "сервиз клиент"]);
  assert.equal(parseTags(Array.from({ length: 15 }, (_, i) => `t${i}`).join(",")).length, 10);
});

test("име на клиента", () => {
  assert.equal(customerName({ first_name: "Иван", last_name: "Петров", email: "i@x.bg" }), "Иван Петров");
  assert.equal(customerName({ first_name: null, last_name: null, email: "i@x.bg" }), "i@x.bg");
});

test("CSV — кавички и опасни формули", () => {
  assert.equal(csvRow(['Иван "Ванката"', 3, null]), '"Иван ""Ванката""","3",""');
  assert.equal(csvRow(["=HYPERLINK(1)"]), `"'=HYPERLINK(1)"`);
});

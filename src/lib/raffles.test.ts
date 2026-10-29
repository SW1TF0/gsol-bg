import { test } from "node:test";
import assert from "node:assert/strict";
import { describeEntryRules, slugify } from "./raffles.ts";

const base = {
  min_order_cents: 5000,
  base_entries: 1,
  per_amount_cents: null,
  bonus_entries: 2,
  has_bonus_items: true,
  max_entries_per_order: null,
};

test("бонус редът изрежда категориите, а без имена остава общ", () => {
  const named = describeEntryRules(base, ["Лаптопи", "Периферия › Мишки"]);
  assert.ok(named.includes("+2 участия за всеки продукт от: Лаптопи, Периферия › Мишки."));
  assert.ok(describeEntryRules(base).includes("+2 участия за всеки продукт от участващите в кампанията."));
  const many = describeEntryRules(base, ["A", "B", "C", "D", "E", "F", "G"]);
  assert.ok(many.some((l) => l.endsWith("от: A, B, C, D, E и още 2.")));
});

test("без бонус продукти няма бонус ред", () => {
  const lines = describeEntryRules({ ...base, has_bonus_items: false }, []);
  assert.ok(!lines.some((l) => l.includes("за всеки продукт")));
});

test("адрес от кирилица", () => {
  assert.equal(slugify("Коледна томбола 2026!"), "koledna-tombola-2026");
  assert.equal(slugify("Проверка на админа"), "proverka-na-admina");
});

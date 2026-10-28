import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCodes, normalizeCode, promoMessage } from "./promo.ts";

test("генериране на уникални кодове", () => {
  const codes = generateCodes("gsol ", 200);
  assert.equal(new Set(codes).size, 200);
  assert.ok(codes.every((c) => /^GSOL-[A-HJ-NP-Z2-9]{6}$/.test(c)));
});

test("генерирането пропуска вече съществуващи кодове", () => {
  const existing = new Set(generateCodes("X", 50, 2));
  const fresh = generateCodes("X", 20, 2, existing);
  assert.ok(fresh.every((c) => !existing.has(c)));
});

test("кодът се нормализира и непознатата причина дава общо съобщение", () => {
  assert.equal(normalizeCode("  gsol 10 "), "GSOL10");
  assert.equal(promoMessage("expired"), "Този промо код е изтекъл.");
  assert.equal(promoMessage("нещо друго"), "Няма такъв промо код.");
});

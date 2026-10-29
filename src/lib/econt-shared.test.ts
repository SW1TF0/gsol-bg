import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeQuery, parseEcontSettings, searchCities, searchOffices, type EcontCity, type EcontOffice } from "./econt-shared.ts";

const cities: EcontCity[] = [
  { id: 1, name: "Кърджали", region: "Кърджали", postCode: "6600", offices: 4 },
  { id: 2, name: "Кърнаре", region: "Пловдив", postCode: "4363", offices: 0 },
  { id: 3, name: "София", region: "София", postCode: "1000", offices: 136 },
  { id: 4, name: "Нова София", region: "Хасково", postCode: "6459", offices: 0 },
  { id: 5, name: "Софийско", region: "Видин", postCode: "3900", offices: 1 },
];

const offices: EcontOffice[] = [
  { code: "6601", name: "Кърджали Васил Априлов", cityId: 1, address: "ул. Екзарх Йосиф №6" },
  { code: "6602", name: "Кърджали Възрожденци", cityId: 1, address: "кв. Възрожденци ул. Баба Тонка №8" },
  { code: "1000", name: "София Център", cityId: 3, address: "ул. Граф Игнатиев №1" },
];

test("търсенето не зависи от главни букви и „гр.“", () => {
  assert.equal(normalizeQuery("  гр. КЪРДЖАЛИ "), "кърджали");
  assert.equal(normalizeQuery("с.  Нова   София"), "нова софия");
});

test("градовете: точното име и началото са преди съвпаденията по средата", () => {
  assert.deepEqual(
    searchCities(cities, "софия").map((c) => c.name),
    ["София", "Нова София"],
  );
  assert.deepEqual(
    searchCities(cities, "соф").map((c) => c.name),
    ["София", "Софийско", "Нова София"],
  );
  assert.deepEqual(searchCities(cities, "кър").map((c) => c.name), ["Кърджали", "Кърнаре"]);
});

test("градовете: по пощенски код и без търсене — най-големите първо", () => {
  assert.deepEqual(searchCities(cities, "66").map((c) => c.name), ["Кърджали"]);
  assert.equal(searchCities(cities, "")[0].name, "София");
});

test("офисите: само в избрания град, търсене в името и адреса", () => {
  assert.deepEqual(searchOffices(offices, 1, "").map((o) => o.code), ["6601", "6602"]);
  assert.deepEqual(searchOffices(offices, 1, "баба тонка").map((o) => o.code), ["6602"]);
  assert.deepEqual(searchOffices(offices, 3, "кърджали"), []);
});

test("настройките на Еконт: непознатото е тестова среда с включени автоматики", () => {
  assert.deepEqual(parseEcontSettings(null), {
    env: "demo",
    senderOfficeCode: "",
    senderAgent: "",
    autoLabel: true,
    declaredValue: true,
  });
  assert.equal(parseEcontSettings({ env: "live", auto_label: false }).autoLabel, false);
  assert.equal(parseEcontSettings({ env: "LIVE" }).env, "demo");
});

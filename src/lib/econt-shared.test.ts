import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuery,
  parseEcontSettings,
  searchCities,
  searchNames,
  searchOffices,
  streetKey,
  type EcontCity,
  type EcontOffice,
} from "./econt-shared.ts";

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

const streets = ["бул. Витоша", "бул. Цар Борис III", "ул. Граф Игнатиев", "ул. Цар Симеон", "ул. Борисова"];
const quarters = ["ж.к. Люлин 5", "кв. Младост-1", "кв. Младост-1А", "кв. Слатина"];

test("улиците: търсене без „ул.“/„бул.“ и без значение от главни букви", () => {
  assert.equal(streetKey("  бул. Цар Борис III "), "цар борис iii");
  assert.equal(streetKey("ж.к. Люлин 5"), "люлин 5");
  assert.equal(streetKey("кв.Младост-1"), "младост 1");
  assert.deepEqual(searchNames(streets, "ул. цар"), ["бул. Цар Борис III", "ул. Цар Симеон"]);
  assert.deepEqual(searchNames(streets, "игнатиев"), ["ул. Граф Игнатиев"]);
});

test("улиците: началото на името е преди началото на дума и съвпадението по средата", () => {
  assert.deepEqual(searchNames(streets, "борис"), ["ул. Борисова", "бул. Цар Борис III"]);
});

test("кварталите: „младост 1“ намира „кв. Младост-1“, а празното търсене връща първите", () => {
  assert.deepEqual(searchNames(quarters, "младост 1"), ["кв. Младост-1", "кв. Младост-1А"]);
  assert.deepEqual(searchNames(quarters, "", 2), ["ж.к. Люлин 5", "кв. Младост-1"]);
  assert.deepEqual(searchNames(quarters, "плевен"), []);
});

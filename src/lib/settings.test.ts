import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice } from "./format.ts";
import { defaultSettings, formatIban, isValidIban, parseSettings, phoneHref, shippingPriceLabel } from "./settings.ts";

test("телефонна връзка от изписан номер", () => {
  assert.equal(phoneHref("0898 570 500"), "tel:+359898570500");
  assert.equal(phoneHref("+359 898 570 500"), "tel:+359898570500");
  assert.equal(phoneHref("00359 898 570 500"), "tel:+359898570500");
});

test("IBAN — контролна сума и формат", () => {
  assert.ok(isValidIban("BG80 BNBG 9661 1020 3456 78"));
  assert.ok(isValidIban("bg80bnbg96611020345678"));
  assert.ok(!isValidIban("BG81BNBG96611020345678"), "грешна контролна сума");
  assert.ok(!isValidIban("BG80BNBG9661102034567"), "българският IBAN е 22 знака");
  assert.ok(!isValidIban(""));
  assert.equal(formatIban("bg80bnbg96611020345678"), "BG80 BNBG 9661 1020 3456 78");
});

test("липсващи или грешни стойности се заменят със стандартните", () => {
  const s = parseSettings([
    { key: "company", value: { phone: "0700 11 22", socials: [{ name: "Facebook", href: "" }, { name: "TikTok", href: "https://t.co/x" }] } },
    { key: "shipping", value: { econt_office_cents: "abc", econt_address_cents: 1200, free_from_cents: -1 } },
  ]);
  assert.equal(s.company.phoneHref, "tel:+3597001122");
  assert.equal(s.company.legalName, defaultSettings.company.legalName);
  assert.deepEqual(s.company.socials, [{ name: "TikTok", href: "https://t.co/x" }]);
  assert.deepEqual(s.shipping, { econtOfficeCents: 690, econtAddressCents: 1200, freeFromCents: 0 });
  assert.deepEqual(s.bank, defaultSettings.bank);
});

test("етикет за цената на доставката", () => {
  assert.equal(shippingPriceLabel(690, 0), formatPrice(690));
  assert.equal(shippingPriceLabel(0, 15000), "безплатна");
  assert.equal(shippingPriceLabel(690, 15000), `${formatPrice(690)} · безплатна над ${formatPrice(15000)}`);
});

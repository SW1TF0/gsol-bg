import { formatPrice } from "./format.ts";

// Настройките от админа (таблица settings): фирмени данни, доставка, банкова сметка.
// В базата ключовете са snake_case; тук ги превръщаме в обекти за приложението.

export type Social = { name: string; href: string };

export type Company = {
  brand: string;
  legalName: string;
  eik: string;
  vat: string;
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  hours: string;
  socials: Social[];
};

export type Shipping = { econtOfficeCents: number; econtAddressCents: number; freeFromCents: number };
export type Bank = { holder: string; iban: string; bic: string; bankName: string };
/** Отзивите в Google: оценката и броят се въвеждат от собственика; празно — лентата е без числа */
export type Reviews = { rating: string; count: number };
export type SiteSettings = { company: Company; shipping: Shipping; bank: Bank; reviews: Reviews };

export const settingKeys = ["company", "shipping", "bank", "reviews"] as const;
export type SettingKey = (typeof settingKeys)[number];

export const socialNetworks = ["Facebook", "Instagram", "TikTok", "YouTube"] as const;

/** Ползват се, ако в базата липсва стойност */
export const defaultSettings: SiteSettings = {
  company: {
    brand: "GSOL",
    legalName: "ГлобалНет Сървис Солюшънс ЕООД",
    eik: "208548488",
    vat: "BG208548488",
    phone: "0898 570 500",
    phoneHref: "tel:+359898570500",
    email: "contact.globalnetss@gmail.com",
    address: "Кърджали, ул. „Булаир“ 35",
    hours: "Пон–Пет 09:00–18:00",
    socials: [],
  },
  shipping: { econtOfficeCents: 690, econtAddressCents: 990, freeFromCents: 0 },
  bank: { holder: "ГлобалНет Сървис Солюшънс ЕООД", iban: "", bic: "", bankName: "" },
  reviews: { rating: "", count: 0 },
};

type Row = { key: string; value: unknown };

export function parseSettings(rows: Row[]): SiteSettings {
  const get = (key: SettingKey) => {
    const v = rows.find((r) => r.key === key)?.value;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  };
  const str = (o: Record<string, unknown>, k: string, fallback: string) =>
    typeof o[k] === "string" ? (o[k] as string) : fallback;
  const cents = (o: Record<string, unknown>, k: string, fallback: number) =>
    typeof o[k] === "number" && Number.isInteger(o[k]) && (o[k] as number) >= 0 ? (o[k] as number) : fallback;

  const c = get("company");
  const d = defaultSettings.company;
  const phone = str(c, "phone", d.phone);
  const socials = Array.isArray(c.socials)
    ? (c.socials as unknown[]).flatMap((s) => {
        const o = s as Record<string, unknown> | null;
        return o && typeof o.name === "string" && typeof o.href === "string" && o.href
          ? [{ name: o.name, href: o.href }]
          : [];
      })
    : d.socials;

  const s = get("shipping");
  const ds = defaultSettings.shipping;
  const b = get("bank");
  const db = defaultSettings.bank;
  const r = get("reviews");

  return {
    company: {
      brand: str(c, "brand", d.brand),
      legalName: str(c, "legal_name", d.legalName),
      eik: str(c, "eik", d.eik),
      vat: str(c, "vat", d.vat),
      phone,
      phoneHref: phoneHref(phone),
      email: str(c, "email", d.email),
      address: str(c, "address", d.address),
      hours: str(c, "hours", d.hours),
      socials,
    },
    shipping: {
      econtOfficeCents: cents(s, "econt_office_cents", ds.econtOfficeCents),
      econtAddressCents: cents(s, "econt_address_cents", ds.econtAddressCents),
      freeFromCents: cents(s, "free_from_cents", ds.freeFromCents),
    },
    bank: {
      holder: str(b, "holder", db.holder),
      iban: str(b, "iban", db.iban),
      bic: str(b, "bic", db.bic),
      bankName: str(b, "bank_name", db.bankName),
    },
    reviews: { rating: str(r, "rating", ""), count: cents(r, "count", 0) },
  };
}

/** „0898 570 500“ → „tel:+359898570500“ */
export function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("00")) return `tel:+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `tel:+359${digits.slice(1)}`;
  return `tel:${digits}`;
}

/** Без интервали, с главни букви */
export function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** Проверка на контролната сума (ISO 13616, mod 97) */
export function isValidIban(value: string) {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  if (iban.startsWith("BG") && iban.length !== 22) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const n = ch >= "A" ? ch.charCodeAt(0) - 55 : Number(ch);
    rest = Number(`${rest}${n}`) % 97;
  }
  return rest === 1;
}

/** „BG80BNBG96611020345678“ → „BG80 BNBG 9661 1020 3456 78“ */
export function formatIban(value: string) {
  return normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
}

/** Кратък текст за цената на доставката: „6,90 €“ или „6,90 € · безплатна над 150,00 €“ */
export function shippingPriceLabel(cents: number, freeFromCents: number) {
  const price = cents === 0 ? "безплатна" : formatPrice(cents);
  return freeFromCents > 0 && cents > 0 ? `${price} · безплатна над ${formatPrice(freeFromCents)}` : price;
}

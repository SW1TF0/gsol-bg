// Съгласие за бисквитки: необходимите са винаги включени; аналитичните и маркетинговите — само след избор.
// Изборът е в бисквитката gsol_cookie_consent. Преди съгласие не се зарежда никакъв външен скрипт:
// всеки бъдещ скрипт (анализ, пиксел, чат) проверява hasConsent() и слуша събитието CONSENT_EVENT.

export type Consent = { analytics: boolean; marketing: boolean; v: number; at: string };

export const CONSENT_COOKIE = "gsol_cookie_consent";
export const CONSENT_EVENT = "gsol:consent";
export const OPEN_SETTINGS_EVENT = "gsol:cookie-settings";
const VERSION = 1;

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1))) as Consent;
    return value.v === VERSION ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }) {
  const value: Consent = { ...choice, v: VERSION, at: new Date().toISOString() };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

export function hasConsent(kind: "analytics" | "marketing") {
  return readConsent()?.[kind] === true;
}

/** Отваря панела отново — напр. от връзката във футъра */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

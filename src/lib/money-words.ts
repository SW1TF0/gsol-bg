// Сума словом за фактурата: „шестстотин двадесет и едно евро и 27 евроцента“.
// „Евро“ е от среден род (едно, две), хилядите — от женски (една, две хиляди), милионите — от мъжки.
// Съюзът „и“ стои пред последната съставка: 120 → „сто и двадесет“, 121 → „сто двадесет и едно“.

type Gender = "m" | "f" | "n";

const ones: Record<Gender, string[]> = {
  m: ["", "един", "два"],
  f: ["", "една", "две"],
  n: ["", "едно", "две"],
};
const units = ["", "", "", "три", "четири", "пет", "шест", "седем", "осем", "девет"];
const teens = [
  "десет",
  "единадесет",
  "дванадесет",
  "тринадесет",
  "четиринадесет",
  "петнадесет",
  "шестнадесет",
  "седемнадесет",
  "осемнадесет",
  "деветнадесет",
];
const tens = ["", "", "двадесет", "тридесет", "четиридесет", "петдесет", "шестдесет", "седемдесет", "осемдесет", "деветдесет"];
const hundreds = ["", "сто", "двеста", "триста", "четиристотин", "петстотин", "шестстотин", "седемстотин", "осемстотин", "деветстотин"];

const unit = (n: number, g: Gender) => (n <= 2 ? ones[g][n] : units[n]);

/** Съставките на число до 999 — всяка е една дума („сто“, „двадесет“, „едно“) */
function groupParts(n: number, g: Gender): string[] {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(hundreds[h]);
  if (rest >= 10 && rest < 20) parts.push(teens[rest - 10]);
  else {
    if (rest >= 20) parts.push(tens[Math.floor(rest / 10)]);
    if (rest % 10) parts.push(unit(rest % 10, g));
  }
  return parts;
}

/** „И“ пред последната съставка */
function join(parts: string[]) {
  if (parts.length < 2) return parts.join("");
  return `${parts.slice(0, -1).join(" ")} и ${parts[parts.length - 1]}`;
}

/** Цяло число с думи (до 999 999 999) в зададения род */
export function numberToWordsBg(value: number, gender: Gender = "n"): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "нула";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  // Всяка група е една „съставка“ на цялото число, ако е от една дума; иначе „и“ е вътре в нея
  const groups: { text: string; single: boolean }[] = [];
  if (millions) {
    const p = groupParts(millions, "m");
    groups.push({ text: millions === 1 ? "един милион" : `${join(p)} милиона`, single: p.length === 1 });
  }
  if (thousands) {
    const p = groupParts(thousands, "f");
    groups.push({ text: thousands === 1 ? "хиляда" : `${join(p)} хиляди`, single: p.length === 1 });
  }
  if (rest) {
    const p = groupParts(rest, gender);
    groups.push({ text: join(p), single: p.length === 1 });
  }
  if (groups.length > 1 && groups[groups.length - 1].single) {
    const last = groups.pop()!;
    return `${groups.map((g) => g.text).join(" ")} и ${last.text}`;
  }
  return groups.map((g) => g.text).join(" ");
}

/** Сума в евро словом; центовете — с цифри. Отрицателната сума (кредитно известие) е „минус …“. */
export function amountInWordsBg(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  const words = numberToWordsBg(euros, "n");
  const text = `${words} евро и ${rest} ${rest === 1 ? "евроцент" : "евроцента"}`;
  const signed = cents < 0 ? `минус ${text}` : text;
  return signed.charAt(0).toLocaleUpperCase("bg") + signed.slice(1);
}

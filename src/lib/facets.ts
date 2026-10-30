// Технически филтри: стойностите се разчитат от спецификацията на продукта (или от частите на машината
// GSOL) и се свеждат до общ вид — „AMD Ryzen 5“, „16 GB“, „27"“. Каквото не се чете надеждно, не става
// филтър: група се показва само ако е разчетена за достатъчно продукти от рафта.

export type FacetKey = "cpu" | "gpu" | "ram" | "storage" | "screen" | "refresh" | "panel" | "res" | "vram" | "os" | "stock";

export const facetDefs: { key: FacetKey; label: string }[] = [
  { key: "cpu", label: "Процесор" },
  { key: "gpu", label: "Видеокарта" },
  { key: "ram", label: "Памет" },
  { key: "storage", label: "Диск" },
  { key: "vram", label: "Памет на видеокартата" },
  { key: "screen", label: "Диагонал" },
  { key: "res", label: "Резолюция" },
  { key: "refresh", label: "Честота на опресняване" },
  { key: "panel", label: "Тип на матрицата" },
  { key: "os", label: "Операционна система" },
  { key: "stock", label: "Наличност" },
];

export type FacetSource = {
  name: string;
  category: string;
  stockStatus: string;
  specs: { k: string; v: string }[];
  components?: Record<string, string> | null;
};

const spec = (p: FacetSource, key: RegExp) => p.specs.find((s) => key.test(s.k))?.v ?? "";

function cpu(text: string): string | null {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/ryzen\s*(?:ai\s*)?(\d)/i))) return `AMD Ryzen ${m[1]}`;
  if (/athlon/i.test(text)) return "AMD Athlon";
  if ((m = text.match(/core\s*(?:™\s*)?ultra\s*(\d)/i))) return `Intel Core Ultra ${m[1]}`;
  if ((m = text.match(/core\s*(?:™\s*)?i(\d)/i))) return `Intel Core i${m[1]}`;
  if ((m = text.match(/core\s*(?:™\s*)?(\d)\b/i))) return `Intel Core ${m[1]}`;
  if (/celeron|pentium|\bn\d{3}\b|\bn100\b/i.test(text)) return "Intel Celeron / N";
  if ((m = text.match(/apple\s*(m\d)|\b(m[1-4])\s*(?:pro|max|chip)?\b/i)) && /apple|macbook/i.test(text)) return `Apple ${(m[1] ?? m[2]).toUpperCase()}`;
  return null;
}

function gpu(text: string): string | null {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/rtx\s*(\d{4})\s*(ti\s*super|ti|super)?/i))) return `NVIDIA RTX ${m[1]}${m[2] ? ` ${m[2].toLowerCase().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}` : ""}`;
  if ((m = text.match(/gtx\s*(\d{4})/i))) return `NVIDIA GTX ${m[1]}`;
  if ((m = text.match(/\brx\s*(\d{4})\s*(xtx|xt|gre)?/i))) return `AMD RX ${m[1]}${m[2] ? ` ${m[2].toUpperCase()}` : ""}`;
  if ((m = text.match(/arc\s*([ab]\d{3})/i))) return `Intel Arc ${m[1].toUpperCase()}`;
  if (/вградена|integrated|uhd|iris|radeon\s*(?:\d{3}m\s*)?graphics|intel\s*graphics|vega/i.test(text)) return "Вградена графика";
  return null;
}

function gigabytes(text: string, min: number, max: number): string | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(tb|gb)/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  const gb = m[2].toLowerCase() === "tb" ? n * 1024 : n;
  if (!(gb >= min && gb <= max)) return null;
  return gb >= 1000 ? `${Number((gb / 1024).toFixed(1))} TB` : `${Math.round(gb)} GB`;
}

function screen(text: string): string | null {
  const m = text.match(/(\d{2}(?:[.,]\d)?)\s*(?:"|''|”|inch|инч|in\b|-)/i) ?? text.match(/^\s*(\d{2}(?:[.,]\d)?)\b/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return n >= 10 && n <= 65 ? `${n.toString().replace(".", ",")}"` : null;
}

const resolutionNames: Record<string, string> = {
  "1366x768": "HD",
  "1600x900": "HD+",
  "1920x1080": "Full HD",
  "1920x1200": "WUXGA",
  "2560x1440": "QHD",
  "2560x1600": "WQXGA",
  "2880x1800": "2.8K",
  "3440x1440": "UWQHD",
  "3840x2160": "4K UHD",
};

function resolution(text: string): string | null {
  const m = text.match(/(\d{3,4})\s*[x×*]\s*(\d{3,4})/i);
  if (m) return resolutionNames[`${m[1]}x${m[2]}`] ?? `${m[1]}×${m[2]}`;
  if (/full\s*hd|fhd|1080p/i.test(text)) return "Full HD";
  if (/qhd|1440p/i.test(text)) return "QHD";
  if (/4k|uhd/i.test(text)) return "4K UHD";
  return null;
}

function panel(text: string): string | null {
  if (/oled/i.test(text)) return "OLED";
  if (/mini\s*led/i.test(text)) return "Mini LED";
  if (/\bips\b/i.test(text)) return "IPS";
  if (/\bva\b/i.test(text)) return "VA";
  if (/\btn\b/i.test(text)) return "TN";
  return null;
}

function os(text: string): string | null {
  if (!text) return null;
  if (/windows\s*11/i.test(text)) return "Windows 11";
  if (/windows\s*10/i.test(text)) return "Windows 10";
  if (/no\s*os|без|free\s*-?dos|\bdos\b|n\/a|none/i.test(text)) return "Без ОС";
  if (/linux|ubuntu/i.test(text)) return "Linux";
  if (/mac\s*os|macos/i.test(text)) return "macOS";
  return null;
}

/** Стойностите на един продукт по групи (липсваща = не е разчетена) */
export function extractFacets(p: FacetSource): Partial<Record<FacetKey, string>> {
  const c = p.components ?? null;
  const out: Partial<Record<FacetKey, string>> = {};
  const set = (k: FacetKey, v: string | null) => {
    if (v) out[k] = v;
  };

  set("cpu", cpu(c?.cpu ?? (spec(p, /cpu model|модел процесор|^процесор|^processor/i) || (/komponenti/.test(p.category) ? p.name : ""))));
  set("gpu", c ? gpu(c.gpu || "вградена") : gpu(spec(p, /^graphics|видеокарта|graphics engine/i) || (/videokarti/.test(p.category) ? p.name : "")));
  set("ram", gigabytes(c?.ram ?? spec(p, /memory size|обем на паметта|^ram\b|оперативна памет/i), 4, 256));
  set("storage", gigabytes(c?.storage ?? spec(p, /^ssd$|^storage|^диск|капацитет/i), 120, 16384));
  set("screen", screen(spec(p, /screen size|големина на екрана|размер на дисплея|диагонал/i)));
  set("res", resolution(spec(p, /screen resolution|резолюция/i)));
  const hz = spec(p, /refresh rate|честота на опресняване/i).match(/(\d{2,3})\s*hz/i);
  set("refresh", hz ? `${hz[1]} Hz` : null);
  set("panel", panel(spec(p, /тип на панела|screen type|panel type/i)));
  if (/videokarti/.test(p.category)) set("vram", gigabytes(spec(p, /mem+ory size|обем на паметта/i), 1, 64));
  set("os", os(spec(p, /^os$|операционна система|operating system/i)));
  set("stock", p.stockStatus === "in_stock" ? "В наличност" : p.stockStatus === "on_request" ? "По запитване" : null);
  return out;
}

/** Числовите стойности се подреждат по число, останалите по азбучен ред */
export function compareFacetValues(a: string, b: string) {
  const num = (s: string) => {
    const m = s.match(/(\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    const n = Number(m[1].replace(",", "."));
    return /TB/.test(s) ? n * 1024 : n;
  };
  const na = num(a);
  const nb = num(b);
  if (na !== null && nb !== null && na !== nb && /GB|TB|Hz|"/.test(a + b)) return na - nb;
  return a.localeCompare(b, "bg", { numeric: true });
}

/** Група се показва, ако е разчетена за поне половината продукти и има поне две стойности */
export const FACET_MIN_SHARE = 0.5;

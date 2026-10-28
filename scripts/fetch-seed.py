"""Сваля примерни продукти от публичното Store API на gsol.bg и ги записва
като seed данни за разработка в src/data/seed.json.

Пускане:  python3 -I scripts/fetch-seed.py
"""

import html
import json
import re
import sys
import urllib.request
from pathlib import Path

API = "https://gsol.bg/wp-json/wc/store/v1/products"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "seed.json"

# WooCommerce категория -> (наша категория, подкатегория, брой)
SOURCES = [
    (37, "laptopi", "laptopi", 16),
    (65, "laptopi", "geiming-laptopi", 12),
    (67, "kompyutri", "gsol-premium", 8),
    (63, "kompyutri", "gsol-izbor", 8),
    (136, "kompyutri", "gsol-basic", 8),
    (137, "kompyutri", "gsol-office", 6),
    (47, "periferiya", "monitori", 10),
    (97, "periferiya", "geiming-monitori", 10),
    (49, "periferiya", "mishki", 6),
    (48, "periferiya", "klaviaturi", 6),
    (118, "periferiya", "slushalki", 6),
    (17, "komponenti", "procesori", 8),
    (30, "komponenti", "videokarti", 8),
    (19, "komponenti", "ram", 6),
    (34, "komponenti", "ssd", 6),
    (155, "renovirani", "renovirani", 8),
]

TIERS = {
    "gsol-premium": "premium",
    "gsol-izbor": "izbor",
    "gsol-basic": "basic",
    "gsol-office": "office",
}

TRANSLIT = dict(zip(
    "абвгдежзийклмнопрстуфхцчшщъьюя",
    ["a", "b", "v", "g", "d", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p",
     "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sht", "a", "", "yu", "ya"],
))

KNOWN_BRANDS = ["Lenovo", "ASUS", "Acer", "Apple", "Dell", "HP", "MSI", "Gigabyte", "LG",
                "Samsung", "BenQ", "AOC", "Logitech", "Razer", "Corsair", "Kingston", "AMD",
                "Intel", "Fractal Design", "Philips", "Dahua", "SteelSeries", "HyperX",
                "Team Group", "Adata", "Crucial", "Western Digital", "Sapphire", "Palit",
                "Zotac", "PNY", "Genesis", "Redragon", "Trust", "Canyon", "Marvo", "Asrock"]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "gsol-seed/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def slugify(text):
    text = html.unescape(text).lower()
    out = "".join(TRANSLIT.get(ch, ch) for ch in text)
    out = re.sub(r"[^a-z0-9]+", "-", out).strip("-")
    return out[:80].rstrip("-")


MOJIBAKE = {"Ãœ": "Ü", "Ã¼": "ü", "Ã¶": "ö", "Ã¤": "ä", "Ã©": "é", "Â®": "®", "â„¢": "™"}

# Имената на категориите в WooCommerce -> (наша категория, подкатегория)
CATEGORY_BY_NAME = {
    "Лаптопи": ("laptopi", "laptopi"),
    "Gaming лаптопи": ("laptopi", "geiming-laptopi"),
    "Монитори": ("periferiya", "monitori"),
    "Gaming монитори": ("periferiya", "geiming-monitori"),
    "Слушалки и колонки": ("periferiya", "slushalki"),
}


def clean(text, sep=" "):
    text = html.unescape(html.unescape(text or ""))
    text = re.sub(r"<br\s*/?>", sep, text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    for bad, good in MOJIBAKE.items():
        text = text.replace(bad, good)
    if sep == " ":
        return re.sub(r"\s+", " ", text).strip()
    return "\n".join(re.sub(r"\s+", " ", line).strip() for line in text.split(sep) if line.strip())


def parse_specs(description):
    pairs = re.findall(r"<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>", description or "", re.S | re.I)
    pairs += [tuple(re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row, re.S | re.I)[:2])
              for row in re.findall(r"<tr[^>]*>(.*?)</tr>", description or "", re.S | re.I)]
    specs = []
    for pair in pairs:
        if len(pair) < 2:
            continue
        k, v = clean(pair[0]), clean(pair[1], sep=" ")
        if k and v:
            specs.append({"k": k[:60], "v": v.replace(" ", "\n")[:600]})
    return specs[:40]


def intro(description):
    first = re.match(r"\s*<p>(.*?)</p>", description or "", re.S)
    return clean(first.group(1))[:300] if first else ""


def build_item(p, category, sub):
    name = clean(p["name"])
    price = int(p["prices"]["price"])
    regular = int(p["prices"]["regular_price"] or price)
    item = {
        "id": p["id"],
        "slug": f"{slugify(name)}-{p['id']}",
        "name": name,
        "sku": p["sku"],
        "brand": guess_brand(name, p.get("attributes", [])),
        "category": category,
        "subcategory": sub,
        "price": price,
        "regularPrice": max(regular, price),
        "images": [img["src"] for img in p.get("images", [])][:6],
        "inStock": bool(p.get("is_in_stock")),
        "deliveryDays": "3–9" if sub in TIERS else "1–7",
        "freeWindows": category in ("laptopi", "kompyutri"),
        "specs": parse_specs(p.get("description")),
        "summary": intro(p.get("description")),
        "isPromo": False,
    }
    if sub in TIERS:
        item["tier"] = TIERS[sub]
        item["components"] = config_parts(name)
    return item


def guess_brand(name, attributes):
    for attr in attributes:
        if attr.get("name") in ("Марка", "Производител") and attr.get("terms"):
            value = attr["terms"][0]["name"]
            for b in KNOWN_BRANDS:
                if b.lower() == value.lower():
                    return b
    low = name.lower()
    for b in KNOWN_BRANDS:
        if re.search(r"\b" + re.escape(b.lower()) + r"\b", low):
            return b
    if name.startswith("FD "):
        return "Fractal Design"
    if name.startswith("GB "):
        return "Gigabyte"
    return "GSOL" if name.startswith("GSOL") else "Друга"


def config_parts(name):
    # "GSOL Gaming — Core i9-14900KS / RTX 5080 · FD EPOCH XL ... · GSOL Премиум"
    m = re.match(r"GSOL [^—]+—\s*(.+?)\s*/\s*(.+?)\s*·\s*(.+?)\s*·", name)
    if not m:
        return None
    return {"cpu": m.group(1), "gpu": m.group(2), "case": m.group(3)}


def main():
    products = {}
    for cat_id, category, sub, count in SOURCES:
        items = fetch(f"{API}?per_page={count}&category={cat_id}&orderby=popularity")
        print(f"кат. {cat_id}: {len(items)}", file=sys.stderr)
        for p in items:
            if p["id"] not in products:
                products[p["id"]] = build_item(p, category, sub)

    # Промо продуктите се маркират; липсващите се добавят по категорията им
    promos = fetch(f"{API}?per_page=50&category=138")
    for p in promos:
        if p["id"] not in products:
            names = [c["name"] for c in p.get("categories", [])]
            category, sub = next((CATEGORY_BY_NAME[n] for n in names if n in CATEGORY_BY_NAME),
                                 ("periferiya", None))
            products[p["id"]] = build_item(p, category, sub)
        products[p["id"]]["isPromo"] = True

    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = sorted(products.values(), key=lambda x: x["id"], reverse=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f"Записани {len(data)} продукта в {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()

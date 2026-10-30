#!/usr/bin/env python3
"""Пренася съдържанието от сегашния gsol.bg в новия сайт.

Чете страниците такива, каквито се виждат (правните текстове и помощта са в PHP шаблоните, не в
WordPress), а статиите — от WordPress API. Записва:
  <out>/content.json      — правни страници и статии (Markdown) за базата
                            (копието в хранилището: supabase/content/live-content.json)
  src/lib/help-content.ts — въпросите и отговорите за /pomosht

Пуска се ръчно:  python3 scripts/import-live-content.py /tmp/gsol-content
"""

import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://gsol.bg"
LEGAL = [
    "pravna-informaciya",
    "obshti-usloviya",
    "poveritelnost",
    "biskvitki",
    "dostavka-i-plashtane",
    "vrashtane-i-otkaz",
    "reklamacii-garanciya-serviz",
    "izpolzvane-na-ai",
    "sigurnost",
]

# Старите адреси → новите (връзките в текстовете)
CATEGORY_MAP = {
    "лаптопи-и-компютри/лаптопи": "/katalog/laptopi",
    "лаптопи-и-компютри": "/katalog/laptopi",
    "гейминг-конфигурации": "/katalog/kompyutri",
    "компютърни-компоненти": "/katalog/komponenti",
    "промоции": "/promocii",
    "принтери-и-консумативи": "/zapitvane?tema=servis",
}


def fetch(url: str) -> str:
    # Сайтът понякога забавя поредица заявки — опитваме до 4 пъти с пауза
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (GSOL content import)"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read().decode("utf-8", "ignore")
        except OSError:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(url)


def local_href(href: str) -> str:
    href = html.unescape(href)
    if href.startswith(("tel:", "mailto:")):
        return href
    if href.startswith(BASE):
        href = href[len(BASE):] or "/"
    m = re.match(r"^/product-category/([^?#]+?)/?$", href)
    if m:
        return CATEGORY_MAP.get(urllib.parse.unquote(m.group(1)), "/katalog/laptopi")
    if href.startswith("/magazin"):
        return "/katalog/kompyutri"
    if href.startswith("/") and href != "/" and not href.startswith("/#"):
        path, _, frag = href.partition("#")
        href = path.rstrip("/") + (f"#{frag}" if frag else "")
    return href


def inline(s: str) -> str:
    s = re.sub(r"<code\b[^>]*>(.*?)</code>", r"`\1`", s, flags=re.S)
    s = re.sub(r"<(strong|b)\b[^>]*>(.*?)</\1>", r"**\2**", s, flags=re.S)
    s = re.sub(r"<(em|i)\b[^>]*>(.*?)</\1>", r"*\2*", s, flags=re.S)
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(
        r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        lambda m: f"[{re.sub(r'<[^>]+>', '', m.group(2)).strip()}]({local_href(m.group(1))})",
        s,
        flags=re.S,
    )
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s.replace("** **", " ")


def to_markdown(fragment: str) -> str:
    fragment = re.sub(r"<(script|style|svg|button|form|nav)\b.*?</\1>", "", fragment, flags=re.S)
    out: list[str] = []
    for m in re.finditer(r"<(h2|h3|h4|p|ul|ol|blockquote|table|dl)\b[^>]*>(.*?)</\1>", fragment, flags=re.S):
        tag, body = m.group(1), m.group(2)
        if tag == "table":
            rows = [
                [inline(c).replace("|", "/") for c in re.findall(r"<t[hd]\b[^>]*>(.*?)</t[hd]>", r, flags=re.S)]
                for r in re.findall(r"<tr\b[^>]*>(.*?)</tr>", body, flags=re.S)
            ]
            rows = [r for r in rows if r]
            if rows:
                head, rest = rows[0], rows[1:]
                out.append("\n".join(["| " + " | ".join(head) + " |", "| " + " | ".join("---" for _ in head) + " |"]
                                     + ["| " + " | ".join(r) + " |" for r in rest]))
        elif tag == "dl":
            pairs = re.findall(r"<dt\b[^>]*>(.*?)</dt>\s*<dd\b[^>]*>(.*?)</dd>", body, flags=re.S)
            out.append("\n\n".join(f"**{inline(dt)}** — {inline(dd)}" for dt, dd in pairs))
        elif tag in ("ul", "ol"):
            items = [inline(li) for li in re.findall(r"<li\b[^>]*>(.*?)</li>", body, flags=re.S)]
            out.append("\n".join(f"{'-' if tag == 'ul' else f'{i + 1}.'} {it}" for i, it in enumerate(items) if it))
        elif tag == "h2":
            out.append(f"## {inline(body)}")
        elif tag in ("h3", "h4"):
            out.append(f"### {inline(body)}")
        elif tag == "blockquote":
            out.append("> " + inline(body))
        else:
            text = inline(body)
            if text:
                out.append(text)
    return "\n\n".join(x for x in out if x.strip())


def main_of(page: str) -> str:
    m = re.search(r"<main[^>]*>(.*?)</main>", page, flags=re.S)
    return m.group(1) if m else page


def legal_page(slug: str) -> dict:
    page = main_of(fetch(f"{BASE}/{slug}/"))
    title = inline(re.search(r"<h1[^>]*>(.*?)</h1>", page, flags=re.S).group(1))
    hero = re.search(r'<header class="gsol-legal-hero">(.*?)</header>', page, flags=re.S)
    intro = inline(re.search(r"<p[^>]*>(.*?)</p>", hero.group(1), flags=re.S).group(1)) if hero else ""
    version = re.search(r"Версия\s*([0-9.\-]+)", hero.group(1) if hero else "")
    article = re.search(r"<article\b[^>]*>(.*)</article>", page, flags=re.S)
    return {
        "slug": slug,
        "title": title,
        "intro": intro,
        "version": version.group(1) if version else "",
        "body": to_markdown(article.group(1) if article else page),
    }


def help_content() -> dict:
    page = main_of(fetch(f"{BASE}/pomosht/"))
    cats = [
        {"id": m.group(1), "label": inline(m.group(2))}
        for m in re.finditer(r'data-help-filter="([^"]+)"[^>]*>(.*?)</button>', page, flags=re.S)
        if m.group(1) != "all"
    ]
    items = []
    for m in re.finditer(r'<article[^>]*data-help-category="([^"]+)"[^>]*>(.*?)</article>', page, flags=re.S):
        q = inline(re.search(r"<button[^>]*>(.*?)</button>", m.group(2), flags=re.S).group(1))
        a = re.search(r'<div class="gsol-help-answer"[^>]*>(.*?)</div>', m.group(2), flags=re.S)
        items.append({"category": m.group(1), "question": q, "answer": to_markdown(a.group(1) if a else "")})
    return {"categories": cats, "items": items}


def posts() -> list[dict]:
    data = json.loads(fetch(f"{BASE}/wp-json/wp/v2/posts?per_page=100&_fields=slug,title,content,excerpt,date"))
    out = []
    for p in data:
        page = main_of(fetch(f"{BASE}/{p['slug']}/"))
        cta = None
        c = re.search(r'<aside class="gsol-article-cta">(.*?)</aside>', page, flags=re.S)
        if c:
            links = [
                {"label": inline(m.group(2)), "href": local_href(m.group(1))}
                for m in re.finditer(r'<a class="gsol-button[^"]*" href="([^"]+)"[^>]*>(.*?)</a>', c.group(1), flags=re.S)
            ]
            title = re.search(r"<strong>(.*?)</strong>", c.group(1), flags=re.S)
            text = re.search(r"<span>(.*?)</span>", c.group(1), flags=re.S)
            cta = {
                "title": inline(title.group(1)) if title else "",
                "text": inline(text.group(1)) if text else "",
                "links": links,
            }
        out.append(
            {
                "slug": p["slug"],
                "title": inline(p["title"]["rendered"]),
                "excerpt": inline(p["excerpt"]["rendered"]).replace(" [&hellip;]", "").replace(" […]", ""),
                "date": p["date"],
                "body": to_markdown(p["content"]["rendered"]),
                "cta": cta,
            }
        )
    return out


def write_help(help_data: dict, repo: Path) -> None:
    lines = [
        "// Генерирано от scripts/import-live-content.py — въпросите и отговорите от /pomosht на сегашния сайт.",
        "// Отговорите са в Markdown. Нов въпрос: добавете ред тук (или пуснете скрипта отново).",
        "",
        "export type HelpCategory = { id: string; label: string };",
        "export type HelpItem = { category: string; question: string; answer: string };",
        "",
        f"export const helpCategories: HelpCategory[] = {json.dumps(help_data['categories'], ensure_ascii=False, indent=2)};",
        "",
        f"export const helpItems: HelpItem[] = {json.dumps(help_data['items'], ensure_ascii=False, indent=2)};",
        "",
    ]
    (repo / "src/lib/help-content.ts").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "content-import")
    out.mkdir(parents=True, exist_ok=True)
    repo = Path(__file__).resolve().parent.parent
    content = {"legal": [legal_page(s) for s in LEGAL], "posts": posts()}
    (out / "content.json").write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
    write_help(help_content(), repo)
    print(f"{len(content['legal'])} правни страници, {len(content['posts'])} статии → {out / 'content.json'}")


if __name__ == "__main__":
    main()

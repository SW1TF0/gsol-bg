"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, Eye, FileDown, History, Plus, Trash2, Wand2, X } from "lucide-react";
import { Panel, formatDate } from "@/components/admin/ui";
import { formatPrice } from "@/lib/format";
import {
  distributeProfit,
  lineMargin,
  lineProfit,
  quoteStatusLabels,
  quoteTotals,
  type QuoteLine,
  type QuoteStatus,
} from "@/lib/quotes";
import { deleteQuote, restoreQuote, saveQuote, type QuoteDraft } from "../actions";

type Quote = QuoteDraft & { id: number; number: string; version: number; source_url: string | null };

/** „1 234,50“ → 123450; празно → null; невалидно → NaN */
function toCents(text: string): number | null {
  const v = text.replace(/\s/g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && /^\d+(\.\d{1,2})?$/.test(v) ? Math.round(n * 100) : NaN;
}
const euros = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));
const percent = (m: number | null) => (m === null ? "—" : `${(m * 100).toFixed(1).replace(".", ",")}%`);

type Row = QuoteLine & { priceText: string; costText: string; specsText: string };

const toRow = (l: QuoteLine): Row => ({
  ...l,
  priceText: euros(l.price_cents),
  costText: euros(l.cost_cents),
  specsText: l.specs.join("\n"),
});

function newRow(): Row {
  return toRow({
    id: crypto.randomUUID(),
    name: "",
    qty: 1,
    price_cents: null,
    cost_cents: null,
    supplier: "",
    supplier_code: "",
    specs: [],
    product_id: null,
    slug: null,
  });
}

export function QuoteEditor({ quote, versions }: { quote: Quote; versions: { version: number; savedAt: string }[] }) {
  const [fields, setFields] = useState({
    status: quote.status,
    client_name: quote.client_name,
    client_company: quote.client_company,
    client_eik: quote.client_eik,
    client_email: quote.client_email,
    client_phone: quote.client_phone,
    valid_until: quote.valid_until,
    note: quote.note,
  });
  const [rows, setRows] = useState<Row[]>(() => quote.lines.map(toRow));
  const [target, setTarget] = useState("");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok?: string; error?: string } | null>(null);
  const [saving, startSave] = useTransition();

  // Незаписани промени — браузърът пита преди да напуснете страницата
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Редовете с цени, както ги разбира сметката (невалиден текст = „няма цена“)
  const lines: QuoteLine[] = useMemo(
    () =>
      rows.map((r) => {
        const price = toCents(r.priceText);
        const cost = toCents(r.costText);
        return {
          ...r,
          price_cents: Number.isNaN(price) ? null : price,
          cost_cents: Number.isNaN(cost) ? null : cost,
          specs: r.specsText.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10),
        };
      }),
    [rows],
  );
  const totals = quoteTotals(lines);
  const invalid = rows.some((r) => Number.isNaN(toCents(r.priceText)) || Number.isNaN(toCents(r.costText)));

  const change = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const changeRow = (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  function applyTarget() {
    const cents = toCents(target);
    if (cents === null || Number.isNaN(cents)) {
      setMessage({ error: "Въведете желаната печалба в евро, напр. 250 или 250,50." });
      return;
    }
    const res = distributeProfit(lines, cents);
    if ("error" in res) {
      setMessage({ error: res.error });
      return;
    }
    setRows((rs) => rs.map((r, i) => ({ ...r, priceText: euros(res.lines[i].price_cents) })));
    setDirty(true);
    setMessage({ ok: "Цените са преизчислени — проверете ги и запазете." });
  }

  function save() {
    if (invalid) {
      setMessage({ error: "Има невалидна цена — ползвайте число с до две цифри след запетаята." });
      return;
    }
    const draft: QuoteDraft = {
      ...fields,
      lines: lines.map((l) => ({
        id: l.id,
        name: l.name,
        qty: l.qty,
        price_cents: l.price_cents,
        cost_cents: l.cost_cents,
        supplier: l.supplier,
        supplier_code: l.supplier_code,
        specs: l.specs,
        product_id: l.product_id,
        slug: l.slug,
      })),
    };
    setMessage(null);
    startSave(async () => {
      const res = await saveQuote(quote.id, quote.version, draft);
      if ("error" in res) setMessage({ error: res.error });
      else setDirty(false);
    });
  }

  function restore(from: number) {
    if (dirty && !confirm("Имате незаписани промени — ще се загубят. Да се възстанови ли версията?")) return;
    startSave(async () => {
      const res = await restoreQuote(quote.id, from, quote.version);
      if ("error" in res) setMessage({ error: res.error });
      else setDirty(false);
    });
  }

  const sourceHref = quote.source_url ?? (lines[0]?.slug ? `/produkt/${lines[0].slug}` : null);

  return (
    <div className="space-y-6">
      {/* Сметки на живо */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Продажна с ДДС" value={formatPrice(totals.sell)} />
        <Card label="Доставна с ДДС" value={formatPrice(totals.cost)} partial={totals.partial} />
        <Card label="Печалба без ДДС" value={formatPrice(totals.profit)} partial={totals.partial} tone={totals.profit < 0 ? "bad" : undefined} />
        <Card label="Марж" value={percent(totals.margin)} partial={totals.partial} />
      </div>
      {totals.partial && <p className="-mt-3 text-[13px] text-dim">* частична — на някой ред липсва доставна цена.</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Panel title="Клиент">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Получател" value={fields.client_name} onChange={(v) => change("client_name", v)} />
              <Field label="Фирма" value={fields.client_company} onChange={(v) => change("client_company", v)} />
              <Field label="ЕИК" value={fields.client_eik} onChange={(v) => change("client_eik", v)} />
              <Field label="Имейл" type="email" value={fields.client_email} onChange={(v) => change("client_email", v)} />
              <Field label="Телефон" type="tel" value={fields.client_phone} onChange={(v) => change("client_phone", v)} />
              <Field label="Валидна до" type="date" value={fields.valid_until} onChange={(v) => change("valid_until", v)} />
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-[12px] uppercase tracking-wide text-muted">Бележка към клиента</span>
              <textarea
                value={fields.note}
                onChange={(e) => change("note", e.target.value)}
                rows={3}
                maxLength={4000}
                className="input !h-auto py-2.5"
              />
            </label>
          </Panel>

          <Panel title={`Редове (${rows.length})`}>
            <div className="space-y-4">
              {rows.map((r, i) => {
                const l = lines[i];
                const profit = lineProfit(l);
                return (
                  <div key={r.id} className="bg-bg-deep p-4 ring-1 ring-line-soft">
                    <div className="flex items-start gap-3">
                      <span className="mt-2.5 font-display text-[13px] text-dim">{i + 1}</span>
                      <div className="min-w-0 flex-1 space-y-3">
                        <input
                          aria-label={`Име на ред ${i + 1}`}
                          value={r.name}
                          onChange={(e) => changeRow(r.id, { name: e.target.value })}
                          placeholder="Продукт, услуга или транспорт"
                          className="input"
                        />
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <Mini label="К-во">
                            <input
                              type="number"
                              min={1}
                              max={9999}
                              value={r.qty}
                              onChange={(e) => changeRow(r.id, { qty: Math.max(1, Math.min(9999, Math.round(Number(e.target.value)) || 1)) })}
                              className="input"
                            />
                          </Mini>
                          <Mini label="Продажна ед. с ДДС (€)">
                            <input
                              inputMode="decimal"
                              value={r.priceText}
                              onChange={(e) => changeRow(r.id, { priceText: e.target.value })}
                              placeholder="при запитване"
                              aria-invalid={Number.isNaN(toCents(r.priceText)) || undefined}
                              className="input aria-[invalid=true]:!border-danger"
                            />
                          </Mini>
                          <Mini label="Доставна ед. с ДДС (€)">
                            <input
                              inputMode="decimal"
                              value={r.costText}
                              onChange={(e) => changeRow(r.id, { costText: e.target.value })}
                              aria-invalid={Number.isNaN(toCents(r.costText)) || undefined}
                              className="input aria-[invalid=true]:!border-danger"
                            />
                          </Mini>
                          <Mini label="Печалба / марж">
                            <div className="flex h-[42px] items-center text-[14px]">
                              {profit === null ? (
                                <span className="text-dim">—</span>
                              ) : (
                                <span className={profit < 0 ? "text-danger" : "text-white"}>
                                  {formatPrice(profit)} · {percent(lineMargin(l))}
                                </span>
                              )}
                            </div>
                          </Mini>
                          <Mini label="Доставчик">
                            <input value={r.supplier} onChange={(e) => changeRow(r.id, { supplier: e.target.value })} className="input" />
                          </Mini>
                          <Mini label="Код при доставчика">
                            <input value={r.supplier_code} onChange={(e) => changeRow(r.id, { supplier_code: e.target.value })} className="input" />
                          </Mini>
                          <div className="col-span-2">
                            <Mini label="Спецификация (ред по ред, до 10)">
                              <textarea
                                rows={2}
                                value={r.specsText}
                                onChange={(e) => changeRow(r.id, { specsText: e.target.value })}
                                className="input !h-auto py-2 text-[13px]"
                              />
                            </Mini>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRows((rs) => rs.filter((x) => x.id !== r.id));
                          setDirty(true);
                        }}
                        aria-label={`Премахни ред ${i + 1}`}
                        title="Премахни"
                        className="mt-1.5 p-1.5 text-dim hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setRows((rs) => [...rs, newRow()]);
                setDirty(true);
              }}
              className="btn btn-sm btn-ghost mt-4"
            >
              <Plus className="h-4 w-4" /> Добави свободен ред
            </button>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Състояние">
            <label className="block">
              <span className="mb-2 block text-[12px] uppercase tracking-wide text-muted">Статус</span>
              <select value={fields.status} onChange={(e) => change("status", e.target.value as QuoteStatus)} className="input">
                {(Object.keys(quoteStatusLabels) as QuoteStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {quoteStatusLabels[s]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={save} disabled={saving} className="btn btn-primary mt-4 w-full">
              {saving ? "Записване…" : "Запази промените"}
            </button>
            {message?.ok && (
              <p className="mt-3 flex items-start gap-2 text-[13px] text-ok">
                <Check className="mt-0.5 h-4 w-4 flex-none" /> {message.ok}
              </p>
            )}
            {message?.error && (
              <p role="alert" className="mt-3 text-[13px] text-danger">
                {message.error}
              </p>
            )}
            {dirty && !message && <p className="mt-3 text-[13px] text-dim">Има незаписани промени.</p>}
            <div className="mt-5 space-y-2 border-t border-line pt-4 text-[14px]">
              <Link href={`/admin/dokument/oferta/${quote.id}`} className="flex items-center gap-2 text-accent-ink hover:underline">
                <Eye className="h-4 w-4" /> Клиентски преглед
              </Link>
              <Link href={`/admin/dokument/oferta/${quote.id}?pechat=1`} className="flex items-center gap-2 text-accent-ink hover:underline">
                <FileDown className="h-4 w-4" /> Свали PDF
              </Link>
              {sourceHref && (
                <Link href={sourceHref} className="flex items-center gap-2 text-muted hover:text-white">
                  <ExternalLink className="h-4 w-4" /> Към източника
                </Link>
              )}
            </div>
            <p className="mt-3 text-[12px] text-dim">Прегледът и PDF-ът показват последната записана версия.</p>
          </Panel>

          <Panel title="Желана печалба">
            <label className="block">
              <span className="mb-2 block text-[12px] uppercase tracking-wide text-muted">Обща печалба без ДДС (€)</span>
              <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="напр. 250" className="input" />
            </label>
            <button type="button" onClick={applyTarget} className="btn btn-sm btn-ghost mt-3 w-full">
              <Wand2 className="h-4 w-4" /> Разпредели по редовете
            </button>
            <p className="mt-2 text-[12px] text-dim">
              Разликата се разпределя поравно, стотинките отиват в последния ред. Нужни са продажна и доставна цена навсякъде.
            </p>
          </Panel>

          <Panel title="Версии">
            <ul className="space-y-2 text-[13px]">
              {versions.map((v) => (
                <li key={v.version} className="flex items-center justify-between gap-3">
                  <span className={v.version === quote.version ? "text-white" : "text-muted"}>
                    <History className="mr-1.5 inline h-3.5 w-3.5" />v{v.version} · {formatDate(v.savedAt)}
                  </span>
                  {v.version === quote.version ? (
                    <span className="text-[12px] text-dim">текуща</span>
                  ) : (
                    <button type="button" onClick={() => restore(v.version)} disabled={saving} className="text-[12px] text-accent-ink hover:underline">
                      Възстанови
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-dim">Пазят се последните 20. Възстановяването прави нова версия — нищо не се трие.</p>
          </Panel>

          <button
            type="button"
            onClick={() => {
              if (confirm(`Да се изтрие ли оферта ${quote.number}? Отива в кошчето.`)) startSave(() => deleteQuote(quote.id));
            }}
            className="flex items-center gap-2 text-[13px] text-dim hover:text-danger"
          >
            <Trash2 className="h-4 w-4" /> Изтрий офертата
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, partial, tone }: { label: string; value: string; partial?: boolean; tone?: "bad" }) {
  return (
    <div className="bg-surface-2 p-4 ring-1 ring-line-soft">
      <div className="text-[12px] uppercase tracking-[1.5px] text-dim">{label}</div>
      <div className={`mt-1 font-display text-[22px] ${tone === "bad" ? "text-danger" : "text-white"}`}>
        {value}
        {partial && <span title="Частична — някъде липсва доставна цена"> *</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] uppercase tracking-wide text-muted">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </label>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-dim">{label}</span>
      {children}
    </label>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { describeEntryRules, slugify } from "@/lib/raffles";
import { orderStatusLabels } from "@/lib/orders";
import { createRaffle, updateRaffle, type RaffleFormState } from "./actions";
import { keepValues } from "@/lib/forms";

export type RaffleDefaults = {
  id?: number;
  title?: string;
  slug?: string;
  intro?: string | null;
  rules?: string;
  image_url?: string | null;
  starts_at?: string;
  ends_at?: string;
  status?: string;
  min_order_cents?: number;
  base_entries?: number;
  per_amount_cents?: number | null;
  bonus_entries?: number;
  bonus_category_ids?: number[];
  bonus_product_ids?: number[];
  max_entries_per_order?: number | null;
  count_statuses?: string[];
  reserves_count?: number;
};

const euros = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const defaultRules = `## Организатор

ГлобалНет Сървис Солюшънс ЕООД (GSOL), ЕИК 208548488.

## Срок

Томболата се провежда в посочения на страницата период.

## Кой може да участва

Пълнолетни физически лица с поръчка от gsol.bg в периода на томболата. Служители на GSOL не участват.

## Как се печелят участия

Участията се изчисляват автоматично от потвърдените поръчки според условията, описани на страницата. Отказани и върнати поръчки не участват.

## Теглене и награди

Печелившите се изтеглят на случаен принцип след края на томболата. Един участник може да спечели само една награда. Печелившите се обявяват на тази страница със скрити имена и се уведомяват по телефон или имейл. Наградите не се заменят с пари.

## Лични данни

Данните на участниците се обработват само за провеждане на томболата и предаване на наградите, съгласно Политиката за поверителност.
`;

export function RaffleForm({
  defaults = {},
  categories,
}: {
  defaults?: RaffleDefaults;
  categories: { id: number; label: string }[];
}) {
  const editing = Boolean(defaults.id);
  const [title, setTitle] = useState(defaults.title ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [slug, setSlug] = useState(defaults.slug ?? "");
  const [rules, setRules] = useState({
    min_order_cents: defaults.min_order_cents ?? 0,
    base_entries: defaults.base_entries ?? 1,
    per_amount_cents: defaults.per_amount_cents ?? null,
    bonus_entries: defaults.bonus_entries ?? 0,
    max_entries_per_order: defaults.max_entries_per_order ?? null,
  });
  const [bonusCats, setBonusCats] = useState<number[]>(defaults.bonus_category_ids ?? []);
  const [bonusProducts, setBonusProducts] = useState(defaults.bonus_product_ids?.join(", ") ?? "");
  const productIds = bonusProducts.split(/[\s,]+/).filter((v) => /^\d+$/.test(v));
  const bonusNames = [
    ...categories.filter((c) => bonusCats.includes(c.id)).map((c) => c.label),
    ...productIds.map((id) => `продукт №${id}`),
  ];

  const submit = async (prev: RaffleFormState, form: FormData) => {
    for (const key of ["starts_at", "ends_at"]) {
      const local = String(form.get(key) ?? "");
      form.set(`${key}_iso`, local ? new Date(local).toISOString() : "");
    }
    return editing ? updateRaffle(prev, form) : createRaffle(prev, form);
  };
  const [state, action, pending] = useActionState<RaffleFormState, FormData>(submit, null);

  const toCents = (v: string) => {
    const n = Number(v.replace(",", "."));
    return v.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
  };
  const statuses = defaults.count_statuses ?? ["confirmed", "processing", "shipped", "delivered"];

  return (
    <form onSubmit={keepValues(action)} className="space-y-6">
      {editing && <input type="hidden" name="id" value={defaults.id} />}

      <Panel title="Кампания">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Заглавие" htmlFor="title">
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
              className="input"
            />
          </Field>
          <Field label="Адрес в сайта" htmlFor="slug" hint={`gsol.bg/tomboli/${slug || "…"}`}>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="input font-mono text-[14px]"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Кратко описание (под заглавието)" htmlFor="intro">
              <textarea id="intro" name="intro" defaultValue={defaults.intro ?? ""} rows={2} maxLength={400} className="input !h-auto py-3" />
            </Field>
          </div>
          <Field label="Начало" htmlFor="starts_at">
            <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toLocalInput(defaults.starts_at)} required className="input" />
          </Field>
          <Field label="Край" htmlFor="ends_at">
            <input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toLocalInput(defaults.ends_at)} required className="input" />
          </Field>
          <Field label="Снимка (адрес, по желание)" htmlFor="image_url">
            <input id="image_url" name="image_url" type="url" defaultValue={defaults.image_url ?? ""} placeholder="https://…" className="input" />
          </Field>
          <Field label="Статус" htmlFor="status" hint="Черновата не се вижда в сайта">
            <select id="status" name="status" defaultValue={defaults.status === "drawn" ? "active" : (defaults.status ?? "draft")} className="input">
              <option value="draft">Чернова</option>
              <option value="active">Активна (вижда се в сайта)</option>
              <option value="cancelled">Отменена</option>
            </select>
          </Field>
        </div>
      </Panel>

      <Panel title="Как се печелят участия">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Минимална поръчка (€)" htmlFor="min_order" hint="Продукти след отстъпка, без доставка">
            <input
              id="min_order"
              name="min_order"
              inputMode="decimal"
              defaultValue={euros(defaults.min_order_cents)}
              onChange={(e) => setRules((r) => ({ ...r, min_order_cents: toCents(e.target.value) ?? 0 }))}
              className="input"
            />
          </Field>
          <Field label="Участия за поръчка" htmlFor="base_entries">
            <input
              id="base_entries"
              name="base_entries"
              type="number"
              min={0}
              defaultValue={defaults.base_entries ?? 1}
              onChange={(e) => setRules((r) => ({ ...r, base_entries: Number(e.target.value) || 0 }))}
              className="input"
            />
          </Field>
          <Field label="+1 участие за всеки … €" htmlFor="per_amount" hint="Празно = без бонус по сума">
            <input
              id="per_amount"
              name="per_amount"
              inputMode="decimal"
              defaultValue={euros(defaults.per_amount_cents)}
              onChange={(e) => setRules((r) => ({ ...r, per_amount_cents: toCents(e.target.value) }))}
              className="input"
            />
          </Field>
          <Field label="Бонус участия за продукт" htmlFor="bonus_entries" hint="За всяка бройка от избраните по-долу">
            <input
              id="bonus_entries"
              name="bonus_entries"
              type="number"
              min={0}
              defaultValue={defaults.bonus_entries ?? 0}
              onChange={(e) => setRules((r) => ({ ...r, bonus_entries: Number(e.target.value) || 0 }))}
              className="input"
            />
          </Field>
          <Field label="Таван на поръчка" htmlFor="max_entries_per_order" hint="Празно = без таван">
            <input
              id="max_entries_per_order"
              name="max_entries_per_order"
              type="number"
              min={1}
              defaultValue={defaults.max_entries_per_order ?? ""}
              onChange={(e) => setRules((r) => ({ ...r, max_entries_per_order: Number(e.target.value) || null }))}
              className="input"
            />
          </Field>
          <Field label="Резервни победители" htmlFor="reserves_count">
            <input id="reserves_count" name="reserves_count" type="number" min={0} max={20} defaultValue={defaults.reserves_count ?? 1} className="input" />
          </Field>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-[12px] uppercase tracking-wide text-muted">Бонус категории</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2.5 text-[14px]">
                <input
                  type="checkbox"
                  name="bonus_category_ids"
                  value={c.id}
                  defaultChecked={defaults.bonus_category_ids?.includes(c.id)}
                  onChange={(e) =>
                    setBonusCats((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)))
                  }
                  className="h-4 w-4 accent-accent"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4">
          <Field label="Бонус продукти (номера, разделени със запетая)" htmlFor="bonus_product_ids">
            <input
              id="bonus_product_ids"
              name="bonus_product_ids"
              value={bonusProducts}
              onChange={(e) => setBonusProducts(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-[12px] uppercase tracking-wide text-muted">Броят се поръчки със статус</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2.5 text-[14px]">
                <input
                  type="checkbox"
                  name="count_statuses"
                  value={value}
                  defaultChecked={statuses.includes(value)}
                  className="h-4 w-4 accent-accent"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 bg-bg-deep p-4 text-[14px]">
          <div className="mb-2 text-[12px] uppercase tracking-wide text-dim">Така ще се вижда в сайта</div>
          <ul className="list-disc space-y-1 pl-5 text-muted marker:text-accent-ink">
            {describeEntryRules({ ...rules, has_bonus_items: bonusNames.length > 0 }, bonusNames).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Официални правила">
        <textarea
          id="rules"
          name="rules"
          aria-label="Официални правила"
          defaultValue={defaults.rules || defaultRules}
          rows={16}
          className="input !h-auto py-3 font-mono text-[14px] leading-relaxed"
        />
        <p className="mt-2 text-[12px] text-dim">
          Шаблонът е чернова — прегледайте го с юрист и проверете дали форматът изисква разрешение по Закона за хазарта.
        </p>
      </Panel>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Записване…" : editing ? "Запиши промените" : "Създай томболата"}
        </button>
        {state?.ok && (
          <span className="flex items-center gap-2 text-[14px] text-ok">
            <Check className="h-4 w-4" /> Записано
          </span>
        )}
        {state?.error && (
          <span role="alert" className="text-[14px] text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-dim">{hint}</p>}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { createPromo, updatePromo, type PromoFormState } from "./actions";
import { keepValues } from "@/lib/forms";

export type PromoDefaults = {
  id?: number;
  code?: string;
  description?: string | null;
  discount_type?: "percent" | "fixed" | "free_shipping";
  percent?: number | null;
  amount_cents?: number | null;
  scope?: string;
  scope_category_ids?: number[];
  scope_brands?: string[];
  scope_product_ids?: number[];
  exclude_promo_items?: boolean;
  min_subtotal_cents?: number;
  max_discount_cents?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  first_order_only?: boolean;
  allowed_emails?: string[];
  partner?: string | null;
  is_active?: boolean;
};

const euros = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

/** ISO -> стойност за <input type="datetime-local"> в часовата зона на браузъра */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromoForm({
  defaults = {},
  categories,
}: {
  defaults?: PromoDefaults;
  categories: { id: number; label: string }[];
}) {
  const editing = Boolean(defaults.id);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [type, setType] = useState(defaults.discount_type ?? "percent");
  const [scope, setScope] = useState(defaults.scope ?? "order");

  // Датите от формата се превръщат в ISO в часовата зона на браузъра, преди да стигнат до сървъра
  const submit = async (prev: PromoFormState, form: FormData) => {
    for (const key of ["starts_at", "ends_at"]) {
      const local = String(form.get(key) ?? "");
      form.set(`${key}_iso`, local ? new Date(local).toISOString() : "");
    }
    return editing ? updatePromo(prev, form) : createPromo(prev, form);
  };
  const [state, action, pending] = useActionState<PromoFormState, FormData>(submit, null);

  return (
    <form onSubmit={keepValues(action)} className="space-y-6">
      {editing && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="mode" value={mode} />

      <Panel title="Код">
        {!editing && (
          <div role="tablist" className="mb-5 flex gap-2">
            {(["single", "bulk"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className="chip"
                data-active={mode === m}
              >
                {m === "single" ? "Един код" : "Много уникални кода"}
              </button>
            ))}
          </div>
        )}

        {mode === "single" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Код" htmlFor="code" hint="Латински букви, цифри, - и _. Клиентът може да го пише и с малки букви.">
              <input id="code" name="code" defaultValue={defaults.code} required className="input font-display uppercase tracking-wide" />
            </Field>
            <Field label="Партньор / инфлуенсър" htmlFor="partner" hint="По желание — за проследяване на продажбите">
              <input id="partner" name="partner" defaultValue={defaults.partner ?? ""} className="input" />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Префикс" htmlFor="prefix" hint="напр. FLYER → FLYER-7KQ2M9">
              <input id="prefix" name="prefix" maxLength={12} className="input font-display uppercase" />
            </Field>
            <Field label="Брой кодове" htmlFor="count" hint="от 2 до 1000">
              <input id="count" name="count" type="number" min={2} max={1000} defaultValue={100} className="input" />
            </Field>
            <Field label="Партньор / кампания" htmlFor="partner">
              <input id="partner" name="partner" className="input" />
            </Field>
          </div>
        )}
        <div className="mt-4">
          <Field label="Описание (вижда се само в админа)" htmlFor="description">
            <input id="description" name="description" defaultValue={defaults.description ?? ""} className="input" />
          </Field>
        </div>
      </Panel>

      <Panel title="Отстъпка">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["percent", "Процент", "напр. 10% от сумата"],
              ["fixed", "Фиксирана сума", "напр. 20 € отстъпка"],
              ["free_shipping", "Безплатна доставка", "доставката става 0 €"],
            ] as const
          ).map(([value, title, hint]) => (
            <label
              key={value}
              className={`cursor-pointer p-4 ring-1 ${type === value ? "bg-accent/10 ring-accent" : "bg-bg-deep ring-line hover:ring-dim"}`}
            >
              <input
                type="radio"
                name="discount_type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="sr-only"
              />
              <span className="block text-white">{title}</span>
              <span className="text-[13px] text-muted">{hint}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {type === "percent" && (
            <Field label="Процент" htmlFor="percent">
              <input id="percent" name="percent" inputMode="decimal" defaultValue={defaults.percent ?? ""} required className="input" />
            </Field>
          )}
          {type === "fixed" && (
            <Field label="Сума (€)" htmlFor="amount">
              <input id="amount" name="amount" inputMode="decimal" defaultValue={euros(defaults.amount_cents)} required className="input" />
            </Field>
          )}
          <Field label="Минимална поръчка (€)" htmlFor="min_subtotal">
            <input id="min_subtotal" name="min_subtotal" inputMode="decimal" defaultValue={euros(defaults.min_subtotal_cents)} className="input" />
          </Field>
          {type !== "free_shipping" && (
            <Field label="Таван на отстъпката (€)" htmlFor="max_discount">
              <input id="max_discount" name="max_discount" inputMode="decimal" defaultValue={euros(defaults.max_discount_cents)} className="input" />
            </Field>
          )}
        </div>
      </Panel>

      <Panel title="За кои продукти важи">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["order", "Цялата поръчка"],
              ["categories", "Категории"],
              ["brands", "Марки"],
              ["products", "Конкретни продукти"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="chip cursor-pointer" data-active={scope === value}>
              <input type="radio" name="scope" value={value} checked={scope === value} onChange={() => setScope(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4">
          {scope === "categories" && (
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Категории</legend>
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 text-[14px]">
                  <input
                    type="checkbox"
                    name="scope_category_ids"
                    value={c.id}
                    defaultChecked={defaults.scope_category_ids?.includes(c.id)}
                    className="h-4 w-4 accent-accent"
                  />
                  {c.label}
                </label>
              ))}
            </fieldset>
          )}
          {scope === "brands" && (
            <Field label="Марки (разделени със запетая)" htmlFor="scope_brands">
              <input id="scope_brands" name="scope_brands" defaultValue={defaults.scope_brands?.join(", ")} placeholder="Acer, Lenovo" className="input" />
            </Field>
          )}
          {scope === "products" && (
            <Field label="Номера на продукти (ID, разделени със запетая)" htmlFor="scope_product_ids" hint="Номерът се вижда в адреса на продукта в админа.">
              <input id="scope_product_ids" name="scope_product_ids" defaultValue={defaults.scope_product_ids?.join(", ")} className="input" />
            </Field>
          )}
        </div>
        <label className="mt-4 flex items-center gap-2.5 text-[14px]">
          <input type="checkbox" name="exclude_promo_items" defaultChecked={defaults.exclude_promo_items} className="h-4 w-4 accent-accent" />
          Не важи за продукти, които вече са в промоция
        </label>
      </Panel>

      <Panel title="Срок и лимити">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Начало (по желание)" htmlFor="starts_at">
            <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toLocalInput(defaults.starts_at)} className="input" />
          </Field>
          <Field label="Край (по желание)" htmlFor="ends_at">
            <input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toLocalInput(defaults.ends_at)} className="input" />
          </Field>
          <Field
            label="Общ лимит на ползвания"
            htmlFor="usage_limit"
            hint={mode === "bulk" ? "За всеки код; празно = 1 (еднократни кодове)" : "Празно = без лимит"}
          >
            <input id="usage_limit" name="usage_limit" type="number" min={1} defaultValue={defaults.usage_limit ?? ""} className="input" />
          </Field>
          <Field label="Лимит на клиент (по имейл)" htmlFor="per_customer_limit" hint="Празно = без лимит">
            <input id="per_customer_limit" name="per_customer_limit" type="number" min={1} defaultValue={defaults.per_customer_limit ?? ""} className="input" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Само за тези имейли (по желание, по един на ред)" htmlFor="allowed_emails">
            <textarea id="allowed_emails" name="allowed_emails" rows={2} defaultValue={defaults.allowed_emails?.join("\n")} className="input !h-auto py-3" />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-[14px]">
          <label className="flex items-center gap-2.5">
            <input type="checkbox" name="first_order_only" defaultChecked={defaults.first_order_only} className="h-4 w-4 accent-accent" />
            Само за първа поръчка
          </label>
          <label className="flex items-center gap-2.5">
            <input type="checkbox" name="is_active" defaultChecked={defaults.is_active ?? true} className="h-4 w-4 accent-accent" />
            Активен
          </label>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Записване…" : editing ? "Запиши промените" : mode === "bulk" ? "Генерирай кодовете" : "Създай кода"}
        </button>
        {state?.ok && (
          <span className="flex items-center gap-2 text-[14px] text-ok">
            <Check className="h-4 w-4" /> Записано
          </span>
        )}
        {state?.error && (
          <span role="alert" className="text-[14px] text-accent">
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

"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { updateProduct, type ProductFormState } from "../actions";
import { keepValues } from "@/lib/forms";

type Props = {
  product: {
    id: number;
    name: string;
    price_cents: number;
    regular_price_cents: number | null;
    stock_status: string;
    delivery_days: string;
    summary: string | null;
    category_id: number | null;
    is_active: boolean;
    is_promo: boolean;
    free_windows: boolean;
  };
  categories: { id: number; label: string }[];
};

const euros = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));

export function ProductForm({ product, categories }: Props) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(updateProduct, null);

  return (
    <form onSubmit={keepValues(action)} className="space-y-6">
      <input type="hidden" name="id" value={product.id} />
      <Panel title="Основни данни">
        <div className="space-y-4">
          <Field label="Име" htmlFor="name">
            <input id="name" name="name" defaultValue={product.name} required className="input" />
          </Field>
          <Field label="Кратко описание" htmlFor="summary">
            <textarea id="summary" name="summary" defaultValue={product.summary ?? ""} rows={2} className="input !h-auto py-3" />
          </Field>
          <Field label="Категория" htmlFor="category_id">
            <select id="category_id" name="category_id" defaultValue={product.category_id ?? ""} className="input">
              <option value="">— без категория —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>

      <Panel title="Цена и наличност">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Цена с ДДС (€)" htmlFor="price">
            <input id="price" name="price" inputMode="decimal" defaultValue={euros(product.price_cents)} required className="input" />
          </Field>
          <Field label="Стара цена (€) — за зачеркване" htmlFor="regular_price">
            <input
              id="regular_price"
              name="regular_price"
              inputMode="decimal"
              defaultValue={euros(product.regular_price_cents)}
              placeholder="празно = без намаление"
              className="input"
            />
          </Field>
          <Field label="Наличност" htmlFor="stock_status">
            <select id="stock_status" name="stock_status" defaultValue={product.stock_status} className="input">
              <option value="in_stock">Налично</option>
              <option value="on_request">По запитване</option>
              <option value="out_of_stock">Няма наличност (не може да се поръча)</option>
            </select>
          </Field>
          <Field label="Срок за доставка (работни дни)" htmlFor="delivery_days">
            <input id="delivery_days" name="delivery_days" defaultValue={product.delivery_days} className="input" />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-[14px]">
          <Toggle name="is_active" label="Видим в сайта" defaultChecked={product.is_active} />
          <Toggle name="is_promo" label="В промоция" defaultChecked={product.is_promo} />
          <Toggle name="free_windows" label="Безплатна настройка на Windows" defaultChecked={product.free_windows} />
        </div>
      </Panel>

      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Записване…" : "Запиши промените"}
        </button>
        {state?.ok && (
          <span className="flex items-center gap-2 text-[14px] text-ok">
            <Check className="h-4 w-4" /> Записано — сайтът е обновен
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

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-accent" />
      {label}
    </label>
  );
}

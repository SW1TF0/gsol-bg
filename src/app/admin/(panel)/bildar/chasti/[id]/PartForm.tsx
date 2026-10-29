"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { keepValues } from "@/lib/forms";
import { specFields } from "@/lib/builder/fields";
import { partKinds, partLabels, type PartKind } from "@/lib/builder/parts";
import { savePart, type FormState } from "../../actions";

export type PartDefaults = {
  id?: number;
  kind: PartKind;
  name?: string;
  brand?: string | null;
  part_number?: string | null;
  supplier?: string | null;
  cost_cents?: number;
  lead_days?: number;
  image_url?: string | null;
  in_stock?: boolean;
  specs?: Record<string, unknown>;
};

const label = "mb-1.5 block text-[12px] uppercase tracking-wide text-muted";

export function PartForm({ part }: { part: PartDefaults }) {
  const [kind, setKind] = useState<PartKind>(part.kind);
  const [state, action, pending] = useActionState<FormState, FormData>(savePart, null);
  const specs = kind === part.kind ? (part.specs ?? {}) : {};

  return (
    <form method="post" onSubmit={keepValues(action)} className="space-y-6">
      {part.id && <input type="hidden" name="id" value={part.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="kind" className={label}>
            Вид
          </label>
          <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as PartKind)} disabled={Boolean(part.id)} className="input">
            {partKinds.map((k) => (
              <option key={k} value={k}>
                {partLabels[k]}
              </option>
            ))}
          </select>
          {part.id && <input type="hidden" name="kind" value={kind} />}
        </div>
        <div>
          <label htmlFor="name" className={label}>
            Име
          </label>
          <input id="name" name="name" defaultValue={part.name} required className="input" />
        </div>
        <div>
          <label htmlFor="brand" className={label}>
            Марка
          </label>
          <input id="brand" name="brand" defaultValue={part.brand ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="part_number" className={label}>
            Партномер
          </label>
          <input id="part_number" name="part_number" defaultValue={part.part_number ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="cost" className={label}>
            Доставна цена с ДДС (€)
          </label>
          <input
            id="cost"
            name="cost"
            inputMode="decimal"
            defaultValue={part.cost_cents ? (part.cost_cents / 100).toFixed(2).replace(".", ",") : ""}
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="supplier" className={label}>
            Доставчик
          </label>
          <input id="supplier" name="supplier" defaultValue={part.supplier ?? ""} placeholder="Vali, MOST…" className="input" />
        </div>
        <div>
          <label htmlFor="lead_days" className={label}>
            Срок (работни дни)
          </label>
          <input id="lead_days" name="lead_days" type="number" min={0} max={60} defaultValue={part.lead_days ?? 3} className="input" />
        </div>
        <div>
          <label htmlFor="image_url" className={label}>
            Снимка (за кутиите е задължителна)
          </label>
          <input id="image_url" name="image_url" type="url" defaultValue={part.image_url ?? ""} placeholder="https://…" className="input" />
        </div>
      </div>

      <fieldset>
        <legend className="mb-3 text-[13px] text-white">Спецификации — по тях билдърът проверява съвместимостта</legend>
        <div key={kind} className="grid gap-4 sm:grid-cols-2">
          {specFields[kind].map((f) => {
            const name = `spec_${f.key}`;
            const value = specs[f.key];
            if (f.type === "bool") {
              return (
                <label key={f.key} className="flex items-center gap-2.5 text-[14px]">
                  <input type="checkbox" name={name} defaultChecked={value === true} className="h-4 w-4 accent-accent" />
                  {f.label}
                </label>
              );
            }
            if (f.type === "multi") {
              const chosen = Array.isArray(value) ? value.map(String) : [];
              return (
                <fieldset key={f.key}>
                  <legend className={label}>{f.label}</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {f.options.map((o) => (
                      <label key={String(o)} className="flex items-center gap-2 text-[14px]">
                        <input type="checkbox" name={name} value={String(o)} defaultChecked={chosen.includes(String(o))} className="h-4 w-4 accent-accent" />
                        {String(o)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            }
            return (
              <div key={f.key}>
                <label htmlFor={name} className={label}>
                  {f.label}
                </label>
                {f.type === "select" ? (
                  <select id={name} name={name} defaultValue={value === undefined ? "" : String(value)} className="input">
                    <option value="">{"optional" in f && f.optional ? "—" : "Изберете"}</option>
                    {f.options.map((o) => (
                      <option key={String(o)} value={String(o)}>
                        {String(o)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input id={name} name={name} defaultValue={value === undefined ? "" : String(value)} inputMode={f.type === "number" ? "numeric" : undefined} className="input" />
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <label className="flex items-center gap-2.5 text-[14px]">
        <input type="checkbox" name="in_stock" defaultChecked={part.in_stock ?? true} className="h-4 w-4 accent-accent" />
        Налична (влиза в билдъра и конфигуратора)
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Записване…" : part.id ? "Запиши промените" : "Добави частта"}
        </button>
        {state?.ok && (
          <span className="flex items-center gap-2 text-[14px] text-ok">
            <Check className="h-4 w-4" /> Записано — важи от следващия прогон
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

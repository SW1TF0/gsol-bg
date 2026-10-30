"use client";

import { useActionState } from "react";
import { Check, Lock } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { keepValues } from "@/lib/forms";
import type { InvoiceSettings } from "@/lib/invoices";
import { saveInvoiceSettings, setInvoiceStart, type InvoiceFormState } from "./actions";

function Status({ state }: { state: InvoiceFormState }) {
  if (state?.ok) return <span className="flex items-center gap-2 text-[13px] text-ok"><Check className="h-4 w-4" /> Записано</span>;
  if (state?.error) return <span role="alert" className="text-[13px] text-danger">{state.error}</span>;
  return null;
}

export function SeriesForm({
  series,
  title,
  next,
  min,
  max,
  issued,
  locked,
  canEdit,
}: {
  series: "invoice" | "proforma";
  title: string;
  next: string;
  min: string;
  max: string;
  issued: number;
  locked: boolean;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<InvoiceFormState, FormData>(setInvoiceStart, null);
  return (
    <form method="post" onSubmit={keepValues(action)}>
      <input type="hidden" name="series" value={series} />
      <Panel title={title}>
        <dl className="space-y-1.5 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted">Следващ номер</dt>
            <dd className="font-display text-white">{next}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Издадени</dt>
            <dd className="text-white">{issued}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Диапазон</dt>
            <dd className="text-muted">
              {min} – {max}
            </dd>
          </div>
        </dl>
        {locked ? (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-dim">
            <Lock className="h-4 w-4" /> Началото е заключено — вече има издаден документ.
          </p>
        ) : canEdit ? (
          <div className="mt-4">
            <label htmlFor={`next-${series}`} className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
              Започни от
            </label>
            <div className="flex gap-2">
              <input id={`next-${series}`} name="next" defaultValue={next} inputMode="numeric" maxLength={10} className="input font-mono" />
              <button type="submit" className="btn btn-sm btn-ghost !h-[42px]" disabled={pending}>
                Запиши
              </button>
            </div>
            <p className="mt-1.5 text-[12px] text-dim">Заключва се, щом излезе първият документ.</p>
            <div className="mt-2"><Status state={state} /></div>
          </div>
        ) : null}
      </Panel>
    </form>
  );
}

export function InvoiceSettingsForm({ settings, canEdit }: { settings: InvoiceSettings; canEdit: boolean }) {
  const [state, action, pending] = useActionState<InvoiceFormState, FormData>(saveInvoiceSettings, null);
  return (
    <form method="post" onSubmit={keepValues(action)}>
      <Panel title="Издаване">
        <fieldset disabled={!canEdit} className="space-y-4">
          <div>
            <label htmlFor="mode" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
              Кога се издава фактурата
            </label>
            <select id="mode" name="mode" defaultValue={settings.mode} className="input">
              <option value="manual">Ръчно — с бутон в поръчката</option>
              <option value="on_delivered">Автоматично, щом поръчката стане „Доставена“</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="composed_by" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
                Съставил
              </label>
              <input id="composed_by" name="composed_by" defaultValue={settings.composedBy} placeholder="Име и фамилия" className="input" />
            </div>
            <div>
              <label htmlFor="mol" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
                МОЛ на GSOL
              </label>
              <input id="mol" name="mol" defaultValue={settings.mol} placeholder="Име и фамилия" className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="place" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
              Място на сделката
            </label>
            <input id="place" name="place" defaultValue={settings.place} className="input" />
          </div>
        </fieldset>
        {canEdit && (
          <div className="mt-5 flex items-center gap-4 border-t border-line pt-5">
            <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
              {pending ? "Записване…" : "Запиши"}
            </button>
            <Status state={state} />
          </div>
        )}
      </Panel>
    </form>
  );
}

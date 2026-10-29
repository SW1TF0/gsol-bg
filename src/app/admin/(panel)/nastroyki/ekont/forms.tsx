"use client";

import { useActionState, useTransition } from "react";
import { Check, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { keepValues } from "@/lib/forms";
import { econtEnvLabels, type EcontSettings } from "@/lib/econt-shared";
import {
  removeEcontAccess,
  saveEcontAccess,
  saveEcontSettings,
  saveWeights,
  syncEcontLists,
  testEcontAccess,
  type EcontFormState,
} from "./actions";

function Result({ state, ok }: { state: EcontFormState; ok: string }) {
  if (state?.ok) {
    return (
      <span className="flex items-center gap-2 text-[14px] text-ok">
        <Check className="h-4 w-4" /> {ok}
      </span>
    );
  }
  if (state?.error) {
    return (
      <span role="alert" className="text-[14px] text-danger">
        {state.error}
      </span>
    );
  }
  return null;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
      {children}
    </label>
  );
}

/** Бутоните „Провери достъпа“ и „Обнови списъците“ */
export function StatusActions({ canTest }: { canTest: boolean }) {
  const [testing, startTest] = useTransition();
  const [syncing, startSync] = useTransition();
  return (
    <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
      {canTest && (
        <button type="button" className="btn btn-sm btn-ghost" disabled={testing} onClick={() => startTest(() => testEcontAccess().then(() => {}))}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Провери достъпа
        </button>
      )}
      <button type="button" className="btn btn-sm btn-ghost" disabled={syncing} onClick={() => startSync(() => syncEcontLists().then(() => {}))}>
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Обнови списъците
      </button>
    </div>
  );
}

export function AccessForm({ username, hasPassword }: { username: string | null; hasPassword: boolean }) {
  const [state, action, pending] = useActionState<EcontFormState, FormData>(saveEcontAccess, null);
  const [removing, startRemove] = useTransition();
  return (
    <form method="post" onSubmit={keepValues(action)}>
      <Panel title="Достъп до e-econt">
        <p className="mb-4 text-[13px] text-muted">
          Потребителят и паролата от профила на GSOL в e-econt (с договора). Пазят се криптирани в базата и не се
          показват повече — нито тук, нито в кода.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="username">Потребител</Label>
            <input
              id="username"
              name="username"
              defaultValue={username ?? ""}
              autoComplete="off"
              aria-invalid={state?.field === "username" || undefined}
              className="input aria-[invalid=true]:!border-danger"
            />
          </div>
          <div>
            <Label htmlFor="password">Парола</Label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={hasPassword ? "•••••••• (въведена — напишете нова за смяна)" : ""}
              aria-invalid={state?.field === "password" || undefined}
              className="input aria-[invalid=true]:!border-danger"
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Проверяване…" : "Запиши и провери"}
          </button>
          {hasPassword && (
            <button
              type="button"
              className="text-[13px] text-dim hover:text-danger"
              disabled={removing}
              onClick={() => {
                if (confirm("Да се премахне ли достъпът до Еконт? Реалната среда спира да работи до ново въвеждане.")) {
                  startRemove(() => removeEcontAccess().then(() => {}));
                }
              }}
            >
              Премахни достъпа
            </button>
          )}
          <Result state={state} ok="Записано — резултатът от проверката е горе" />
        </div>
      </Panel>
    </form>
  );
}

export function SendingForm({
  settings,
  offices,
}: {
  settings: EcontSettings;
  offices: { city: string; items: { code: string; label: string }[] }[];
}) {
  const [state, action, pending] = useActionState<EcontFormState, FormData>(saveEcontSettings, null);
  return (
    <form method="post" onSubmit={keepValues(action)}>
      <Panel title="Изпращане">
        <div className="space-y-4">
          <div>
            <Label htmlFor="env">Среда</Label>
            <select id="env" name="env" defaultValue={settings.env} className="input">
              <option value="demo">{econtEnvLabels.demo}</option>
              <option value="live">{econtEnvLabels.live}</option>
            </select>
            <p className="mt-1.5 text-[12px] text-dim">
              В тестовата среда цените са по общата тарифа, а товарителниците са пробни. Реалната ползва договора и
              създава истински товарителници.
            </p>
          </div>
          <div>
            <Label htmlFor="sender_office_code">Офис, от който изпращате</Label>
            <select
              id="sender_office_code"
              name="sender_office_code"
              defaultValue={settings.senderOfficeCode}
              aria-invalid={state?.field === "sender_office_code" || undefined}
              className="input aria-[invalid=true]:!border-danger"
            >
              <option value="">— не е избран —</option>
              {offices.map((g) => (
                <optgroup key={g.city} label={g.city}>
                  {g.items.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sender_agent">Упълномощено лице</Label>
            <input
              id="sender_agent"
              name="sender_agent"
              defaultValue={settings.senderAgent}
              placeholder="Име и фамилия на човека, който предава пратките"
              aria-invalid={state?.field === "sender_agent" || undefined}
              className="input aria-[invalid=true]:!border-danger"
            />
            <p className="mt-1.5 text-[12px] text-dim">Еконт го изисква за пратки от фирма.</p>
          </div>
          <label className="flex items-start gap-2.5 text-[14px]">
            <input type="checkbox" name="auto_label" defaultChecked={settings.autoLabel} className="mt-0.5 h-4 w-4 accent-accent" />
            <span>
              Товарителница веднага след поръчката
              <span className="block text-[12px] text-dim">Иначе — с бутон от страницата на поръчката.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-[14px]">
            <input type="checkbox" name="declared_value" defaultChecked={settings.declaredValue} className="mt-0.5 h-4 w-4 accent-accent" />
            <span>
              Обявена стойност
              <span className="block text-[12px] text-dim">Пратката е застрахована за стойността на продуктите.</span>
            </span>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Записване…" : "Запиши"}
          </button>
          <Result state={state} ok="Записано" />
        </div>
      </Panel>
    </form>
  );
}

export function WeightsForm({
  groups,
}: {
  groups: { id: number; name: string; weight: number | null; children: { id: number; name: string; weight: number | null; products: number }[] }[];
}) {
  const [state, action, pending] = useActionState<EcontFormState, FormData>(saveWeights, null);
  const kg = (w: number | null) => (w === null ? "" : String(w).replace(".", ","));
  const input = (id: number, weight: number | null, label: string) => (
    <input
      id={`weight_${id}`}
      name={`weight_${id}`}
      defaultValue={kg(weight)}
      inputMode="decimal"
      aria-label={`Тегло: ${label}`}
      aria-invalid={state?.field === `weight_${id}` || undefined}
      className="input !h-9 w-24 text-right aria-[invalid=true]:!border-danger"
    />
  );
  return (
    <form method="post" onSubmit={keepValues(action)}>
      <Panel title="Тегла за Еконт (кг)">
        <p className="mb-4 text-[13px] text-muted">
          Еконт смята доставката по теглото на пратката. Всеки продукт взима теглото на своята категория (или на
          отдела), освен ако в продукта не е зададено друго. Машините GSOL са по документа; останалите са начални
          стойности — проверете ги.
        </p>
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="flex items-center justify-between gap-4 border-b border-line pb-2">
                <span className="font-display text-[13px] uppercase tracking-wide text-white">{g.name}</span>
                {input(g.id, g.weight, g.name)}
              </div>
              <ul className="mt-2 space-y-1.5">
                {g.children.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 pl-4 text-[14px]">
                    <span className="text-text">
                      {c.name} <span className="text-[12px] text-dim">{c.products} прод.</span>
                    </span>
                    {input(c.id, c.weight, c.name)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Записване…" : "Запиши теглата"}
          </button>
          <Result state={state} ok="Записано — важи за новите оферти" />
        </div>
      </Panel>
    </form>
  );
}

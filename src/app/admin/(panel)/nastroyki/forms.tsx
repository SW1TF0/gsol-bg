"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { keepValues } from "@/lib/forms";
import { formatPrice } from "@/lib/format";
import { formatIban, isValidIban, shippingPriceLabel, socialNetworks, type SiteSettings } from "@/lib/settings";
import { saveBank, saveCompany, saveShipping, type SettingsFormState } from "./actions";

type Action = (prev: SettingsFormState, form: FormData) => Promise<SettingsFormState>;

/** Една секция с отделен бутон „Запиши“ */
function SettingsForm({
  title,
  action: save,
  footer,
  children,
}: {
  title: string;
  action: Action;
  footer?: React.ReactNode;
  children: (field: string | undefined) => React.ReactNode;
}) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(save, null);
  return (
    <form method="post" onSubmit={keepValues(action)}>
      <Panel title={title}>
        <div className="space-y-4">{children(state?.field)}</div>
        {footer}
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "Записване…" : "Запиши"}
          </button>
          {state?.ok && (
            <span className="flex items-center gap-2 text-[14px] text-ok">
              <Check className="h-4 w-4" /> Записано — сайтът е обновен
            </span>
          )}
          {state?.error && (
            <span role="alert" className="text-[14px] text-danger">
              {state.error}
            </span>
          )}
        </div>
      </Panel>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  invalid,
  ...input
}: { name: string; label: string; hint?: string; invalid?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
        {label}
      </label>
      <input id={name} name={name} aria-invalid={invalid || undefined} className="input aria-[invalid=true]:!border-danger" {...input} />
      {hint && <p className="mt-1.5 text-[12px] text-dim">{hint}</p>}
    </div>
  );
}

const euros = (cents: number) => (cents ? (cents / 100).toFixed(2).replace(".", ",") : "");

export function CompanyForm({ company }: { company: SiteSettings["company"] }) {
  const social = (name: string) => company.socials.find((s) => s.name === name)?.href ?? "";
  return (
    <SettingsForm title="Фирма и контакти" action={saveCompany}>
      {(f) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="brand" label="Марка" defaultValue={company.brand} required invalid={f === "brand"} />
            <Field name="legal_name" label="Фирма" defaultValue={company.legalName} required invalid={f === "legal_name"} />
            <Field name="eik" label="ЕИК" defaultValue={company.eik} inputMode="numeric" required invalid={f === "eik"} />
            <Field name="vat" label="ДДС №" defaultValue={company.vat} hint="Празно, ако фирмата не е регистрирана по ДДС" invalid={f === "vat"} />
            <Field name="phone" label="Телефон" type="tel" defaultValue={company.phone} required invalid={f === "phone"} />
            <Field name="email" label="Имейл" type="email" defaultValue={company.email} required invalid={f === "email"} />
          </div>
          <Field name="address" label="Адрес" defaultValue={company.address} required invalid={f === "address"} />
          <Field name="hours" label="Работно време" defaultValue={company.hours} placeholder="Пон–Пет 09:00–18:00" />
          <fieldset>
            <legend className="mb-2 text-[12px] uppercase tracking-wide text-muted">Социални мрежи (празно = скрито)</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {socialNetworks.map((name) => (
                <div key={name}>
                  <label htmlFor={`social_${name}`} className="sr-only">
                    {name}
                  </label>
                  <input
                    id={`social_${name}`}
                    name={`social_${name}`}
                    type="url"
                    defaultValue={social(name)}
                    placeholder={`${name} — https://…`}
                    aria-invalid={f === `social_${name}` || undefined}
                    className="input aria-[invalid=true]:!border-danger"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        </>
      )}
    </SettingsForm>
  );
}

export function ShippingForm({ shipping }: { shipping: SiteSettings["shipping"] }) {
  const [values, setValues] = useState({
    office: euros(shipping.econtOfficeCents),
    address: euros(shipping.econtAddressCents),
    free: euros(shipping.freeFromCents),
  });
  const toCents = (v: string) => {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return v.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
  };
  const free = toCents(values.free);
  const preview = [
    ["До офис", shippingPriceLabel(toCents(values.office), free)],
    ["До адрес", shippingPriceLabel(toCents(values.address), free)],
  ];

  return (
    <SettingsForm
      title="Доставка с Еконт"
      action={saveShipping}
      footer={
        <div className="mt-5 bg-bg-deep p-4 text-[14px]">
          <div className="mb-2 text-[12px] uppercase tracking-wide text-dim">Така се вижда при поръчка</div>
          <ul className="space-y-1 text-muted">
            {preview.map(([label, price]) => (
              <li key={label}>
                {label}: <span className="text-white">{price}</span>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      {(f) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="econt_office"
              label="До офис (€)"
              inputMode="decimal"
              value={values.office}
              onChange={(e) => setValues((v) => ({ ...v, office: e.target.value }))}
              invalid={f === "econt_office"}
            />
            <Field
              name="econt_address"
              label="До адрес (€)"
              inputMode="decimal"
              value={values.address}
              onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
              invalid={f === "econt_address"}
            />
          </div>
          <Field
            name="free_from"
            label="Безплатна доставка над (€)"
            inputMode="decimal"
            value={values.free}
            onChange={(e) => setValues((v) => ({ ...v, free: e.target.value }))}
            hint={`Сумата на продуктите след отстъпка. Празно = без безплатна доставка.${
              free ? ` Сега: над ${formatPrice(free)}.` : ""
            }`}
            invalid={f === "free_from"}
          />
          <p className="text-[13px] text-muted">
            Новите цени важат за поръчките от момента на записа. Вече направените поръчки пазят своята цена.
          </p>
        </>
      )}
    </SettingsForm>
  );
}

export function BankForm({ bank }: { bank: SiteSettings["bank"] }) {
  const [iban, setIban] = useState(bank.iban ? formatIban(bank.iban) : "");
  const ibanState = !iban.trim() ? null : isValidIban(iban) ? "ok" : "bad";
  return (
    <SettingsForm title="Банкова сметка" action={saveBank}>
      {(f) => (
        <>
          <Field name="holder" label="Титуляр" defaultValue={bank.holder} invalid={f === "holder"} />
          <div>
            <Field
              name="iban"
              label="IBAN"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="BG00 XXXX 0000 0000 0000 00"
              autoComplete="off"
              spellCheck={false}
              className="input font-mono uppercase aria-[invalid=true]:!border-danger"
              invalid={f === "iban" || ibanState === "bad"}
            />
            {ibanState && (
              <p className={`mt-1.5 text-[12px] ${ibanState === "ok" ? "text-ok" : "text-accent-ink"}`}>
                {ibanState === "ok" ? "IBAN е валиден" : "Контролната сума не съвпада — проверете цифрите"}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="bic" label="BIC" defaultValue={bank.bic} placeholder="UNCRBGSF" className="input font-mono uppercase aria-[invalid=true]:!border-danger" invalid={f === "bic"} />
            <Field name="bank_name" label="Банка" defaultValue={bank.bankName} placeholder="напр. УниКредит Булбанк" />
          </div>
          <p className="text-[13px] text-muted">
            Показва се на клиента след поръчка с банков превод, с номера на поръчката като основание.
          </p>
        </>
      )}
    </SettingsForm>
  );
}

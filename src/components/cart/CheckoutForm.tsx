"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Landmark, MapPin, Package, ShieldCheck, Truck, Wallet } from "lucide-react";
import { placeOrder } from "@/app/(shop)/actions";
import { formatPrice } from "@/lib/format";
import type { EcontDirectory } from "@/lib/econt-shared";
import { COD_LIMIT_CENTS, type CheckoutInput, type PaymentMethod, type ShippingMethod } from "@/lib/orders";
import type { Shipping } from "@/lib/settings";
import { useCart } from "./CartProvider";
import { CityPicker, OfficePicker } from "./EcontPicker";
import { OrderSummary } from "./OrderSummary";
import { useQuote } from "./useQuote";

type Errors = Partial<Record<string, string>>;

export function CheckoutForm({
  shippingPrices,
  econt,
  phone,
  phoneHref,
}: {
  shippingPrices: Shipping;
  econt: EcontDirectory;
  phone: string;
  phoneHref: string;
}) {
  const router = useRouter();
  const { lines, ready, promoCode, clear, setPromoCode } = useCart();
  const [shipping, setShipping] = useState<ShippingMethod>("econt_office");
  const [cityId, setCityId] = useState<number | null>(null);
  const [officeCode, setOfficeCode] = useState<string | null>(null);
  const [chosenPayment, setPayment] = useState<PaymentMethod>("cod");
  const [invoiceType, setInvoiceType] = useState<"none" | "person" | "company">("none");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  // Над законовия лимит за плащане в брой остава само банковият превод. Таксата за наложен платеж влиза
  // в доставката, затова веднъж отказан, наложеният платеж остава отказан до промяна в количката —
  // иначе изборът би скачал напред-назад около лимита.
  const cartKey = JSON.stringify([lines.map((l) => [l.id, l.qty]), promoCode]);
  const [codRefusedFor, setCodRefusedFor] = useState<string | null>(null);
  const codAllowed = codRefusedFor !== cartKey;
  const payment: PaymentMethod = codAllowed ? chosenPayment : "bank";
  const listed = econt.offices.length > 0;
  const { quote, pending, error } = useQuote({ method: shipping, cityId, officeCode, payment });
  if (codAllowed && payment === "cod" && quote && !pending && quote.total_cents > COD_LIMIT_CENTS) {
    setCodRefusedFor(cartKey);
  }
  // Същото правило като в базата: прагът е за продуктите след отстъпка; кодът „безплатна доставка“ важи за двата начина
  const itemsCents = quote ? quote.subtotal_cents - quote.discount_cents : 0;
  const freeShipping =
    quote !== null &&
    ((shippingPrices.freeFromCents > 0 && itemsCents >= shippingPrices.freeFromCents) ||
      (quote.promo?.ok === true && quote.promo.type === "free_shipping"));

  if (!ready) return <div className="h-96 animate-pulse bg-surface-2" aria-busy="true" />;

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-xl bg-surface-2 p-10 text-center">
        <p className="h-display text-[22px]">Количката е празна</p>
        <Link href="/promocii" className="btn btn-primary mt-6">
          Разгледай промоциите
        </Link>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (name: string) => String(f.get(name) ?? "").trim();
    const city = econt.cities.find((c) => c.id === cityId);
    const office = econt.offices.find((o) => o.code === officeCode);
    if (listed && !city) {
      setErrors({ shipping_city: "Изберете населено място от списъка." });
      document.getElementById("f-shipping_city")?.focus();
      return;
    }
    if (listed && shipping === "econt_office" && !office) {
      setErrors({ econt_office: "Изберете офис на Еконт от списъка." });
      document.getElementById("f-econt_office")?.focus();
      return;
    }
    const input: CheckoutInput = {
      first_name: text("first_name"),
      last_name: text("last_name"),
      phone: text("phone"),
      email: text("email"),
      shipping_method: shipping,
      shipping_city: city?.name ?? text("shipping_city"),
      econt_city_id: city?.id ?? null,
      econt_office_code: office?.code ?? null,
      shipping_address: text("shipping_address"),
      econt_office: office ? `${office.name} — ${office.address}` : text("econt_office"),
      payment_method: payment,
      invoice:
        invoiceType === "company"
          ? {
              type: "company",
              company: text("company"),
              eik: text("eik").replace(/\s/g, ""),
              vat: text("vat").replace(/\s/g, "").toUpperCase() || undefined,
              mol: text("mol"),
              address: [text("company_city"), text("company_address")].filter(Boolean).join(", "),
            }
          : invoiceType === "person"
            ? {
                type: "person",
                name: text("invoice_name"),
                egn: text("egn").replace(/\s/g, "") || undefined,
                address: text("invoice_address"),
              }
            : null,
      note: text("note"),
      marketing_opt_in: f.get("marketing") === "on",
      promo_code: promoCode,
      terms: f.get("terms") === "on",
      website: text("website"),
    };

    setErrors({});
    setFormError(null);
    startSubmit(async () => {
      const result = await placeOrder(
        lines.map((l) => ({ productId: l.id, qty: l.qty })),
        input,
      );
      if (result.ok) {
        clear();
        setPromoCode(null);
        router.push(`/porachka/uspeh?n=${encodeURIComponent(result.number)}&p=${payment}&t=${result.total_cents}`);
        return;
      }
      if (result.field && result.field !== "items") {
        setErrors({ [result.field]: result.error });
        document.getElementById(`f-${result.field}`)?.focus();
      } else {
        setFormError(result.error);
      }
    });
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-10">
        <Fieldset title="Данни за контакт" icon={Package}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="first_name" label="Име" autoComplete="given-name" errors={errors} required />
            <Field name="last_name" label="Фамилия" autoComplete="family-name" errors={errors} required />
            <Field name="phone" label="Телефон" type="tel" autoComplete="tel" placeholder="0888 123 456" errors={errors} required />
            <Field name="email" label="Имейл" type="email" autoComplete="email" errors={errors} required />
          </div>
        </Fieldset>

        <Fieldset title="Доставка с Еконт" icon={Truck}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              name="shipping_method"
              checked={shipping === "econt_office"}
              onChange={() => {
                setShipping("econt_office");
                // Място без офис не става за „До офис“
                if (econt.cities.find((c) => c.id === cityId)?.offices === 0) setCityId(null);
              }}
              icon={Building2}
              title="До офис на Еконт"
              hint="Взимате пратката от удобен офис"
            />
            <Choice
              name="shipping_method"
              checked={shipping === "econt_address"}
              onChange={() => setShipping("econt_address")}
              icon={MapPin}
              title="До адрес"
              hint="Куриерът идва до вас"
            />
          </div>
          {freeShipping ? (
            <p className="mt-3 text-[13px] text-ok">Доставката е безплатна за тази поръчка.</p>
          ) : (
            shippingPrices.freeFromCents > 0 && (
              <p className="mt-3 text-[13px] text-muted">
                Безплатна доставка за поръчки над{" "}
                <span className="text-white">{formatPrice(shippingPrices.freeFromCents)}</span>
                {quote && ` — добавете още ${formatPrice(shippingPrices.freeFromCents - itemsCents)}`}.
              </p>
            )
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {listed ? (
              <CityPicker
                cities={econt.cities}
                value={cityId}
                onChange={(id) => {
                  setCityId(id);
                  setOfficeCode(null);
                  setErrors({});
                }}
                withOfficesOnly={shipping === "econt_office"}
                error={errors.shipping_city}
              />
            ) : (
              <Field name="shipping_city" label="Населено място" autoComplete="address-level2" errors={errors} required />
            )}
            {shipping === "econt_office" && listed ? (
              <OfficePicker
                offices={econt.offices}
                cityId={cityId}
                value={officeCode}
                onChange={(code) => {
                  setOfficeCode(code);
                  setErrors({});
                }}
                error={errors.econt_office}
              />
            ) : shipping === "econt_office" ? (
              <Field
                name="econt_office"
                label="Офис на Еконт"
                placeholder="напр. Кърджали — Център"
                errors={errors}
                required
              />
            ) : (
              <Field
                name="shipping_address"
                label="Адрес"
                placeholder="улица, номер, вход, етаж, апартамент"
                autoComplete="street-address"
                errors={errors}
                required
              />
            )}
          </div>
          {shipping === "econt_office" && (
            <p className="mt-3 text-[13px] text-muted">Доставка до офис на Еконт — не е нужен адрес.</p>
          )}
          <ShippingNote quote={quote} pending={pending} />
        </Fieldset>

        <Fieldset title="Плащане" icon={Wallet}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              name="payment_method"
              checked={payment === "cod"}
              onChange={() => setPayment("cod")}
              icon={Wallet}
              title="Наложен платеж"
              hint={codAllowed ? "Плащате при получаване" : "Не е възможен над 5 112,92 €"}
              disabled={!codAllowed}
            />
            <Choice
              name="payment_method"
              checked={payment === "bank"}
              onChange={() => setPayment("bank")}
              icon={Landmark}
              title="Банков превод"
              hint="Данните идват с потвърждението"
            />
          </div>
          {!codAllowed && (
            <p className="mt-3 text-[13px] text-muted">
              Над 5 112,92 € законът не позволява плащане в брой, затова наложеният платеж не се предлага. Изберете
              банков превод или се обадете на{" "}
              <a href={phoneHref} className="text-white underline underline-offset-2">
                {phone}
              </a>
              .
            </p>
          )}

          <div className="mt-6 max-w-sm">
            <label htmlFor="f-invoice-type" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
              Желаете ли фактура?
            </label>
            <select
              id="f-invoice-type"
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as typeof invoiceType)}
              className="input"
            >
              <option value="none">Не, не ми е необходима</option>
              <option value="person">Да — на физическо лице</option>
              <option value="company">Да — на фирма</option>
            </select>
          </div>
          {/* Скритите полета не се рисуват — иначе „задължително“ би спряло изпращането */}
          {invoiceType === "person" && (
            <div id="f-invoice" tabIndex={-1} className="mt-4 grid gap-4 bg-surface-2 p-5 sm:grid-cols-2">
              <Field name="invoice_name" label="Име и фамилия" autoComplete="name" errors={{}} required />
              <Field name="egn" label="ЕГН (по желание)" inputMode="numeric" maxLength={10} errors={{}} />
              <div className="sm:col-span-2">
                <Field name="invoice_address" label="Адрес" autoComplete="street-address" errors={{}} required />
              </div>
              {errors.invoice && (
                <p role="alert" className="text-[13px] text-danger sm:col-span-2">
                  {errors.invoice}
                </p>
              )}
            </div>
          )}
          {invoiceType === "company" && (
            <div id="f-invoice" tabIndex={-1} className="mt-4 grid gap-4 bg-surface-2 p-5 sm:grid-cols-2">
              <Field name="company" label="Фирма" autoComplete="organization" errors={{}} required />
              <Field name="eik" label="ЕИК / Булстат" inputMode="numeric" maxLength={13} errors={{}} required />
              <Field name="vat" label="ДДС № (по желание)" placeholder="BG…" errors={{}} />
              <Field name="mol" label="МОЛ" errors={{}} required />
              <Field name="company_city" label="Град по регистрация" errors={{}} required />
              <Field name="company_address" label="Адрес по регистрация" errors={{}} required />
              {errors.invoice && (
                <p role="alert" className="text-[13px] text-danger sm:col-span-2">
                  {errors.invoice}
                </p>
              )}
            </div>
          )}
        </Fieldset>

        <div>
          <label htmlFor="f-note" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
            Бележка към поръчката (по желание)
          </label>
          <textarea id="f-note" name="note" rows={3} maxLength={2000} className="input !h-auto py-3" />
        </div>

        {/* Капан за ботове: скрито поле, което хората не виждат */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
          <label htmlFor="f-website">Не попълвайте</label>
          <input id="f-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-[calc(var(--header-sticky)+24px)]">
        <ul className="max-h-64 space-y-3 overflow-y-auto bg-surface-2 p-4">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 text-[13px]">
              <span className="relative h-12 w-12 flex-none bg-plate">
                {l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-contain p-1 mix-blend-multiply" />}
              </span>
              <span className="line-clamp-2 flex-1 text-text">
                {l.qty} × {l.name}
              </span>
              <span className="whitespace-nowrap text-white">{formatPrice(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>

        <OrderSummary
          quote={quote}
          pending={pending}
          error={error ?? formError}
          shippingKnown={Boolean(quote && !quote.shipping_pending)}
          shippingPendingLabel={shipping === "econt_office" ? "изберете офис" : "изберете място"}
        >
          {errors.promo_code && (
            <p role="alert" className="text-[13px] text-danger">
              {errors.promo_code}
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-muted">
            <input name="marketing" type="checkbox" className="mt-0.5 h-4 w-4 accent-accent" />
            Искам да получавам оферти, промо кодове и покани за томболи по имейл
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-muted">
            <input id="f-terms" name="terms" type="checkbox" required className="mt-0.5 h-4 w-4 accent-accent" />
            <span>
              Прочетох и приемам{" "}
              <Link href="/obshti-usloviya" className="text-white underline underline-offset-2">
                Общите условия
              </Link>
              . Данните за поръчката са верни.
            </span>
          </label>
          {errors.terms && (
            <p role="alert" className="-mt-2 text-[13px] text-danger">
              {errors.terms}
            </p>
          )}
          <button type="submit" className="btn btn-lg btn-primary w-full" disabled={submitting || pending || !quote}>
            {submitting ? "Изпращане…" : `Поръчай${quote && !quote.shipping_pending ? ` · ${formatPrice(quote.total_cents)}` : ""}`}
          </button>
          <p className="flex items-start gap-2 text-[12px] text-dim">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-dim" />
            След поръчката потвърждаваме наличността и срока по телефон или имейл. Дотогава не дължите нищо.
          </p>
        </OrderSummary>
      </aside>
    </form>
  );
}

/** Откъде е цената на доставката — от Еконт по теглото или ориентировъчна */
function ShippingNote({ quote, pending }: { quote: ReturnType<typeof useQuote>["quote"]; pending: boolean }) {
  if (!quote || quote.shipping_pending || quote.shipping_source === "free") return null;
  const kg = quote.weight_kg ? `${String(quote.weight_kg).replace(".", ",")} кг` : null;
  return (
    <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
      <Truck className="h-4 w-4 flex-none text-dim" />
      {pending
        ? "Смятаме доставката с Еконт…"
        : quote.shipping_source === "econt"
          ? `Доставка ${formatPrice(quote.shipping_cents)} — по тарифата на Еконт${kg ? ` за ${kg}` : ""}.`
          : `Доставка ${formatPrice(quote.shipping_cents)} — ориентировъчно; точната цена потвърждаваме с поръчката.`}
    </p>
  );
}

function Fieldset({ title, icon: Icon, children }: { title: string; icon: typeof Package; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-5 flex items-center gap-3 font-display text-[18px] uppercase tracking-wide text-white">
        <Icon className="h-5 w-5 text-accent-ink" strokeWidth={1.5} /> {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  name,
  label,
  errors,
  ...rest
}: { name: string; label: string; errors: Errors } & React.InputHTMLAttributes<HTMLInputElement>) {
  const error = errors[name];
  return (
    <div>
      <label htmlFor={`f-${name}`} className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
        {label}
        {rest.required && <span className="text-accent-ink"> *</span>}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `e-${name}` : undefined}
        className={`input ${error ? "!border-danger" : ""}`}
        {...rest}
      />
      {error && (
        <p id={`e-${name}`} role="alert" className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice({
  name,
  checked,
  onChange,
  icon: Icon,
  title,
  hint,
  price,
  disabled,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  icon: typeof Package;
  title: string;
  hint: string;
  price?: number;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-4 p-4 ring-1 transition ${
        disabled ? "cursor-not-allowed bg-surface-2 opacity-50 ring-line" : checked ? "cursor-pointer bg-accent/10 ring-accent" : "cursor-pointer bg-surface-2 ring-line hover:ring-dim"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      <Icon className={`h-6 w-6 flex-none ${checked ? "text-accent-ink" : "text-dim"}`} strokeWidth={1.5} />
      <span>
        <span className="block text-[15px] font-medium text-white">{title}</span>
        <span className="block text-[13px] text-muted">{hint}</span>
      </span>
      {price !== undefined && (
        <span className="ml-auto whitespace-nowrap pl-2 text-[14px] text-white">
          {price === 0 ? <span className="text-ok">безплатна</span> : formatPrice(price)}
        </span>
      )}
    </label>
  );
}

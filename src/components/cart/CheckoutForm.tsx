"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Landmark, MapPin, Package, ShieldCheck, Truck, Wallet } from "lucide-react";
import { placeOrder } from "@/app/(shop)/actions";
import { formatPrice } from "@/lib/format";
import { COD_LIMIT_CENTS, type CheckoutInput, type PaymentMethod, type ShippingMethod } from "@/lib/orders";
import type { Shipping } from "@/lib/settings";
import { useCart } from "./CartProvider";
import { OrderSummary } from "./OrderSummary";
import { useQuote } from "./useQuote";

type Errors = Partial<Record<string, string>>;

export function CheckoutForm({ shippingPrices, phone, phoneHref }: { shippingPrices: Shipping; phone: string; phoneHref: string }) {
  const router = useRouter();
  const { lines, ready, promoCode, clear, setPromoCode } = useCart();
  const [shipping, setShipping] = useState<ShippingMethod>("econt_office");
  const [chosenPayment, setPayment] = useState<PaymentMethod>("cod");
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const { quote, pending, error } = useQuote(shipping);
  // Над законовия лимит за плащане в брой остава само банковият превод
  const codAllowed = !quote || quote.total_cents <= COD_LIMIT_CENTS;
  const payment: PaymentMethod = codAllowed ? chosenPayment : "bank";
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
    const input: CheckoutInput = {
      first_name: text("first_name"),
      last_name: text("last_name"),
      phone: text("phone"),
      email: text("email"),
      shipping_method: shipping,
      shipping_city: text("shipping_city"),
      shipping_address: text("shipping_address"),
      econt_office: text("econt_office"),
      payment_method: payment,
      invoice: wantsInvoice
        ? {
            company: text("company"),
            eik: text("eik").replace(/\s/g, ""),
            vat: text("vat") || undefined,
            mol: text("mol"),
            address: text("company_address"),
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
    <form onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_380px]">
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
              onChange={() => setShipping("econt_office")}
              icon={Building2}
              title="До офис на Еконт"
              hint="Взимате пратката от удобен офис"
              price={freeShipping ? 0 : shippingPrices.econtOfficeCents}
            />
            <Choice
              name="shipping_method"
              checked={shipping === "econt_address"}
              onChange={() => setShipping("econt_address")}
              icon={MapPin}
              title="До адрес"
              hint="Куриерът идва до вас"
              price={freeShipping ? 0 : shippingPrices.econtAddressCents}
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
            <Field name="shipping_city" label="Населено място" autoComplete="address-level2" errors={errors} required />
            {shipping === "econt_office" ? (
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

          <label className="mt-6 flex cursor-pointer items-center gap-3 text-[14px]">
            <input
              type="checkbox"
              checked={wantsInvoice}
              onChange={(e) => setWantsInvoice(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Искам фактура за фирма
          </label>
          {wantsInvoice && (
            <div id="f-invoice" tabIndex={-1} className="mt-4 grid gap-4 bg-surface-2 p-5 sm:grid-cols-2">
              <Field name="company" label="Име на фирмата" errors={{}} required />
              <Field name="eik" label="ЕИК" inputMode="numeric" errors={{}} required />
              <Field name="vat" label="ДДС № (по желание)" errors={{}} />
              <Field name="mol" label="МОЛ" errors={{}} required />
              <div className="sm:col-span-2">
                <Field name="company_address" label="Адрес на фирмата" errors={{}} required />
              </div>
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

      <aside className="h-fit space-y-4 lg:sticky lg:top-[94px]">
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

        <OrderSummary quote={quote} pending={pending} error={error ?? formError} shippingKnown>
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
            {submitting ? "Изпращане…" : `Поръчай${quote ? ` · ${formatPrice(quote.total_cents)}` : ""}`}
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

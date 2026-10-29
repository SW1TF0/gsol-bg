import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckCircle2, Phone } from "lucide-react";
import { ButtonLink, Container } from "@/components/ui";
import { CheckoutSteps } from "@/components/cart/CheckoutSteps";
import { formatPrice } from "@/lib/format";
import { formatIban } from "@/lib/settings";
import { getSettings } from "@/lib/settings-data";

export const metadata: Metadata = {
  title: "Поръчката е получена",
  robots: { index: false },
};

export default async function OrderSuccessPage(props: PageProps<"/porachka/uspeh">) {
  const { company } = await getSettings();
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <CheckoutSteps current={3} />
      </div>
      <div className="cut-frame cut-lg mx-auto max-w-2xl [--frame:var(--color-ok)]">
        <div className="cut-inner bg-surface-2 p-10 text-center sm:p-14">
          <CheckCircle2 className="mx-auto h-14 w-14 text-ok" strokeWidth={1.5} />
          <h1 className="h-display mt-6 text-[30px]">Благодарим за поръчката!</h1>
          <Suspense fallback={<p className="mt-4 h-6" />}>
            <Details searchParams={props.searchParams} />
          </Suspense>
          <ol className="mx-auto mt-8 max-w-md space-y-3 text-left text-[14px] text-muted">
            <li>
              <b className="font-medium text-white">1. Потвърждение.</b> Ще ви се обадим или пишем, за да потвърдим
              наличността и срока.
            </li>
            <li>
              <b className="font-medium text-white">2. Подготовка.</b> Конфигурациите се сглобяват и тестват преди
              изпращане.
            </li>
            <li>
              <b className="font-medium text-white">3. Доставка.</b> Изпращаме с Еконт и ви пращаме номер на пратката.
            </li>
          </ol>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/">Към началото</ButtonLink>
            <a href={company.phoneHref} className="btn btn-ghost">
              <Phone className="h-4 w-4" /> {company.phone}
            </a>
          </div>
        </div>
      </div>
    </Container>
  );
}

async function Details({ searchParams }: Pick<PageProps<"/porachka/uspeh">, "searchParams">) {
  const params = await searchParams;
  const number = typeof params.n === "string" ? params.n.slice(0, 20) : null;
  const byBank = params.p === "bank";
  const total = typeof params.t === "string" && /^\d{1,9}$/.test(params.t) ? Number(params.t) : null;
  const { bank } = await getSettings();
  return (
    <>
      {number && (
        <p className="mt-4 text-[16px] text-muted">
          Номер на поръчката: <span className="font-display text-[20px] text-white">{number}</span>
        </p>
      )}
      {byBank && bank.iban && (
        <div className="mx-auto mt-6 max-w-md bg-bg-deep p-5 text-left text-[14px]">
          <h2 className="font-display text-[14px] uppercase tracking-wide text-white">Данни за банков превод</h2>
          <dl className="mt-3 space-y-2">
            {[
              ["Получател", bank.holder],
              ["IBAN", formatIban(bank.iban)],
              ["BIC", bank.bic],
              ["Банка", bank.bankName],
              ["Сума", total ? formatPrice(total) : ""],
              ["Основание", number ? `Поръчка ${number}` : ""],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-x-4">
                  <dt className="text-dim">{label}</dt>
                  <dd className={`select-all text-white ${label === "IBAN" ? "font-mono" : ""}`}>{value}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-3 text-[13px] text-muted">
            Изпращаме след постъпване на плащането. Данните идват и с потвърждението на поръчката.
          </p>
        </div>
      )}
      {byBank && !bank.iban && (
        <p className="mx-auto mt-4 max-w-md bg-bg-deep p-4 text-[14px] text-muted">
          Избрахте банков превод. Ще получите данните за плащане заедно с потвърждението. Изпращаме след
          постъпване на сумата.
        </p>
      )}
    </>
  );
}

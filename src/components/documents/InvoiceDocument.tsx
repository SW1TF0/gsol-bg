import { formatDay } from "@/lib/format";
import { amount, invoiceKindLabels, unitPrice, type InvoiceData, type InvoiceKind } from "@/lib/invoices";
import { amountInWordsBg } from "@/lib/money-words";
import { DocLogo } from "./DocToolbar";

// Фактура / проформа / кредитно известие. Чернова (без номер) е с жълта лента „Чернова“ и „№ —“,
// за да не мине за издаден документ. Валута EUR, ДДС 20%.

export function InvoiceDocument({
  kind,
  number,
  issueDate,
  data,
}: {
  kind: InvoiceKind;
  /** null — чернова преди издаване */
  number: string | null;
  issueDate: string;
  data: InvoiceData;
}) {
  const draft = number === null;
  const r = data.recipient;
  const s = data.supplier;

  return (
    <article className="doc-page relative mx-auto my-8 max-w-[860px] bg-[#fff] p-10 text-[13px] leading-relaxed text-[#111827] shadow-xl">
      {draft && (
        <div className="mb-6 bg-[#fde047] px-4 py-2 text-center font-display text-[14px] uppercase tracking-[0.2em] text-[#422006]">
          Чернова — документът не е издаден
        </div>
      )}

      <header className="flex items-start justify-between gap-6 border-b-2 border-[#111827] pb-5">
        <DocLogo />
        <div className="text-right">
          <div className="font-display text-[22px] uppercase tracking-wide">{invoiceKindLabels[kind]}</div>
          <div className="mt-1 font-display text-[16px]">№ {number ?? "—"}</div>
          <div className="text-[12px] uppercase tracking-wide text-[#6b7280]">Оригинал</div>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-3">
        <Pair k="Дата на издаване" v={formatDay(issueDate)} />
        {kind !== "proforma" && <Pair k="Дата на данъчното събитие" v={formatDay(issueDate)} />}
        <Pair k="Място на сделката" v={data.place} />
        <Pair k="Към поръчка" v={data.order_number} />
      </dl>

      {kind === "credit" && data.credit_of && (
        <p className="mt-4 border-l-4 border-[#111827] bg-[#f3f4f6] px-4 py-2">
          Към фактура № {data.credit_of.number} от {formatDay(data.credit_of.issue_date)}
          {data.reason ? ` · Основание: ${data.reason}` : ""}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Party
          title="Доставчик"
          rows={[
            ["Име", s.name],
            ["ЕИК", s.eik],
            ["ДДС №", s.vat],
            ["Адрес", s.address],
            ...(s.mol ? ([["МОЛ", s.mol]] as [string, string][]) : []),
          ]}
        />
        <Party
          title="Получател"
          rows={
            r.type === "company"
              ? [
                  ["Име", r.name],
                  ["ЕИК", r.eik],
                  ...(r.vat ? ([["ДДС №", r.vat]] as [string, string][]) : []),
                  ["Адрес", r.address],
                  ["МОЛ", r.mol],
                ]
              : [["Име", r.name], ...(r.egn ? ([["ЕГН", r.egn]] as [string, string][]) : []), ["Адрес", r.address]]
          }
        />
      </div>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-[#111827] text-left text-[11px] uppercase tracking-wide text-[#4b5563]">
            <th className="w-8 py-2 pr-2 font-medium">№</th>
            <th className="py-2 pr-3 font-medium">Наименование на стоката / услугата</th>
            <th className="w-14 py-2 pr-3 font-medium">Мярка</th>
            <th className="w-14 py-2 pr-3 text-right font-medium">К-во</th>
            <th className="w-28 py-2 pr-3 text-right font-medium">Ед. цена</th>
            <th className="w-28 py-2 text-right font-medium">Стойност</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((l, i) => (
            <tr key={i} className="break-inside-avoid border-b border-[#e5e7eb] align-top">
              <td className="py-2 pr-2 text-[#6b7280]">{i + 1}</td>
              <td className="py-2 pr-3">{l.name}</td>
              <td className="py-2 pr-3">{l.unit}</td>
              <td className="py-2 pr-3 text-right">{l.qty}</td>
              <td className="py-2 pr-3 text-right">{unitPrice(l.value_cents, l.qty)}</td>
              <td className="py-2 text-right">{amount(l.value_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-right text-[11px] text-[#6b7280]">Цените и стойностите са в евро, без ДДС.</p>

      <dl className="ml-auto mt-4 w-80 space-y-1">
        <Row k="Данъчна основа" v={`${amount(data.base_cents)} €`} />
        <Row k={`ДДС ${data.vat_rate}%`} v={`${amount(data.vat_cents)} €`} />
        <div className="flex justify-between border-t-2 border-[#111827] pt-2 text-[16px] font-semibold">
          <dt>Сума за плащане</dt>
          <dd>{amount(data.total_cents)} €</dd>
        </div>
      </dl>
      <p className="mt-3">
        <span className="text-[#6b7280]">Словом: </span>
        {amountInWordsBg(data.total_cents)}
      </p>

      <dl className="mt-5 space-y-1">
        <Row k="Начин на плащане" v={data.payment} />
        {data.payment === "Банков превод" && data.bank.iban && (
          <Row k="Банка / IBAN / BIC" v={[data.bank.name, data.bank.iban, data.bank.bic].filter(Boolean).join(" · ")} />
        )}
      </dl>
      {kind === "proforma" && <p className="mt-4 text-[12px] text-[#6b7280]">Проформата не е данъчен документ.</p>}

      <footer className="mt-12 grid grid-cols-2 gap-10 text-[13px]">
        <div>
          <div className="text-[#6b7280]">Получил:</div>
          <div className="mt-8 border-t border-[#9ca3af] pt-1 text-[12px] text-[#6b7280]">подпис</div>
        </div>
        <div>
          <div className="text-[#6b7280]">Съставил: {data.composed_by || "—"}</div>
          <div className="mt-8 border-t border-[#9ca3af] pt-1 text-[12px] text-[#6b7280]">подпис</div>
        </div>
      </footer>
    </article>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[#6b7280]">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Party({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="border border-[#e5e7eb] p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[#4b5563]">{title}</div>
      <dl className="mt-2 space-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-16 flex-none text-[#6b7280]">{k}</dt>
            <dd>{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-[#4b5563]">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

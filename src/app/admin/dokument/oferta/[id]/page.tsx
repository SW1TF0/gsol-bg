import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { formatDay, formatPrice } from "@/lib/format";
import { quoteEmailText, quoteTotals, type QuoteLine } from "@/lib/quotes";
import { getSettings } from "@/lib/settings-data";
import { DocLogo, DocToolbar } from "@/components/documents/DocToolbar";

// Документът за клиента („Ценова оферта“): само продажни цени — доставчик, доставна цена, печалба
// и марж никога не се показват тук. Името на PDF файла идва от заглавието на страницата.

export async function generateMetadata(props: PageProps<"/admin/dokument/oferta/[id]">): Promise<Metadata> {
  const { db } = await requireStaff(["admin", "manager", "sales"]);
  const { data } = await db.from("quotes").select("number").eq("id", Number((await props.params).id)).maybeSingle();
  return { title: { absolute: data ? `GSOL-${data.number}` : "Оферта" }, robots: { index: false, follow: false } };
}

export default function QuoteDocumentPage(props: PageProps<"/admin/dokument/oferta/[id]">) {
  return (
    <Suspense fallback={null}>
      <QuoteDocument params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function QuoteDocument({ params, searchParams }: Pick<PageProps<"/admin/dokument/oferta/[id]">, "params" | "searchParams">) {
  const { db, staff } = await requireStaff(["admin", "manager", "sales"]);
  const id = Number((await params).id);
  const print = (await searchParams).pechat === "1";
  if (!id) notFound();
  const [{ data: quote }, settings] = await Promise.all([
    db.from("quotes").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    getSettings(),
  ]);
  if (!quote) notFound();

  const company = settings.company;
  const lines = quote.lines as QuoteLine[];
  const totals = quoteTotals(lines);
  const emailText = quoteEmailText({ ...quote, lines }, company, { price: formatPrice, day: formatDay });
  const source = quote.source_url ?? (lines[0]?.slug ? `/produkt/${lines[0].slug}` : null);

  return (
    <div className="min-h-dvh bg-[#e5e7eb] text-[#111827]">
      <DocToolbar
        printLabel="Свали PDF"
        autoPrint={print}
        copyText={emailText}
        links={[{ href: `/admin/oferti/${quote.id}`, label: "Редактирай офертата" }, ...(source ? [{ href: source, label: "Към източника" }] : [])]}
      />

      <article className="doc-page mx-auto my-8 max-w-[860px] bg-[#fff] p-10 text-[13px] leading-relaxed shadow-xl">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[#111827] pb-5">
          <DocLogo />
          <div className="text-right">
            <div className="font-display text-[20px] uppercase tracking-wide">Ценова оферта</div>
            <div className="mt-1 font-display text-[15px]">{quote.number}</div>
            <div className="text-[#4b5563]">от {formatDay(quote.updated_at)}</div>
          </div>
        </header>

        <p className="mt-6 text-[15px]">Здравейте, {quote.client_name},</p>
        <p className="mt-2 text-[#374151]">
          Благодарим за интереса. По-долу е нашата оферта за избраните продукти и услуги — цените са крайни, с ДДС.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <InfoBlock
            title="За клиента"
            rows={[
              ["Получател", quote.client_name],
              ["Фирма / ЕИК", [quote.client_company, quote.client_eik].filter(Boolean).join(" / ") || "—"],
              ["Валидна до", formatDay(quote.valid_until)],
            ]}
          />
          <InfoBlock
            title="От GSOL"
            rows={[
              ["Фирма", company.legalName],
              ["ЕИК / ДДС", [company.eik, company.vat].filter(Boolean).join(" / ")],
              ["Телефон", company.phone],
              ["Имейл", company.email],
            ]}
          />
        </div>

        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#111827] text-left text-[11px] uppercase tracking-wide text-[#4b5563]">
              <th className="py-2 pr-3 font-medium">Продукт</th>
              <th className="w-14 py-2 pr-3 text-right font-medium">К-во</th>
              <th className="w-32 py-2 pr-3 text-right font-medium">Ед. цена с ДДС</th>
              <th className="w-32 py-2 text-right font-medium">Общо</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="break-inside-avoid border-b border-[#e5e7eb] align-top">
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{l.name}</div>
                  {l.specs.length > 0 && (
                    <ul className="mt-1 text-[12px] text-[#4b5563]">
                      {/* Машините показват до 10 части, останалите — до 4 реда спецификация */}
                      {l.specs.slice(0, l.specs.length > 4 && l.cost_cents !== null ? 10 : 4).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right">{l.qty}</td>
                <td className="py-2.5 pr-3 text-right">{l.price_cents === null ? "При запитване" : formatPrice(l.price_cents)}</td>
                <td className="py-2.5 text-right font-medium">{l.price_cents === null ? "При запитване" : formatPrice(l.price_cents * l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-72 space-y-1">
          <Sum label="Данъчна основа" value={formatPrice(totals.base)} />
          <Sum label="ДДС 20%" value={formatPrice(totals.vat)} />
          <div className="flex justify-between border-t-2 border-[#111827] pt-2 text-[16px] font-semibold">
            <dt>Общо с ДДС</dt>
            <dd>{formatPrice(totals.sell)}</dd>
          </div>
        </dl>

        {quote.note && <p className="mt-6 whitespace-pre-line bg-[#f3f4f6] p-4 text-[#374151]">{quote.note}</p>}

        <section className="mt-6 break-inside-avoid">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-[#4b5563]">Условия</h2>
          <ul className="mt-2 space-y-1 text-[#374151]">
            <li>
              <b>Цени:</b> крайни, в евро, с ДДС.
            </li>
            <li>
              <b>Доставка:</b> с Еконт — до офис или до адрес.
            </li>
            <li>
              <b>Плащане:</b> наложен платеж или банков превод.
            </li>
            <li>
              <b>Наличност:</b> потвърждава се при поръчка.
            </li>
            <li>
              <b>Сервиз:</b> собствен сервиз на GSOL и законова гаранция.
            </li>
            <li>
              <b>Валидност:</b> до {formatDay(quote.valid_until)}.
            </li>
          </ul>
          <p className="mt-4 text-[12px] text-[#6b7280]">Офертата не е данъчен документ. Фактура се издава след поръчка.</p>
        </section>

        <footer className="mt-8 flex flex-wrap justify-between gap-4 border-t border-[#d1d5db] pt-4 text-[12px] text-[#4b5563]">
          <span>
            {company.legalName} · {company.address} · {company.phone} · {company.email} · gsol.bg
          </span>
          <span>Изготвил: {staff.display_name || "екипът на GSOL"}</span>
        </footer>
      </article>
    </div>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="border border-[#e5e7eb] p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[#4b5563]">{title}</div>
      <dl className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-28 flex-none text-[#6b7280]">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Sum({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#374151]">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

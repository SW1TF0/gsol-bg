import type { Metadata } from "next";
import { Building2, Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { InquiryForm } from "@/components/InquiryForm";
import { getCompany } from "@/lib/settings-data";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany();
  return {
    title: "Контакти",
    description: `${company.brand} — ${company.address}. Телефон ${company.phone}, ${company.hours}.`,
  };
}

export default async function ContactsPage() {
  const company = await getCompany();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`;
  const cards = [
    { icon: Phone, title: "Телефон", value: company.phone, href: company.phoneHref, hint: "Най-бързият път при спешен случай" },
    { icon: Mail, title: "Имейл", value: company.email, href: `mailto:${company.email}`, hint: "Пишете, ако имате снимки или файлове" },
    { icon: MapPin, title: "Адрес и сервиз", value: company.address, href: mapsUrl, hint: "Отвори в Google Maps" },
    { icon: Clock, title: "Работно време", value: company.hours, hint: "Онлайн поръчки 24/7" },
  ];

  return (
    <>
      <PageHeader title="Свържете се с" accent="нас" tagline="Отговор от човек в работно време" crumbs={[{ label: "Контакти" }]} />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, value, href, hint }) => {
            const body = (
              <div className="cut-inner h-full bg-gradient-to-br from-surface-2 from-50% to-accent/10 p-6">
                <Icon className="h-7 w-7 text-accent-ink" strokeWidth={1.5} />
                <div className="mt-5 text-[12px] uppercase tracking-[1.5px] text-dim">{title}</div>
                <div className="mt-1 break-words text-[16px] text-white">{value}</div>
                <div className="mt-2 text-[13px] text-muted">{hint}</div>
              </div>
            );
            return href ? (
              <a
                key={title}
                href={href}
                {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="cut-frame cut-sm block [--frame:var(--color-line-soft)] hover:[--frame:var(--color-accent)]"
              >
                {body}
              </a>
            ) : (
              <div key={title} className="cut-frame cut-sm [--frame:var(--color-line-soft)]">
                {body}
              </div>
            );
          })}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="h-display mb-6 text-[24px] font-normal">
              Напишете <span className="text-accent-ink">ни</span>
            </h2>
            <InquiryForm topic="kontakti" messageLabel="Съобщение" submitLabel="Изпрати съобщение" />
          </div>
          <aside className="h-fit bg-surface-2 p-6 ring-1 ring-line-soft">
            <Building2 className="h-6 w-6 text-accent-ink" strokeWidth={1.5} />
            <h2 className="h-display mt-4 text-[16px]">Фирмени данни</h2>
            <dl className="mt-4 space-y-3 text-[14px]">
              <div>
                <dt className="text-dim">Фирма</dt>
                <dd className="text-white">{company.legalName}</dd>
              </div>
              <div>
                <dt className="text-dim">ЕИК</dt>
                <dd className="text-white">{company.eik}</dd>
              </div>
              {company.vat && (
                <div>
                  <dt className="text-dim">ДДС №</dt>
                  <dd className="text-white">{company.vat}</dd>
                </div>
              )}
              <div>
                <dt className="text-dim">Адрес</dt>
                <dd className="text-white">{company.address}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}

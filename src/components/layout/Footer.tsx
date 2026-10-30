import Link from "next/link";
import { cacheLife } from "next/cache";
import { ChevronDown, Clock, Mail, MapPin, Phone, Star } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { aiDisclosure, footerColumns, googleLinks, legalLinks } from "@/lib/site";
import { getCompany } from "@/lib/settings-data";
import { CookieSettingsLink } from "@/components/CookieConsent";

// Футър по документа: колони (пазаруване, услуги, GSOL), фирмени данни, социални мрежи, Google Maps и
// „Оставете отзив“, ред с правните връзки и разгъваемият блок „Използване на AI“ (думите не се променят).

export async function Footer() {
  const company = await getCompany();
  return (
    <footer className="mt-auto bg-black">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 lg:grid-cols-[1.2fr_3fr]">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="h-11 w-11" />
            <div>
              <div className="font-display text-[26px] font-semibold uppercase leading-none text-white">GSOL</div>
              <div className="mt-1 text-[12px] uppercase tracking-[1.5px] text-muted">
                Сигурният избор за <b className="font-semibold text-white">техника</b>
              </div>
            </div>
          </div>
          <ul className="mt-8 space-y-3 text-[14px] text-muted">
            <li>
              <a href={company.phoneHref} className="flex items-center gap-2.5 hover:text-white">
                <Phone className="h-4 w-4 text-accent-ink" strokeWidth={1.75} /> {company.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${company.email}`} className="flex items-center gap-2.5 break-all hover:text-white">
                <Mail className="h-4 w-4 flex-none text-accent-ink" strokeWidth={1.75} /> {company.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-accent-ink" strokeWidth={1.75} /> {company.hours}
            </li>
            <li>
              <a href={googleLinks.maps} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-white">
                <MapPin className="h-4 w-4 flex-none text-accent-ink" strokeWidth={1.75} /> {company.address}
              </a>
            </li>
          </ul>
          <a
            href={googleLinks.review}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 bg-surface-2 px-4 py-3 text-[14px] text-white ring-1 ring-line hover:ring-accent"
          >
            <Star className="h-4 w-4 fill-accent text-accent" /> Оставете отзив в Google
          </a>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h2 className="flex items-center gap-2 font-display text-[14px] uppercase tracking-wide text-muted">
                <span className="marker" /> {col.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13px] uppercase tracking-wide text-white transition-colors hover:text-accent-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line-soft">
        <div className="mx-auto max-w-[1200px] px-4 py-6">
          <nav aria-label="Правна информация">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
              {legalLinks.map((l) => (
                <li key={l.slug}>
                  <Link href={`/${l.slug}`} className="text-muted hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <details className="group mt-5 border border-line-soft bg-bg-deep/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] text-white [&::-webkit-details-marker]:hidden">
              <span>
                <b className="font-medium">{aiDisclosure.title}</b>
                <span className="text-muted"> · {aiDisclosure.summary}</span>
              </span>
              <ChevronDown className="h-4 w-4 flex-none text-dim transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 px-4 pb-4 text-[13px] leading-relaxed text-muted">
              {aiDisclosure.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="border-t border-line-soft">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-6 text-[12px] text-dim md:flex-row md:items-center md:justify-between">
          <p>
            © <CopyrightYear /> {company.legalName} · ЕИК {company.eik}
            {company.vat && <> · ДДС № {company.vat}</>}
            {" · "}
            <CookieSettingsLink className="underline underline-offset-2 hover:text-white" />
          </p>
          <ul className="flex gap-2">
            {company.socials.map((s) => (
              <li key={s.name}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="chip !h-8 !text-[12px] uppercase tracking-wide">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

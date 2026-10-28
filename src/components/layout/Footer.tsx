import Link from "next/link";
import { cacheLife } from "next/cache";
import { Mail, MapPin, Phone } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { company, footerColumns } from "@/lib/site";

export function Footer() {
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
                <Phone className="h-4 w-4 text-accent" strokeWidth={1.75} /> {company.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${company.email}`} className="flex items-center gap-2.5 break-all hover:text-white">
                <Mail className="h-4 w-4 flex-none text-accent" strokeWidth={1.75} /> {company.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-accent" strokeWidth={1.75} /> {company.address}
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h2 className="flex items-center gap-2 font-display text-[14px] uppercase tracking-wide text-muted">
                <span className="marker" /> {col.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] uppercase tracking-wide text-white transition-colors hover:text-accent"
                    >
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
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-6 text-[12px] text-dim md:flex-row md:items-center md:justify-between">
          <p>
            © <CopyrightYear /> {company.legalName} · ЕИК {company.eik} · ДДС № {company.vat}
          </p>
          <ul className="flex gap-2">
            {company.socials.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip !h-8 !text-[12px] uppercase tracking-wide"
                >
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

import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { InquiryForm } from "@/components/InquiryForm";
import { getCompany } from "@/lib/settings-data";

// „Заявка за поддръжка“: телефонът е първи, формата е втора (текстът е от сегашния сайт)

export const metadata: Metadata = {
  title: "Заявка за поддръжка",
  description: "Нещо не работи? Обадете се — това е най-бързият път. Или опишете проблема във формата.",
};

const supported = [
  ["Външен IT отдел", "Компютри, лаптопи и потребители в офиса", "gsol-it-support"],
  ["Сървъри и клауд", "Сървъри, виртуални машини и клауд", "gsol-infrastructure"],
  ["Архивиране и киберсигурност", "Архиви, възстановяване и киберсигурност", "gsol-backup"],
  ["Видеонаблюдение", "Видеонаблюдение и контрол на достъпа", "gsol-security"],
  ["Уебсайтове и хостинг", "Сайтове, поща и хостинг", "gsol-web"],
  ["Мрежи и свързаност", "Мрежа, интернет, Wi-Fi и окабеляване", "gsol-network"],
  ["Сервиз и профилактика", "Сервиз, профилактика и подмяна на части", "gsol-service"],
  ["Печат и консумативи", "Принтери, МФУ и консумативи", "gsol-print"],
];

export default async function SupportPage() {
  const company = await getCompany();
  return (
    <>
      <PageHeader
        title="Нещо не работи."
        accent="Да го оправим."
        tagline="Ако проблемът спира работата ви, обадете се — това е най-бързият път"
        crumbs={[{ label: "Поддръжка" }]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <div className="grid gap-4 md:grid-cols-2">
          <a href={company.phoneHref} className="cut-frame [--frame:var(--color-accent)]">
            <span className="cut-inner flex items-center gap-5 bg-accent/10 p-6">
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-accent text-on-accent">
                <Phone className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-display text-[28px] text-white">{company.phone}</span>
                <span className="block text-[14px] text-muted">Човек приема обаждането; реакцията се уточнява според случая или договора</span>
              </span>
            </span>
          </a>
          <a href={`mailto:${company.email}`} className="flex items-center gap-5 bg-surface-2 p-6 ring-1 ring-line-soft hover:ring-accent">
            <Mail className="h-8 w-8 flex-none text-accent-ink" strokeWidth={1.5} />
            <span>
              <span className="block break-all text-[17px] text-white">{company.email}</span>
              <span className="block text-[14px] text-muted">Пишете, ако имате екранни снимки или файлове</span>
            </span>
          </a>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section>
            <h2 className="h-display text-[22px]">Изпратете заявка</h2>
            <p className="mt-2 text-muted">Формата е за случаите, в които не можете да говорите сега или искате да опишете нещо по-подробно.</p>
            <div className="mt-6">
              <InquiryForm defaultTopic="servis" messageLabel="Какво не работи?" submitLabel="Изпратете заявка" />
            </div>
          </section>
          <aside className="space-y-8">
            <section>
              <h2 className="h-display text-[18px]">Какво да напишете, за да стане бързо</h2>
              <p className="mt-2 text-[14px] text-muted">Не е нужно да знаете причината — това е наша работа. Полезно е обаче да имаме следното:</p>
              <ul className="mt-3 space-y-2 text-[14px] text-text [list-style:square] pl-5 marker:text-accent-ink">
                <li>Кое не работи — една машина, всички машини, интернетът, принтерът, пощата.</li>
                <li>От кога — от днес, от вчера, след обновяване, след ток.</li>
                <li>Какво пише на екрана — точното съобщение или снимка на него.</li>
                <li>Колко хора са спрени — това определя с какво започваме.</li>
                <li>Как да ви намерим — телефон, на който ще вдигнете.</li>
              </ul>
            </section>
            <section>
              <h2 className="h-display text-[18px]">С договор или без</h2>
              <p className="mt-2 text-[14px] text-muted">
                Работим и по единични заявки, и по абонамент. При абонамент вече познаваме средата ви — какви машини
                имате, как е вързана мрежата, къде е архивът — и това спестява първия час на всяка следваща заявка.
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-14">
          <h2 className="h-display text-[20px]">Какво поддържаме</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {supported.map(([title, text, anchor]) => (
              <li key={anchor}>
                <Link href={`/za-gsol#${anchor}`} className="block h-full bg-surface-2 p-4 ring-1 ring-line-soft hover:ring-accent">
                  <span className="block text-[15px] text-white">{title}</span>
                  <span className="block text-[13px] text-muted">{text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

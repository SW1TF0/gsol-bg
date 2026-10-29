import type { Metadata } from "next";
import { Archive, ListChecks, Network, ShieldAlert, Users } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { InquiryForm } from "@/components/InquiryForm";
import { Eyebrow } from "@/components/ui";
import { getCompany } from "@/lib/settings-data";

export const metadata: Metadata = {
  title: "Безплатен IT преглед за фирми",
  description: "20-минутен разговор, в който уточняваме IT средата, най-важния риск и правилната следваща стъпка.",
};

export default async function ItReviewPage() {
  const company = await getCompany();
  return (
    <>
      <PageHeader
        title="Безплатен IT"
        accent="преглед"
        tagline="За малки фирми · IT поддръжка в цяла България"
        crumbs={[{ label: "IT преглед" }]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24">
        <p className="max-w-2xl text-[18px] leading-relaxed text-muted">
          В 20-минутен разговор уточняваме как работи фирмата, кое я спира и какво да решите първо — еднократна намеса
          или постоянна поддръжка. Без ангажимент и без достъп до системите ви по време на разговора.
        </p>

        <section className="mt-16" aria-labelledby="when">
          <Eyebrow>Подходящо начало</Eyebrow>
          <h2 id="when" className="h-display mt-2 text-[26px] font-normal">
            Кога разговорът ще ви е <span className="text-accent-ink">полезен</span>
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { icon: Network, title: "Повтарящи се проблеми", text: "Компютри, мрежа, принтери или достъпи пречат на работата отново и отново." },
              { icon: Archive, title: "Неясни архиви", text: "Имате резервно копие, но не знаете кога последно е проверено реално възстановяване." },
              { icon: Users, title: "Твърде много доставчици", text: "Няма една точка за контакт, която да проследи случая от симптома до решението." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="cut-frame cut-lg [--frame:var(--color-line-soft)]">
                <div className="cut-inner bg-gradient-to-br from-transparent from-50% to-accent/10 p-8">
                  <Icon className="h-8 w-8 text-accent-ink" strokeWidth={1.5} />
                  <h3 className="h-display mt-6 text-[19px] font-normal">{title}</h3>
                  <p className="mt-3 text-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.2fr]" aria-labelledby="steps">
          <div>
            <Eyebrow>Как започваме</Eyebrow>
            <h2 id="steps" className="h-display mt-2 text-[26px] font-normal">
              Четири ясни <span className="text-accent-ink">стъпки</span>
            </h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Кратка форма", "Град, приблизителен брой устройства и основният проблем."],
                ["20 минути разговор", "Уточняваме как работи фирмата и какво я спира."],
                ["Първи приоритет", "Получавате конкретна препоръка какво да проверите или решите първо."],
                ["Решение по избор", "Продължаваме само ако GSOL е подходящият партньор за задачата."],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-5">
                  <span className="font-display text-[28px] leading-none text-accent-ink">0{i + 1}</span>
                  <div>
                    <div className="text-[17px] text-white">{title}</div>
                    <p className="mt-1 text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex items-start gap-3 bg-surface-2 p-5 text-[14px] text-muted">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-accent-ink" strokeWidth={1.5} />
              Пароли, клиентски списъци и друг чувствителен достъп не са нужни. Формата и разговорът са достатъчни за
              първа посока.
            </div>
            <p className="mt-6 flex items-center gap-2 text-[14px] text-muted">
              <ListChecks className="h-4 w-4 text-accent-ink" /> Предпочитате разговор веднага?{" "}
              <a href={company.phoneHref} className="text-white hover:text-accent-ink">
                {company.phone}
              </a>
            </p>
          </div>
          <InquiryForm topic="it-pregled" messageLabel="Опишете средата с няколко изречения" submitLabel="Заявете IT преглед" />
        </section>
      </div>
    </>
  );
}

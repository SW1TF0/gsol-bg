import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { Prose } from "@/components/Prose";
import { helpCategories, helpItems } from "@/lib/help-content";
import { getCompany } from "@/lib/settings-data";
import { HelpCenter } from "./HelpCenter";

export const metadata: Metadata = {
  title: "Помощ",
  description: "Отговори за поръчки, конфигурации, доставка, гаранция, сервиз и IT услуги за фирми.",
};

export default async function HelpPage() {
  const company = await getCompany();
  // Отговорите се рисуват на сървъра; браузърът само ги филтрира
  const items = helpItems.map((i) => ({ category: i.category, question: i.question, text: i.answer, answer: <Prose>{i.answer}</Prose> }));

  return (
    <>
      <PageHeader
        title="Как можем"
        accent="да помогнем?"
        tagline="Ясни отговори за поръчки, конфигурации, доставка, гаранция, сервиз и бизнес IT услуги"
        crumbs={[{ label: "Помощ" }]}
      />
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pb-24 lg:grid-cols-[minmax(0,1fr)_320px]">
        <HelpCenter categories={helpCategories} items={items} />

        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-sticky)+24px)] lg:self-start">
          <div className="cut-frame [--frame:var(--color-accent)]">
            <div className="cut-inner bg-surface-2 p-6">
              <p className="tagline">Директна връзка</p>
              <p className="h-display mt-2 text-[20px]">Желаете отговор от човек?</p>
              <p className="mt-2 text-[14px] text-muted">За продукт, сервиз, гаранция или IT поддръжка — ще ви отговори екип, който познава услугите.</p>
              <a href={company.phoneHref} className="btn btn-primary mt-5 w-full">
                <Phone className="h-4 w-4" /> {company.phone}
              </a>
              <a href={`mailto:${company.email}`} className="mt-3 flex items-center justify-center gap-2 break-all text-[13px] text-muted hover:text-white">
                <Mail className="h-4 w-4 flex-none" /> {company.email}
              </a>
            </div>
          </div>
          <div className="bg-surface-2 p-6 ring-1 ring-line-soft">
            <p className="h-display text-[18px]">Не намерихте отговора си?</p>
            <p className="mt-2 text-[14px] text-muted">Опишете случая и ще получите конкретен отговор.</p>
            <Link href="/zapitvane?tema=drugo" className="btn btn-sm btn-ghost mt-4 w-full">
              Изпрати запитване
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

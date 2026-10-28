import { Suspense } from "react";
import type { Metadata } from "next";
import { Clock, Phone } from "lucide-react";
import { PageHeader } from "@/components/catalog/PageHeader";
import { InquiryForm } from "@/components/InquiryForm";
import { publicTopics, type InquiryTopic } from "@/lib/inquiries";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "Бързо запитване",
  description: "Кажете ни какво ви трябва — сервиз, нов компютър, IT поддръжка или видеонаблюдение. Отговор от човек.",
};

export default function InquiryPage(props: PageProps<"/zapitvane">) {
  return (
    <>
      <PageHeader
        title="Бързо"
        accent="запитване"
        tagline="Отнема около минута · без регистрация"
        crumbs={[{ label: "Запитване" }]}
      />
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pb-24 lg:grid-cols-[1fr_340px]">
        <Suspense fallback={<div className="h-[560px] animate-pulse bg-surface-2" />}>
          <FormWithTopic searchParams={props.searchParams} />
        </Suspense>

        <aside className="space-y-6">
          <div className="bg-surface-2 p-6 ring-1 ring-line-soft">
            <Phone className="h-6 w-6 text-accent" strokeWidth={1.5} />
            <p className="h-display mt-4 text-[18px]">Спешно е?</p>
            <p className="mt-2 text-[14px] text-muted">Обаждането е най-бързият път. Човек приема разговора.</p>
            <a href={company.phoneHref} className="btn btn-primary mt-5 w-full">
              {company.phone}
            </a>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-dim">
              <Clock className="h-4 w-4" /> {company.hours}
            </p>
          </div>
          <div className="bg-surface-2 p-6 ring-1 ring-line-soft">
            <p className="h-display text-[16px]">Какво да напишете</p>
            <ul className="mt-3 space-y-2 text-[14px] text-muted">
              <li>Кое не работи — една машина, мрежата, принтерът…</li>
              <li>От кога — след обновяване, след спиране на тока…</li>
              <li>Какво пише на екрана — точното съобщение.</li>
              <li>Как да ви намерим — телефон, на който ще вдигнете.</li>
            </ul>
            <p className="mt-3 text-[13px] text-dim">Не е нужно да знаете причината — това е наша работа.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

// Линковете от сайта водят с ?tema=servis / it / video
const temaToTopic: Record<string, InquiryTopic> = {
  servis: "servis",
  remont: "servis",
  profilaktika: "profilaktika",
  video: "video",
  kompyutar: "nov-kompyutar",
  "nov-kompyutar": "nov-kompyutar",
  it: "it",
  drugo: "drugo",
};

async function FormWithTopic({ searchParams }: Pick<PageProps<"/zapitvane">, "searchParams">) {
  const { tema } = await searchParams;
  const topic = typeof tema === "string" ? temaToTopic[tema] : undefined;
  return <InquiryForm defaultTopic={topic && publicTopics.includes(topic) ? topic : undefined} />;
}

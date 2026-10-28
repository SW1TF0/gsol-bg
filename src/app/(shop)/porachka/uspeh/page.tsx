import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckCircle2, Phone } from "lucide-react";
import { ButtonLink, Container } from "@/components/ui";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "Поръчката е приета",
  robots: { index: false },
};

export default function OrderSuccessPage(props: PageProps<"/porachka/uspeh">) {
  return (
    <Container className="py-24">
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
  const bank = params.p === "bank";
  return (
    <>
      {number && (
        <p className="mt-4 text-[16px] text-muted">
          Номер на поръчката: <span className="font-display text-[20px] text-white">{number}</span>
        </p>
      )}
      {bank && (
        <p className="mx-auto mt-4 max-w-md bg-bg-deep p-4 text-[14px] text-muted">
          Избрахте банков превод. Ще получите данните за плащане заедно с потвърждението. Изпращаме след
          постъпване на сумата.
        </p>
      )}
    </>
  );
}

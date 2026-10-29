import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleSlash } from "lucide-react";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/auth";
import { emailConfig } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/notify";
import { getSettings } from "@/lib/settings-data";
import AdminLoading from "@/app/admin/(panel)/loading";
import { emailSamples, renderSample } from "./samples";
import { TestEmailForm } from "./TestEmailForm";

export const metadata = { title: "Имейли" };

export default function EmailsPage(props: PageProps<"/admin/nastroyki/imeyli">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EmailsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function EmailsContent({ searchParams }: Pick<PageProps<"/admin/nastroyki/imeyli">, "searchParams">) {
  await requireStaff(["admin"]);
  const vid = (await searchParams).vid;
  const current = emailSamples.find((s) => s.id === vid) ?? emailSamples[0];
  const [settings, url] = await Promise.all([getSettings(), siteUrl()]);
  const email = renderSample(current.id, settings, url);
  const config = emailConfig();

  return (
    <>
      <Link href="/admin/nastroyki" className="mb-4 inline-flex items-center gap-2 text-[13px] text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Настройки
      </Link>
      <AdminHeader title="Имейли" subtitle="Какво получават клиентите и магазинът при поръчка и запитване" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="space-y-6">
          <Panel title="Изпращане">
            <p className={`flex items-center gap-2 text-[15px] ${config.enabled ? "text-ok" : "text-muted"}`}>
              {config.enabled ? <CheckCircle2 className="h-5 w-5" /> : <CircleSlash className="h-5 w-5" />}
              {config.enabled ? "Включено" : "Още не е настроено — писмата не се изпращат"}
            </p>
            <dl className="mt-4 space-y-2 text-[14px]">
              <div className="flex flex-wrap justify-between gap-x-4">
                <dt className="text-dim">Подател</dt>
                <dd className="text-white">{config.from}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4">
                <dt className="text-dim">Известия до магазина</dt>
                <dd className="break-all text-white">{settings.company.email}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[13px] text-muted">
              Известията отиват на имейла от{" "}
              <Link href="/admin/nastroyki" className="text-white underline underline-offset-2">
                Фирма и контакти
              </Link>
              . Когато клиентът отговори на писмо, отговорът стига там.
            </p>
          </Panel>

          {!config.enabled && (
            <Panel title="Как да се включи">
              <ol className="list-decimal space-y-2.5 pl-5 text-[14px] text-muted marker:text-accent">
                <li>
                  Регистрация в <span className="text-white">resend.com</span> — безплатно до 3000 писма на месец.
                </li>
                <li>
                  В Resend: <span className="text-white">Domains → Add domain → gsol.bg</span>. Добавете показаните DNS записи при
                  доставчика на домейна. Проверката обикновено отнема до час.
                </li>
                <li>
                  <span className="text-white">API Keys → Create API key</span> и копирайте ключа. Не го пращайте в чат или по
                  имейл.
                </li>
                <li>
                  Поставете ключа в <code className="text-white">.env.local</code> (и при хостинга) като{" "}
                  <code className="text-white">RESEND_API_KEY</code>, после рестартирайте сайта. По желание:{" "}
                  <code className="text-white">EMAIL_FROM</code> за подателя и <code className="text-white">SITE_URL</code> за
                  връзките в писмата.
                </li>
              </ol>
            </Panel>
          )}

          <Panel title="Кога се изпращат">
            <ul className="space-y-2 text-[14px] text-muted">
              <li>
                <b className="font-medium text-white">Нова поръчка</b> — потвърждение до клиента и известие до магазина.
              </li>
              <li>
                <b className="font-medium text-white">Ново запитване</b> — известие до магазина.
              </li>
              <li>
                <b className="font-medium text-white">Смяна на статуса</b> — до клиента, ако при записа е отметнато „Уведоми
                клиента по имейл“.
              </li>
            </ul>
            <p className="mt-3 text-[13px] text-muted">Всяко писмо по поръчка се вижда в историята ѝ.</p>
          </Panel>
        </div>

        <Panel>
          <nav aria-label="Примерни писма" className="mb-4 flex flex-wrap gap-2">
            {emailSamples.map((s) => (
              <Link
                key={s.id}
                href={`/admin/nastroyki/imeyli?vid=${s.id}`}
                data-active={s.id === current.id}
                aria-current={s.id === current.id ? "page" : undefined}
                className="chip"
              >
                {s.label}
              </Link>
            ))}
          </nav>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="text-[14px]">
              <div className="text-dim">До {current.to} · Тема</div>
              <div className="text-white">{email.subject}</div>
            </div>
            <TestEmailForm vid={current.id} enabled={config.enabled} />
          </div>
          {current.id === "bankov-prevod" && !settings.bank.iban && (
            <p className="mb-3 bg-accent/10 px-3 py-2 text-[13px] text-text ring-1 ring-accent/30">
              Няма въведен IBAN, затова писмото е без банкови данни. Въведете сметката в{" "}
              <Link href="/admin/nastroyki" className="underline underline-offset-2">
                Настройки
              </Link>
              .
            </p>
          )}
          <iframe
            title={`Преглед: ${current.label}`}
            srcDoc={email.html}
            sandbox=""
            className="h-[900px] w-full bg-white"
          />
        </Panel>
      </div>
    </>
  );
}

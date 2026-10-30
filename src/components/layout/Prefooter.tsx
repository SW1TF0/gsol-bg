import { BadgeCheck, Gauge, Phone, ShieldCheck, Star } from "lucide-react";
import { googleLinks } from "@/lib/site";
import { getSettings } from "@/lib/settings-data";
import { PrefooterGate } from "./PrefooterGate";

// Преди футъра: отзивите от Google и четирите предимства. Оценката и броят са от „Настройки“ (пишат се
// на ръка от собственика); без тях лентата е само с връзките. Не се показва на правните страници,
// в чекаута и на „Кои сме ние“ (PrefooterGate).

const advantages = [
  { icon: BadgeCheck, title: "Windows настройка", text: "Безплатна инсталация и начална настройка. Лицензът не е включен." },
  { icon: Gauge, title: "Сглобяване и тест", text: "Всяка конфигурация минава тест под натоварване преди изпращане." },
  { icon: ShieldCheck, title: "Собствен сервиз", text: "Законова гаранция и директна диагностика при нас." },
  { icon: Phone, title: "Потвърждение от човек", text: "Наличността и срокът се потвърждават преди изпълнение." },
];

export async function Prefooter() {
  const { reviews } = await getSettings();
  return (
    <PrefooterGate>
      <section aria-label="Отзиви и предимства" className="border-t border-line-soft bg-bg-alt py-14">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <p className="tagline">Отзиви в Google</p>
            {reviews.rating ? (
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-display text-[44px] leading-none text-white">{reviews.rating}</span>
                <span className="flex gap-0.5" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                  ))}
                </span>
              </div>
            ) : (
              <p className="h-display mt-3 text-[22px]">Какво казват клиентите</p>
            )}
            {reviews.count > 0 && <p className="mt-1 text-[14px] text-muted">от {reviews.count} отзива в Google</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={googleLinks.maps} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
                Прочетете отзивите
              </a>
              <a href={googleLinks.review} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                Оставете отзив
              </a>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {advantages.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 bg-surface-2 p-5 ring-1 ring-line-soft">
                <Icon className="h-7 w-7 flex-none text-accent-ink" strokeWidth={1.5} />
                <div>
                  <div className="font-display text-[15px] uppercase tracking-wide text-white">{title}</div>
                  <p className="mt-1 text-[14px] text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PrefooterGate>
  );
}

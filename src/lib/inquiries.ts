// Теми на запитванията — общи за сайта и админа.

export type InquiryTopic = "servis" | "profilaktika" | "video" | "nov-kompyutar" | "it" | "it-pregled" | "kontakti" | "drugo";

export const inquiryTopics: Record<InquiryTopic, { label: string; hint: string }> = {
  servis: { label: "Диагностика и ремонт", hint: "Не стартира, прегрява, забива или дава грешка" },
  profilaktika: { label: "Профилактика и преинсталация", hint: "Почистване, охлаждане и софтуерна настройка" },
  video: { label: "Видеонаблюдение", hint: "Оглед, монтаж, настройка и ремонт на камери" },
  "nov-kompyutar": { label: "Нов компютър или лаптоп", hint: "За работа, дома, обучение или игри" },
  it: { label: "IT поддръжка за фирма", hint: "Устройства, мрежа, архивиране и дистанционна помощ" },
  "it-pregled": { label: "Безплатен IT преглед", hint: "20-минутен разговор за фирми" },
  kontakti: { label: "Съобщение от „Контакти“", hint: "Общ въпрос" },
  drugo: { label: "Друго запитване", hint: "Опишете задачата и ще я насочим към правилния човек" },
};

/** Темите, които клиентът избира в общата форма */
export const publicTopics: InquiryTopic[] = ["servis", "profilaktika", "video", "nov-kompyutar", "it", "drugo"];

export const inquiryStatusLabels: Record<string, string> = {
  new: "Ново",
  in_progress: "В работа",
  done: "Приключено",
  spam: "Спам",
};

export type InquiryState = { ok?: boolean; error?: string; field?: string } | null;

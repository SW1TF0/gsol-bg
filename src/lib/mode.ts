// Режим „за дома“ / „за бизнеса“ — като темата: пази се в браузъра и се прилага преди рисуването.
// Сървърът рисува и двата варианта, а CSS показва единия (вариант business:) — без проблясване и без
// да се губи кешът на страниците. Цените остават с ДДС и в двата режима.

export type Mode = "home" | "business";

export const MODE_KEY = "gsol-mode";
/** Събитие при смяна — за компоненти, които четат режима (напр. фактура на фирма по подразбиране) */
export const MODE_EVENT = "gsol:mode";

/** Изпълнява се преди рисуването */
export const modeScript = `try{if(localStorage.getItem("${MODE_KEY}")==="business")document.documentElement.dataset.mode="business"}catch(e){}`;

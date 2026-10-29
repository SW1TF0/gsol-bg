// Тема: по подразбиране тъмна; изборът се пази в браузъра и се прилага преди рисуването.
// Скриптът е в обикновен модул (не в клиентския компонент): от "use client" модул сървърът получава
// само препратка, а не самия текст.

export const THEME_KEY = "gsol-theme";

/** Изпълнява се преди рисуването: прилага запазената тема, за да няма проблясване */
export const themeScript = `try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

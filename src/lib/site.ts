// Навигация на сайта. Фирмените данни идват от админа (Настройки) — вижте lib/settings-data.ts.

export const footerColumns = [
  {
    title: "Пазаруване",
    links: [
      { label: "Магазин", href: "/magazin" },
      { label: "Лаптопи", href: "/katalog/laptopi" },
      { label: "Гейминг компютри", href: "/katalog/kompyutri" },
      { label: "Конфигуратор", href: "/konfigurator" },
      { label: "Избери решение", href: "/izberi-reshenie" },
      { label: "Промоции", href: "/promocii" },
      { label: "Томболи", href: "/tomboli" },
    ],
  },
  {
    title: "Услуги",
    links: [
      { label: "Външен IT отдел", href: "/za-gsol#gsol-it-support" },
      { label: "Сървъри и клауд", href: "/za-gsol#gsol-infrastructure" },
      { label: "Архивиране и сигурност", href: "/za-gsol#gsol-backup" },
      { label: "Видеонаблюдение", href: "/za-gsol#gsol-security" },
      { label: "Уебсайтове и хостинг", href: "/za-gsol#gsol-web" },
      { label: "Мрежи и свързаност", href: "/za-gsol#gsol-network" },
      { label: "Сервиз и профилактика", href: "/za-gsol#gsol-service" },
      { label: "Печат и консумативи", href: "/za-gsol#gsol-print" },
    ],
  },
  {
    title: "GSOL",
    links: [
      { label: "Кои сме ние", href: "/za-gsol" },
      { label: "Помощ и FAQ", href: "/pomosht" },
      { label: "Съвети", href: "/blog" },
      { label: "Бързо запитване", href: "/zapitvane" },
      { label: "Заявка за поддръжка", href: "/poddrazhka" },
      { label: "Безплатен IT преглед", href: "/it-pregled" },
      { label: "Контакти", href: "/kontakti" },
    ],
  },
];

/** Деветте правни страници — в този ред в менюто им и във футъра */
export const legalLinks = [
  { slug: "pravna-informaciya", label: "Правна информация" },
  { slug: "obshti-usloviya", label: "Общи условия" },
  { slug: "poveritelnost", label: "Поверителност" },
  { slug: "biskvitki", label: "Бисквитки и настройки" },
  { slug: "dostavka-i-plashtane", label: "Доставка и плащане" },
  { slug: "vrashtane-i-otkaz", label: "Връщане и отказ" },
  { slug: "reklamacii-garanciya-serviz", label: "Рекламации и гаранция" },
  { slug: "izpolzvane-na-ai", label: "Използване на AI" },
  { slug: "sigurnost", label: "Сигурност" },
];

/** Отзиви в Google и карта — от сегашния сайт */
export const googleLinks = {
  review: "https://g.page/r/CSDaBekVPcUfEBM/review",
  maps: "https://www.google.com/maps/place/Globalnet+Service+Solutions+-+GSOL/@41.638948,25.3746524,784m/data=!3m2!1e3!4b1!4m6!3m5!1s0x14ad73304152591b:0x1fc53d15e905da20!8m2!3d41.638948!4d25.3746524!16s%2Fg%2F11yydpvych",
};

/**
 * Оповестяване за използването на AI — законово задължение. Думите не се променят (взети едно към едно
 * от футъра на сегашния сайт); блокът остава разгъваем.
 */
export const aiDisclosure = {
  title: "Използване на AI",
  summary: "Информация относно използването на изкуствен интелект",
  paragraphs: [
    "При създаването и поддръжката на този сайт могат да се използват инструменти с изкуствен интелект за техническа разработка, генериране и редактиране на код, езикова редакция, подготовка на текстове, продуктови описания и обработка на изображения.",
    "Всички продуктови описания, търговски съобщения и публикувани материали се преглеждат и одобряват от нас преди публикуване, като ние носим редакционна и търговска отговорност за съдържанието им.",
    "Част от изображенията на сайта може да са изкуствено генерирани или обработени чрез система с изкуствен интелект, включително изображения, базирани на реален образ на собственика/представителя на сайта. Когато изображение е съществено обработено с изкуствен интелект и може да бъде възприето като реално, това се обозначава към съответното изображение или по друг ясен и видим начин.",
    "Използването на изкуствен интелект не променя задължението ни предоставяната информация за стоки, услуги, цени, условия и характеристики да бъде вярна, пълна, ясна, четлива и разбираема.",
  ],
};

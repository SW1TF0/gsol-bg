// Фирмени данни и навигация. По-късно ще се редактират от админ панела (Настройки).

export const company = {
  brand: "GSOL",
  legalName: "ГлобалНет Сървис Солюшънс ЕООД",
  eik: "208548488",
  vat: "BG208548488",
  phone: "0898 570 500",
  phoneHref: "tel:+359898570500",
  email: "contact.globalnetss@gmail.com",
  address: "Кърджали, ул. „Булаир“ 35",
  hours: "Пон–Пет 09:00–18:00",
  socials: [
    { name: "Facebook", href: "https://www.facebook.com/profile.php?id=61594105307680" },
    { name: "Instagram", href: "https://www.instagram.com/gsol.bg/" },
    { name: "TikTok", href: "https://www.tiktok.com/@gsol.bg" },
  ],
};

export const mainNav = [
  { label: "Лаптопи", href: "/katalog/laptopi" },
  { label: "Компютри", href: "/katalog/kompyutri" },
  { label: "Компоненти", href: "/katalog/komponenti" },
  { label: "Периферия", href: "/katalog/periferiya" },
  { label: "Реновирани", href: "/katalog/renovirani" },
  { label: "Услуги", href: "/#uslugi" },
];

export const footerColumns = [
  {
    title: "Магазин",
    links: [
      { label: "Лаптопи", href: "/katalog/laptopi" },
      { label: "Гейминг компютри", href: "/katalog/kompyutri" },
      { label: "Компоненти", href: "/katalog/komponenti" },
      { label: "Периферия", href: "/katalog/periferiya" },
      { label: "Промоции", href: "/promocii" },
      { label: "Томболи", href: "/tomboli" },
    ],
  },
  {
    title: "Услуги",
    links: [
      { label: "Сервиз и профилактика", href: "/#uslugi" },
      { label: "Външен IT отдел", href: "/#uslugi" },
      { label: "Видеонаблюдение", href: "/#uslugi" },
      { label: "Уебсайтове и хостинг", href: "/#uslugi" },
    ],
  },
  {
    title: "Клиенти",
    links: [
      { label: "Доставка и плащане", href: "/dostavka-i-plashtane" },
      { label: "Връщане и отказ", href: "/vrashtane-i-otkaz" },
      { label: "Гаранция и сервиз", href: "/garanciya" },
      { label: "Моят профил", href: "/profil" },
    ],
  },
  {
    title: "GSOL",
    links: [
      { label: "За нас", href: "/za-nas" },
      { label: "Контакти", href: "/kontakti" },
      { label: "Общи условия", href: "/obshti-usloviya" },
      { label: "Поверителност", href: "/poveritelnost" },
    ],
  },
];

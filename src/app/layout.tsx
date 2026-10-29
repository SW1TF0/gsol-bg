import type { Metadata } from "next";
import { Onest, Tektur } from "next/font/google";
import Script from "next/script";
import { themeScript } from "@/components/ThemeToggle";
import "./globals.css";

const tektur = Tektur({
  variable: "--font-tektur",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "GSOL — Сигурният избор за техника и IT услуги",
    template: "%s | GSOL",
  },
  description:
    "Лаптопи, гейминг компютри, компоненти и периферия. Сглобяване и тест, собствен сервиз и IT поддръжка за фирми.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: скриптът за тема слага data-theme на <html> преди React
    <html
      lang="bg"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${tektur.variable} ${onest.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col">
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}

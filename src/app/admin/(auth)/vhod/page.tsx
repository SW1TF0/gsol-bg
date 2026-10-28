import { Suspense } from "react";
import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Вход в админ панела",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage(props: PageProps<"/admin/vhod">) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-deep px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div className="font-display text-[22px] uppercase tracking-wide text-white">
            GSOL <span className="text-accent">админ</span>
          </div>
        </div>
        <Suspense fallback={<div className="h-80 animate-pulse bg-surface-2" />}>
          <Notice searchParams={props.searchParams} />
        </Suspense>
        <LoginForm />
      </div>
    </main>
  );
}

async function Notice({ searchParams }: Pick<PageProps<"/admin/vhod">, "searchParams">) {
  const params = await searchParams;
  if (params.potvarden) {
    return (
      <p className="mb-4 bg-ok/10 p-3 text-[14px] text-ok ring-1 ring-ok/30">
        Имейлът е потвърден. Влезте с паролата си.
      </p>
    );
  }
  if (params.greshka === "nyama-dostap") {
    return (
      <p className="mb-4 bg-accent/10 p-3 text-[14px] text-white ring-1 ring-accent/40">
        Профилът ви още няма роля в админ панела. Помолете администратор да ви добави.
      </p>
    );
  }
  return null;
}

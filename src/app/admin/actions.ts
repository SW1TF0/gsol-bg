"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/supabase/clients";

export type AuthState = { error?: string; message?: string } | null;

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Въведете имейл и парола." };

  const db = await sessionClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error: error.message.includes("Email not confirmed")
        ? "Имейлът още не е потвърден. Отворете връзката от писмото за регистрация."
        : "Грешен имейл или парола.",
    };
  }
  redirect("/admin");
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Въведете валиден имейл." };
  if (password.length < 10) return { error: "Паролата трябва да е поне 10 символа." };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const db = await sessionClient();
  const { error } = await db.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/admin/vhod?potvarden=1` },
  });
  if (error) return { error: "Регистрацията не успя. Опитайте отново след малко." };
  return {
    message:
      "Изпратихме писмо за потвърждение. Ако сте поканени, достъпът се включва веднага след потвърждението; иначе администратор трябва да ви даде роля.",
  };
}

export async function signOut() {
  const db = await sessionClient();
  await db.auth.signOut();
  redirect("/admin/vhod");
}

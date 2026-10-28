"use server";

import { headers } from "next/headers";
import { publicClient } from "@/lib/supabase/clients";
import { inquiryTopics, type InquiryState, type InquiryTopic } from "@/lib/inquiries";
import type { Json } from "@/lib/supabase/database.types";

const DETAIL_FIELDS = ["city", "devices", "budget", "purpose", "contact_time"] as const;

export async function submitInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  // Капан за ботове
  if (String(form.get("website") ?? "")) return { ok: true };

  const topic = String(form.get("topic") ?? "") as InquiryTopic;
  const name = String(form.get("name") ?? "").trim();
  const contact = String(form.get("contact") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();

  if (!(topic in inquiryTopics)) return { error: "Изберете тема.", field: "topic" };
  if (name.length < 2) return { error: "Въведете име.", field: "name" };
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact);
  const isPhone = /^\+?[0-9]{8,15}$/.test(contact.replace(/[\s()-]/g, ""));
  if (!isEmail && !isPhone) return { error: "Въведете телефон или имейл, на който да ви отговорим.", field: "contact" };
  if (message.length < 5) return { error: "Опишете накратко какво ви трябва.", field: "message" };
  if (message.length > 3000) return { error: "Съобщението е твърде дълго.", field: "message" };
  if (form.get("privacy") !== "on") return { error: "Нужно е съгласие за обработка на данните.", field: "privacy" };

  const details: Record<string, string> = {};
  for (const key of DETAIL_FIELDS) {
    const value = String(form.get(key) ?? "").trim().slice(0, 200);
    if (value) details[key] = value;
  }

  const referer = (await headers()).get("referer") ?? "";
  const { error } = await publicClient()
    .from("inquiries")
    .insert({
      topic,
      name: name.slice(0, 100),
      contact: contact.slice(0, 120),
      message,
      details: details as Json,
      source_url: referer ? new URL(referer).pathname.slice(0, 300) : null,
    });

  if (error) {
    console.error("inquiry", error);
    return { error: "Запитването не се изпрати. Опитайте отново или ни се обадете." };
  }
  return { ok: true };
}

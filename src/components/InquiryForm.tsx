"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import { submitInquiry } from "@/app/(shop)/inquiry-actions";
import { inquiryTopics, publicTopics, type InquiryState, type InquiryTopic } from "@/lib/inquiries";
import { keepValues } from "@/lib/forms";

type Extra = "city" | "devices" | "budget" | "purpose" | "contact_time";

const extraLabels: Record<Extra, { label: string; placeholder: string }> = {
  city: { label: "Град / локации", placeholder: "напр. Кърджали" },
  devices: { label: "Служители / устройства", placeholder: "напр. 8 души, 10 компютъра" },
  budget: { label: "Максимален бюджет", placeholder: "напр. до 1200 €" },
  purpose: { label: "Предназначение", placeholder: "напр. игри в 1440p, офис, монтаж на видео" },
  contact_time: { label: "Удобен час за обаждане", placeholder: "напр. след 17:00" },
};

// Кои допълнителни полета имат смисъл за дадена тема
const extrasByTopic: Partial<Record<InquiryTopic, Extra[]>> = {
  "nov-kompyutar": ["purpose", "budget"],
  it: ["city", "devices", "contact_time"],
  "it-pregled": ["city", "devices", "contact_time"],
  video: ["city"],
};

export function InquiryForm({
  topic: fixedTopic,
  defaultTopic,
  messageLabel = "Опишете накратко",
  submitLabel = "Изпрати запитване",
}: {
  topic?: InquiryTopic;
  defaultTopic?: InquiryTopic;
  messageLabel?: string;
  submitLabel?: string;
}) {
  const [topic, setTopic] = useState<InquiryTopic>(fixedTopic ?? defaultTopic ?? "servis");
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, null);
  const extras = extrasByTopic[topic] ?? [];

  if (state?.ok) {
    return (
      <div className="cut-frame cut-lg [--frame:var(--color-ok)]" role="status">
        <div className="cut-inner bg-surface-2 p-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-ok" strokeWidth={1.5} />
          <p className="h-display mt-5 text-[22px]">Запитването е изпратено</p>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Благодарим! Човек от екипа ще се свърже с вас в работно време. Ако е спешно — обадете се на 0898 570 500.
          </p>
        </div>
      </div>
    );
  }

  const fieldError = (name: string) =>
    state?.field === name ? (
      <p role="alert" className="mt-1.5 text-[13px] text-danger">
        {state.error}
      </p>
    ) : null;

  return (
    <form onSubmit={keepValues(action)} className="cut-frame cut-lg">
      <div className="cut-inner space-y-5 bg-surface-2 p-6 sm:p-8">
        {fixedTopic ? (
          <input type="hidden" name="topic" value={fixedTopic} />
        ) : (
          <fieldset>
            <legend className="mb-3 text-[13px] uppercase tracking-wide text-muted">С какво да помогнем?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {publicTopics.map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer p-3 ring-1 transition ${topic === t ? "bg-accent/10 ring-accent" : "bg-bg-deep ring-line hover:ring-dim"}`}
                >
                  <input
                    type="radio"
                    name="topic"
                    value={t}
                    checked={topic === t}
                    onChange={() => setTopic(t)}
                    className="sr-only"
                  />
                  <span className="block text-[15px] text-white">{inquiryTopics[t].label}</span>
                  <span className="block text-[13px] text-muted">{inquiryTopics[t].hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="inq-name" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
              Име <span className="text-accent-ink">*</span>
            </label>
            <input id="inq-name" name="name" autoComplete="name" required className="input" />
            {fieldError("name")}
          </div>
          <div>
            <label htmlFor="inq-contact" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
              Телефон или имейл <span className="text-accent-ink">*</span>
            </label>
            <input id="inq-contact" name="contact" required className="input" />
            {fieldError("contact")}
          </div>
          {extras.map((key) => (
            <div key={key}>
              <label htmlFor={`inq-${key}`} className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
                {extraLabels[key].label}
              </label>
              <input id={`inq-${key}`} name={key} placeholder={extraLabels[key].placeholder} className="input" />
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="inq-message" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
            {messageLabel} <span className="text-accent-ink">*</span>
          </label>
          <textarea id="inq-message" name="message" rows={5} maxLength={3000} required className="input !h-auto py-3" />
          {fieldError("message")}
        </div>

        <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
          <label htmlFor="inq-website">Не попълвайте</label>
          <input id="inq-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-[13px] text-muted">
          <input name="privacy" type="checkbox" required className="mt-0.5 h-4 w-4 accent-accent" />
          <span>
            Съгласен/на съм GSOL да използва данните ми, за да отговори на запитването. Вижте{" "}
            <Link href="/poveritelnost" className="text-white underline underline-offset-2">
              Политиката за поверителност
            </Link>
            .
          </span>
        </label>
        {fieldError("privacy")}

        {state?.error && !state.field && (
          <p role="alert" className="text-[14px] text-danger">
            {state.error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
          <Send className="h-4 w-4" /> {pending ? "Изпращане…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

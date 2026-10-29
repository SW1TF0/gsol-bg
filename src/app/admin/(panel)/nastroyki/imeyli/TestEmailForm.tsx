"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { keepValues } from "@/lib/forms";
import { sendTestEmail, type TestEmailState } from "../actions";

const messages = {
  sent: { text: "Изпратено — проверете пощата си", tone: "text-ok" },
  failed: { text: "Не се изпрати. Проверете ключа и подателя в Resend.", tone: "text-accent" },
  disabled: { text: "Изпращането не е настроено — вижте стъпките по-горе.", tone: "text-muted" },
};

export function TestEmailForm({ vid, enabled }: { vid: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<TestEmailState, FormData>(sendTestEmail, null);
  return (
    <form onSubmit={keepValues(action)} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="vid" value={vid} />
      <button type="submit" className="btn btn-sm btn-ghost" disabled={pending || !enabled}>
        <Send className="h-4 w-4" /> {pending ? "Изпращане…" : "Изпрати тест до мен"}
      </button>
      {state?.result && (
        <span role="status" className={`text-[13px] ${messages[state.result].tone}`}>
          {messages[state.result].text}
          {state.result === "sent" && state.to ? ` (${state.to})` : ""}
        </span>
      )}
    </form>
  );
}

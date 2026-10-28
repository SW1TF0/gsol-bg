"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { inquiryStatusLabels } from "@/lib/inquiries";
import { updateInquiry, type InquiryAdminState } from "../actions";

export function InquiryForm({ id, status, notes }: { id: number; status: string; notes: string }) {
  const [state, action, pending] = useActionState<InquiryAdminState, FormData>(updateInquiry, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="status" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
          Статус
        </label>
        <select id="status" name="status" defaultValue={status} className="input sm:max-w-xs">
          {Object.entries(inquiryStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="notes" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
          Вътрешни бележки (клиентът не ги вижда)
        </label>
        <textarea id="notes" name="notes" rows={4} defaultValue={notes} className="input !h-auto py-3" />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
          {pending ? "Записване…" : "Запиши"}
        </button>
        {state?.ok && (
          <span className="flex items-center gap-2 text-[14px] text-ok">
            <Check className="h-4 w-4" /> Записано
          </span>
        )}
        {state?.error && <span className="text-[14px] text-accent">{state.error}</span>}
      </div>
    </form>
  );
}

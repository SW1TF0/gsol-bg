"use client";

import { useActionState, useRef } from "react";
import { orderStatusLabels } from "@/lib/orders";
import { addOrderNote, updateOrderStatus, type ActionState } from "../actions";
import { keepValues } from "@/lib/forms";

const emailResults: Record<string, { text: string; tone: string }> = {
  sent: { text: "Имейлът до клиента е изпратен.", tone: "text-ok" },
  failed: { text: "Статусът е записан, но имейлът не се изпрати.", tone: "text-danger" },
  disabled: { text: "Статусът е записан. Имейлът не е изпратен — изпращането не е настроено.", tone: "text-muted" },
};

export function StatusForm({ orderId, status, emailEnabled }: { orderId: number; status: string; emailEnabled: boolean }) {
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await updateOrderStatus(prev, form);
    if (result?.ok && messageRef.current) messageRef.current.value = "";
    return result;
  }, null);
  return (
    <form onSubmit={keepValues(action)} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <label htmlFor="status" className="sr-only">
        Статус
      </label>
      <select id="status" name="status" defaultValue={status} className="input">
        {Object.entries(orderStatusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2.5 text-[14px]">
        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-accent" />
        Уведоми клиента по имейл
      </label>
      <label htmlFor="status-message" className="sr-only">
        Съобщение към клиента
      </label>
      <textarea
        ref={messageRef}
        id="status-message"
        name="message"
        rows={2}
        maxLength={1000}
        placeholder="Съобщение в имейла (по желание), напр. номер на пратката"
        className="input !h-auto py-2.5 text-[14px]"
      />
      {!emailEnabled && <p className="text-[12px] text-dim">Изпращането на имейли още не е настроено — вижте „Настройки“.</p>}
      <button type="submit" className="btn btn-sm btn-primary w-full" disabled={pending}>
        {pending ? "Записване…" : "Запиши статуса"}
      </button>
      {state?.error && <p className="text-[13px] text-danger">{state.error}</p>}
      {state?.ok && state.email && (
        <p role="status" className={`text-[13px] ${emailResults[state.email].tone}`}>
          {emailResults[state.email].text}
        </p>
      )}
    </form>
  );
}

export function NoteForm({ orderId }: { orderId: number }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await addOrderNote(prev, form);
    if (result?.ok) ref.current?.reset();
    return result;
  }, null);
  return (
    <form ref={ref} onSubmit={keepValues(action)} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="order_id" value={orderId} />
      <label htmlFor="note" className="sr-only">
        Бележка
      </label>
      <input id="note" name="note" placeholder="Бележка (напр. „Обадих се, потвърди за утре“)" className="input flex-1" />
      <button type="submit" className="btn btn-sm btn-ghost !h-[42px]" disabled={pending}>
        Добави
      </button>
      {state?.error && <p className="text-[13px] text-danger">{state.error}</p>}
    </form>
  );
}

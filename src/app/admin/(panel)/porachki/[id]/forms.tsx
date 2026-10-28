"use client";

import { useActionState, useRef } from "react";
import { orderStatusLabels } from "@/lib/orders";
import { addOrderNote, updateOrderStatus, type ActionState } from "../actions";

export function StatusForm({ orderId, status }: { orderId: number; status: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateOrderStatus, null);
  return (
    <form action={action} className="space-y-3">
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
      <button type="submit" className="btn btn-sm btn-primary w-full" disabled={pending}>
        {pending ? "Записване…" : "Запиши статуса"}
      </button>
      {state?.error && <p className="text-[13px] text-accent">{state.error}</p>}
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
    <form ref={ref} action={action} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="order_id" value={orderId} />
      <label htmlFor="note" className="sr-only">
        Бележка
      </label>
      <input id="note" name="note" placeholder="Бележка (напр. „Обадих се, потвърди за утре“)" className="input flex-1" />
      <button type="submit" className="btn btn-sm btn-ghost !h-[42px]" disabled={pending}>
        Добави
      </button>
      {state?.error && <p className="text-[13px] text-accent">{state.error}</p>}
    </form>
  );
}

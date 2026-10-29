"use client";

import { useActionState, useRef } from "react";
import { Check } from "lucide-react";
import { keepValues } from "@/lib/forms";
import { updateCustomer, type CustomerFormState } from "../actions";

export function CustomerForm({ id, note, tags }: { id: string; note: string; tags: string[] }) {
  const tagsRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<CustomerFormState, FormData>(async (prev, form) => {
    const result = await updateCustomer(prev, form);
    // Показваме етикетите така, както са записани — без повторения и празни
    if (result?.tags && tagsRef.current) tagsRef.current.value = result.tags.join(", ");
    return result;
  }, null);
  return (
    <form onSubmit={keepValues(action)} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="note" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
          Вътрешна бележка
        </label>
        <textarea
          id="note"
          name="note"
          defaultValue={note}
          rows={5}
          maxLength={4000}
          placeholder="Напр. предпочита обаждане следобед, фирмен клиент с договор…"
          className="input !h-auto py-3 text-[14px]"
        />
        <p className="mt-1.5 text-[12px] text-dim">Вижда се само от екипа.</p>
      </div>
      <div>
        <label htmlFor="tags" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
          Етикети
        </label>
        <input ref={tagsRef} id="tags" name="tags" defaultValue={tags.join(", ")} placeholder="vip, сервиз, геймър" className="input" />
        <p className="mt-1.5 text-[12px] text-dim">Разделени със запетая — по тях може да се филтрира списъкът.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
          {pending ? "Записване…" : "Запиши"}
        </button>
        {state?.ok && (
          <span className="flex items-center gap-2 text-[14px] text-ok">
            <Check className="h-4 w-4" /> Записано
          </span>
        )}
        {state?.error && (
          <span role="alert" className="text-[14px] text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

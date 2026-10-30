"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { keepValues } from "@/lib/forms";
import { newQuote, type NewQuoteState } from "./actions";

/** „Нова оферта за продукт“ — адрес, SKU, ID или част от името; празно — празна оферта */
export function NewQuoteForm() {
  const [state, action, pending] = useActionState<NewQuoteState, FormData>(newQuote, null);
  return (
    <form method="post" onSubmit={keepValues(action)} className="mb-6 bg-surface-2 p-5 ring-1 ring-line-soft">
      <label htmlFor="new-quote" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
        Нова оферта за продукт
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="new-quote"
          name="q"
          placeholder="Адрес на продукта, SKU, ID или част от името (празно — празна оферта)"
          className="input flex-1"
          aria-invalid={Boolean(state?.error) || undefined}
        />
        <button type="submit" className="btn btn-sm btn-primary !h-[42px]" disabled={pending}>
          <Plus className="h-4 w-4" /> {pending ? "Създаване…" : "Създай и запиши оферта"}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

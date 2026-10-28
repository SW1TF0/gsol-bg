"use client";

import { useActionState, useRef } from "react";
import { Dices, Plus } from "lucide-react";
import { addPrize, drawRaffle, type RaffleFormState } from "../actions";

export function PrizeForm({ raffleId }: { raffleId: number }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<RaffleFormState, FormData>(async (prev, form) => {
    const result = await addPrize(prev, form);
    if (result?.ok) ref.current?.reset();
    return result;
  }, null);
  return (
    <form ref={ref} action={action} className="mt-5 space-y-3 border-t border-line pt-5">
      <input type="hidden" name="raffle_id" value={raffleId} />
      <div className="grid grid-cols-[1fr_80px] gap-2">
        <label className="sr-only" htmlFor="prize-title">
          Награда
        </label>
        <input id="prize-title" name="title" placeholder="Награда, напр. Гейминг мишка" className="input" />
        <label className="sr-only" htmlFor="prize-qty">
          Брой
        </label>
        <input id="prize-qty" name="quantity" type="number" min={1} max={100} defaultValue={1} className="input" />
      </div>
      <label className="sr-only" htmlFor="prize-desc">
        Описание
      </label>
      <input id="prize-desc" name="description" placeholder="Описание (по желание)" className="input" />
      <label className="sr-only" htmlFor="prize-img">
        Снимка
      </label>
      <input id="prize-img" name="image_url" type="url" placeholder="Адрес на снимка (по желание)" className="input" />
      <button type="submit" className="btn btn-sm btn-ghost w-full" disabled={pending}>
        <Plus className="h-4 w-4" /> Добави награда
      </button>
      {state?.error && <p className="text-[13px] text-accent">{state.error}</p>}
    </form>
  );
}

export function DrawForm({ raffleId, canDraw }: { raffleId: number; canDraw: boolean }) {
  const [state, action, pending] = useActionState<RaffleFormState, FormData>(drawRaffle, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={raffleId} />
      <label className="flex items-center gap-2.5 text-[14px]">
        <input type="checkbox" name="confirm" disabled={!canDraw} className="h-4 w-4 accent-accent" />
        Потвърждавам — тегленето е окончателно
      </label>
      <button type="submit" className="btn btn-primary" disabled={!canDraw || pending}>
        <Dices className="h-4 w-4" /> {pending ? "Теглене…" : "Изтегли победителите"}
      </button>
      {state?.error && (
        <p role="alert" className="text-[14px] text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}

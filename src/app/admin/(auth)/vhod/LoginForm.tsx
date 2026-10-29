"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/admin/actions";
import { keepValues } from "@/lib/forms";

export function LoginForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(signIn, null);
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(signUp, null);
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;

  return (
    <div className="cut-frame cut-lg">
      <div className="cut-inner bg-surface-2 p-8">
        <div role="tablist" className="mb-6 grid grid-cols-2 gap-2">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`h-10 font-display text-[13px] uppercase tracking-wide ${
                mode === m ? "bg-accent text-white" : "bg-surface text-muted hover:text-white"
              }`}
            >
              {m === "in" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>

        <form onSubmit={keepValues(mode === "in" ? inAction : upAction)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
              Имейл
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
              Парола
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              minLength={mode === "up" ? 10 : undefined}
              required
              className="input"
            />
            {mode === "up" && <p className="mt-1.5 text-[12px] text-dim">Поне 10 символа.</p>}
          </div>

          {state?.error && (
            <p role="alert" className="text-[14px] text-accent">
              {state.error}
            </p>
          )}
          {state?.message && <p className="bg-ok/10 p-3 text-[14px] text-ok ring-1 ring-ok/30">{state.message}</p>}

          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Моля, изчакайте…" : mode === "in" ? "Влез" : "Създай профил"}
          </button>
        </form>
      </div>
    </div>
  );
}

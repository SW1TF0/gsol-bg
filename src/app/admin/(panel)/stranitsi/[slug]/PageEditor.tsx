"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { updatePage, type PageFormState } from "../actions";
import { keepValues } from "@/lib/forms";

type Props = { page: { slug: string; title: string; intro: string; body: string; is_published: boolean } };

export function PageEditor({ page }: Props) {
  const [state, action, pending] = useActionState<PageFormState, FormData>(updatePage, null);

  return (
    <form onSubmit={keepValues(action)} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <input type="hidden" name="slug" value={page.slug} />
      <div className="space-y-6">
        <Panel>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
                Заглавие
              </label>
              <input id="title" name="title" defaultValue={page.title} required className="input" />
            </div>
            <div>
              <label htmlFor="intro" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
                Кратко въведение (под заглавието)
              </label>
              <textarea id="intro" name="intro" defaultValue={page.intro} rows={2} maxLength={400} className="input !h-auto py-3" />
            </div>
            <div>
              <label htmlFor="body" className="mb-2 block text-[12px] uppercase tracking-wide text-muted">
                Текст
              </label>
              <textarea
                id="body"
                name="body"
                defaultValue={page.body}
                rows={28}
                spellCheck
                className="input !h-auto py-3 font-mono text-[14px] leading-relaxed"
              />
            </div>
          </div>
        </Panel>
        <div className="flex items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Записване…" : "Запиши и публикувай"}
          </button>
          {state?.ok && (
            <span className="flex items-center gap-2 text-[14px] text-ok">
              <Check className="h-4 w-4" /> Записано — сайтът е обновен
            </span>
          )}
          {state?.error && (
            <span role="alert" className="text-[14px] text-danger">
              {state.error}
            </span>
          )}
        </div>
      </div>

      <aside className="space-y-6">
        <Panel title="Видимост">
          <label className="flex items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="is_published" defaultChecked={page.is_published} className="h-4 w-4 accent-accent" />
            Публикувана в сайта
          </label>
        </Panel>
        <Panel title="Как се форматира">
          <ul className="space-y-2.5 text-[13px] text-muted">
            <li>
              <code className="text-white">## Заглавие</code> — подзаглавие на секция
            </li>
            <li>
              <code className="text-white">**удебелен**</code> — удебелен текст
            </li>
            <li>
              <code className="text-white">- точка</code> — списък
            </li>
            <li>
              <code className="text-white">1. стъпка</code> — номериран списък
            </li>
            <li>
              <code className="text-white">[текст](/kontakti)</code> — линк
            </li>
            <li>Празен ред — нов абзац</li>
          </ul>
        </Panel>
      </aside>
    </form>
  );
}

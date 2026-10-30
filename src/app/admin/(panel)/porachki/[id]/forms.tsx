"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, FilePlus2, Loader2, Printer, RefreshCw, Truck, Undo2, XCircle } from "lucide-react";
import { orderStatusLabels } from "@/lib/orders";
import { addOrderNote, issueCreditNote, issueDocument, shipmentAction, updateOrderStatus, type ActionState } from "../actions";
import { invoiceKindLabels, type InvoiceKind } from "@/lib/invoices";
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
    <form method="post" onSubmit={keepValues(action)} className="space-y-3">
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
    <form ref={ref} method="post" onSubmit={keepValues(action)} className="flex flex-col gap-2 sm:flex-row">
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

/** Бутоните за товарителницата — какво се показва зависи от състоянието на последната пратка */
export function ShipmentButtons({ orderId, state, delivered }: { orderId: number; state: string | null; delivered: boolean }) {
  const [pending, start] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = (op: "create" | "refresh" | "cancel") => {
    if (op === "cancel" && !confirm("Да се анулира ли товарителницата в Еконт?")) return;
    setRunning(op);
    setError(null);
    start(async () => {
      const result = await shipmentAction(op, orderId);
      if (result?.error) setError(result.error);
      setRunning(null);
    });
  };
  const canCreate = state === null || state === "failed" || state === "cancelled";
  const live = state === "created" && !delivered;
  const icon = (op: string, Icon: typeof Truck) =>
    pending && running === op ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />;
  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        {canCreate && (
          <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => run("create")}>
            {icon("create", Truck)} {state === "failed" ? "Опитай отново" : "Създай товарителница"}
          </button>
        )}
        {(live || state === "queued" || state === "sending") && (
          <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => run("refresh")}>
            {icon("refresh", RefreshCw)} Обнови статуса
          </button>
        )}
        {live && (
          <button type="button" className="btn btn-sm btn-ghost" disabled={pending} onClick={() => run("cancel")}>
            {icon("cancel", XCircle)} Анулирай
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Doc = { id: number; kind: InvoiceKind; number: string; cancelled: boolean; issue_date: string };

/** Фактура и проформа от поръчката: чернова за преглед, издаване, печат, кредитно известие */
export function InvoiceBox({ orderId, docs, canCredit }: { orderId: number; docs: Doc[]; canCredit: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const live = (kind: "invoice" | "proforma") => docs.find((d) => d.kind === kind && !d.cancelled);

  const issue = (kind: "invoice" | "proforma") => {
    const label = kind === "invoice" ? "фактура" : "проформа";
    if (!confirm(`Да се издаде ли ${label}? Номерът се дава сега и не може да се промени.`)) return;
    setError(null);
    start(async () => {
      const res = await issueDocument(orderId, kind);
      if ("error" in res) setError(res.error);
      else window.open(`/admin/dokument/faktura/${res.id}`, "_blank");
    });
  };
  const credit = (doc: Doc) => {
    const reason = prompt(`Основание за кредитно известие към фактура ${doc.number} (напр. „Грешни данни на получателя“):`);
    if (!reason) return;
    setError(null);
    start(async () => {
      const res = await issueCreditNote(doc.id, reason);
      if ("error" in res) setError(res.error);
      else window.open(`/admin/dokument/faktura/${res.id}`, "_blank");
    });
  };

  return (
    <div className="space-y-4">
      {docs.length > 0 && (
        <ul className="space-y-2 text-[14px]">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className={d.cancelled ? "text-dim line-through" : "text-white"}>
                {invoiceKindLabels[d.kind]} № {d.number}
              </span>
              <span className="flex gap-3">
                <Link href={`/admin/dokument/faktura/${d.id}`} target="_blank" className="flex items-center gap-1 text-[13px] text-accent-ink hover:underline">
                  <Printer className="h-3.5 w-3.5" /> Отпечатай
                </Link>
                {canCredit && d.kind === "invoice" && !d.cancelled && (
                  <button type="button" disabled={pending} onClick={() => credit(d)} className="flex items-center gap-1 text-[13px] text-muted hover:text-danger">
                    <Undo2 className="h-3.5 w-3.5" /> Кредитно известие
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        {(["invoice", "proforma"] as const).map((kind) =>
          live(kind) ? null : (
            <div key={kind} className="space-y-1.5">
              <button type="button" disabled={pending} onClick={() => issue(kind)} className="btn btn-sm btn-ghost w-full">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                {kind === "invoice" ? "Издай фактура" : "Издай проформа"}
              </button>
              <Link
                href={`/admin/dokument/chernova/${orderId}?vid=${kind}`}
                target="_blank"
                className="flex items-center justify-center gap-1 text-[12px] text-muted hover:text-white"
              >
                <Eye className="h-3.5 w-3.5" /> Преглед преди издаване
              </Link>
            </div>
          ),
        )}
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// Фактури, проформи и кредитни известия: съдържанието идва от базата (private.invoice_data) като
// снимка в момента на издаване — по-късна промяна на поръчката или на фирмените данни не я пипа.

export type InvoiceKind = "invoice" | "proforma" | "credit";

export const invoiceKindLabels: Record<InvoiceKind, string> = {
  invoice: "Фактура",
  proforma: "Проформа фактура",
  credit: "Кредитно известие",
};

export type InvoiceData = {
  order_number: string;
  supplier: { name: string; eik: string; vat: string; mol: string; address: string; phone: string; email: string };
  recipient:
    | { type: "company"; name: string; eik: string; vat: string; mol: string; address: string }
    | { type: "person"; name: string; egn: string; address: string };
  lines: { name: string; unit: string; qty: number; value_cents: number; total_cents: number }[];
  base_cents: number;
  vat_rate: number;
  vat_cents: number;
  total_cents: number;
  payment: string;
  bank: { name: string; iban: string; bic: string };
  place: string;
  composed_by: string;
  /** Само при кредитно известие */
  credit_of?: { number: string; issue_date: string };
  reason?: string;
};

export type InvoiceSettings = { mode: "manual" | "on_delivered"; composedBy: string; place: string; mol: string };

export function parseInvoiceSettings(value: unknown): InvoiceSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    mode: v.mode === "on_delivered" ? "on_delivered" : "manual",
    composedBy: typeof v.composed_by === "string" ? v.composed_by : "",
    place: typeof v.place === "string" && v.place ? v.place : "Кърджали",
    mol: typeof v.mol === "string" ? v.mol : "",
  };
}

/** Единична цена без ДДС: два знака, а ако делението не е точно — до четири (сборът е по стойностите) */
export function unitPrice(valueCents: number, qty: number) {
  const unit = valueCents / qty / 100;
  const digits = Number.isInteger((valueCents / qty) * 1) ? 2 : 4;
  return unit.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

/** Сума с два знака, без символа на валутата (в таблицата валутата е в заглавието) */
export function amount(cents: number) {
  return (cents / 100).toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

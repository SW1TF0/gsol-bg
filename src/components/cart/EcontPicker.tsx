"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { searchCities, searchNames, searchOffices, type EcontCity, type EcontOffice } from "@/lib/econt-shared";

export type Option = { key: string; label: string; sub?: string };

type PickerProps = {
  id: string;
  label: string;
  placeholder: string;
  selected: Option | null;
  search: (query: string) => Option[];
  onSelect: (key: string) => void;
  error?: string;
  disabled?: boolean;
  /** Текстът, когато няма съвпадения (може да зависи от търсеното) */
  empty: string | ((query: string) => string);
  /** По подразбиране задължително (звездичка); незадължителното може да се изчисти */
  required?: boolean;
  onClear?: () => void;
};

/** Падащ списък с търсене: пише се, избира се със стрелки и Enter или с мишката. Свободен текст не се приема. */
export function Picker({
  id,
  label,
  placeholder,
  selected,
  search,
  onSelect,
  error,
  disabled,
  empty,
  required = true,
  onClear,
}: PickerProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const options = useMemo(() => (open ? search(query) : []), [open, query, search]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(o: Option) {
    onSelect(o.key);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.max(0, Math.min(options.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter") {
      // Enter избира, а не изпраща поръчката
      if (open && options[active]) {
        e.preventDefault();
        choose(options[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={box} className="relative">
      <label htmlFor={id} className="mb-2 block text-[13px] uppercase tracking-wide text-muted">
        {label}
        {required && <span className="text-accent-ink"> *</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={selected && open ? selected.label : placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-controls={listId}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `e-${id}` : undefined}
          className={`input pr-10 ${error ? "!border-danger" : ""}`}
        />
        {selected && onClear && !open ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Изчисти: ${label}`}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-dim hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        )}
      </div>
      {selected?.sub && !open && <p className="mt-1.5 text-[12px] text-dim">{selected.sub}</p>}
      {error && (
        <p id={`e-${id}`} role="alert" className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      )}

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto bg-surface-2 shadow-2xl ring-1 ring-line"
        >
          {options.length ? (
            options.map((o, i) => (
              <li
                key={o.key}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected?.key === o.key}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-start gap-2 px-3 py-2.5 ${i === active ? "bg-surface" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] text-white">{o.label}</span>
                  {o.sub && <span className="block text-[12px] text-dim">{o.sub}</span>}
                </span>
                {selected?.key === o.key && <Check className="mt-0.5 h-4 w-4 flex-none text-accent-ink" />}
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-[13px] text-muted">{typeof empty === "function" ? empty(query) : empty}</li>
          )}
        </ul>
      )}
    </div>
  );
}

function cityOption(c: EcontCity): Option {
  return {
    key: String(c.id),
    label: c.name,
    sub: [c.region && c.region !== c.name ? `обл. ${c.region}` : null, c.postCode].filter(Boolean).join(" · "),
  };
}

/** Населено място от списъка на Еконт. За „До офис“ — само места с офис. */
export function CityPicker({
  cities,
  value,
  onChange,
  withOfficesOnly,
  error,
}: {
  cities: EcontCity[];
  value: number | null;
  onChange: (id: number) => void;
  withOfficesOnly: boolean;
  error?: string;
}) {
  const pool = useMemo(() => (withOfficesOnly ? cities.filter((c) => c.offices > 0) : cities), [cities, withOfficesOnly]);
  const selected = cities.find((c) => c.id === value);
  const search = useMemo(() => (q: string) => searchCities(pool, q).map(cityOption), [pool]);
  return (
    <Picker
      id="f-shipping_city"
      label="Населено място"
      placeholder="Започнете да пишете, напр. Кърджали"
      selected={selected ? cityOption(selected) : null}
      search={search}
      onSelect={(key) => onChange(Number(key))}
      error={error}
      empty={withOfficesOnly ? "Няма офис на Еконт в такова място — изберете „До адрес“." : "Няма такова място в списъка на Еконт."}
    />
  );
}

/** Офис на Еконт в избраното място */
export function OfficePicker({
  offices,
  cityId,
  value,
  onChange,
  error,
}: {
  offices: EcontOffice[];
  cityId: number | null;
  value: string | null;
  onChange: (code: string) => void;
  error?: string;
}) {
  const selected = offices.find((o) => o.code === value);
  const search = useMemo(
    () => (q: string) => searchOffices(offices, cityId, q).map((o) => ({ key: o.code, label: o.name, sub: o.address })),
    [offices, cityId],
  );
  return (
    <Picker
      id="f-econt_office"
      label="Офис на Еконт"
      placeholder={cityId ? "Изберете офис" : "Първо изберете населено място"}
      selected={selected ? { key: selected.code, label: selected.name, sub: selected.address } : null}
      search={search}
      onSelect={onChange}
      disabled={!cityId}
      error={error}
      empty="Няма офис с такова име тук."
    />
  );
}

/** Улица или квартал от списъка на Еконт за избраното място (незадължително — едното от двете) */
export function NamePicker({
  id,
  label,
  placeholder,
  names,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  names: string[];
  value: string | null;
  onChange: (name: string | null) => void;
  error?: string;
}) {
  // Улиците са хиляди — без търсене списъкът е безполезен, затова показваме съвпадения едва след първата буква
  const search = useMemo(
    () => (q: string) => (q.trim() || names.length <= 30 ? searchNames(names, q).map((n) => ({ key: n, label: n })) : []),
    [names],
  );
  return (
    <Picker
      id={id}
      label={label}
      placeholder={placeholder}
      selected={value ? { key: value, label: value } : null}
      search={search}
      onSelect={onChange}
      onClear={() => onChange(null)}
      required={false}
      error={error}
      empty={(q) => (q.trim() ? "Няма такова име в списъка на Еконт." : "Започнете да пишете името.")}
    />
  );
}

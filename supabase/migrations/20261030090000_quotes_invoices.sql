-- Ценови оферти (OF-…) и фактури / проформи / кредитни известия — по документа на клиента.
--
-- Оферти: снимка на продуктите в момента на създаване (цена, спецификация, при машина — частите и
-- доставната им цена); всяко записване е нова версия (пазят се последните 20); запис върху по-нова
-- версия от друг прозорец се отказва. Доставна цена, доставчик, печалба и марж са само за служителите.
--
-- Фактури: номерът се дава само при „Издай“ — десет цифри, само нарастващ, без празнини (чл. 114 ЗДДС).
-- Фактури и кредитни известия — серия 09…, проформи — отделен блок 095…. Броячът е ред в таблица,
-- който се заключва в същата транзакция: два документа в една секунда не могат да вземат един номер,
-- а отказана транзакция не оставя дупка. Грешна фактура се поправя с кредитно известие.

-- ---------------------------------------------------------------- оферти
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'declined', 'expired');

create sequence private.quote_number_seq;

create table public.quotes (
  id bigint generated always as identity primary key,
  number text not null unique,
  status public.quote_status not null default 'draft',
  client_name text not null default 'Краен клиент',
  client_company text not null default '',
  client_eik text not null default '',
  client_email text not null default '',
  client_phone text not null default '',
  valid_until date not null default ((now() at time zone 'Europe/Sofia')::date + 7),
  note text not null default '',
  lines jsonb not null default '[]',
  version int not null default 1,
  source text not null default 'admin' check (source in ('admin', 'product', 'cart')),
  source_url text,
  created_by uuid references auth.users on delete set null,
  updated_by uuid references auth.users on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_updated on public.quotes (updated_at desc) where deleted_at is null;

create table public.quote_versions (
  quote_id bigint not null references public.quotes on delete cascade,
  version int not null,
  data jsonb not null,
  saved_by uuid references auth.users on delete set null,
  saved_at timestamptz not null default now(),
  primary key (quote_id, version)
);

alter table public.quotes enable row level security;
alter table public.quote_versions enable row level security;
create policy "Продажбите виждат офертите" on public.quotes
  for select to authenticated
  using ((select private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[])));
create policy "Продажбите виждат версиите на офертите" on public.quote_versions
  for select to authenticated
  using ((select private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[])));

-- Редовете идват от редактора — чистим ги: имена, цели количества и суми в центове, кратки текстове
create function private.clean_quote_lines(p_lines jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_out jsonb := '[]'::jsonb;
  l jsonb;
  v_name text;
  v_qty int;
  v_cents text;
begin
  if jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'INVALID_LINES'; end if;
  if jsonb_array_length(p_lines) > 200 then raise exception 'TOO_MANY_LINES'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    v_name := left(trim(coalesce(l ->> 'name', '')), 300);
    if v_name = '' then raise exception 'INVALID_LINE_NAME'; end if;
    if coalesce(l ->> 'qty', '') !~ '^[0-9]{1,4}$' or (l ->> 'qty')::int < 1 then raise exception 'INVALID_LINE_QTY'; end if;
    v_qty := (l ->> 'qty')::int;
    foreach v_cents in array array[l ->> 'price_cents', l ->> 'cost_cents'] loop
      if v_cents is not null and v_cents !~ '^[0-9]{1,9}$' then raise exception 'INVALID_LINE_PRICE'; end if;
    end loop;
    v_out := v_out || jsonb_build_object(
      'id', left(coalesce(l ->> 'id', gen_random_uuid()::text), 40),
      'name', v_name,
      'qty', v_qty,
      'price_cents', (l ->> 'price_cents')::int,
      'cost_cents', (l ->> 'cost_cents')::int,
      'supplier', left(trim(coalesce(l ->> 'supplier', '')), 120),
      'supplier_code', left(trim(coalesce(l ->> 'supplier_code', '')), 120),
      'specs', coalesce((
        select jsonb_agg(left(trim(s), 200))
        from (select s from jsonb_array_elements_text(
          case when jsonb_typeof(l -> 'specs') = 'array' then l -> 'specs' else '[]'::jsonb end) s limit 10) x
        where trim(s) <> ''
      ), '[]'::jsonb),
      'product_id', case when coalesce(l ->> 'product_id', '') ~ '^[0-9]{1,18}$' then (l ->> 'product_id')::bigint end,
      'slug', nullif(left(coalesce(l ->> 'slug', ''), 300), '')
    );
  end loop;
  return v_out;
end;
$$;

-- Снимка на продуктите: име, цена, до 4 реда спецификация; при машина — до 10 части и доставната им цена
create function private.quote_lines_from_products(p_items jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', p.name,
    'qty', least(greatest(coalesce(it.qty, 1), 1), 9999),
    'price_cents', p.price_cents,
    'cost_cents', m.cost_cents,
    'supplier', case when m.cost_cents is not null then 'Части за GSOL машина' else '' end,
    'supplier_code', coalesce(p.sku, ''),
    'specs', coalesce(m.parts, (
      select jsonb_agg(s.k || ': ' || s.v) from (
        select e ->> 'k' as k, e ->> 'v' as v
        from jsonb_array_elements(case when jsonb_typeof(p.specs) = 'array' then p.specs else '[]'::jsonb end) e
        where coalesce(e ->> 'k', '') <> '' and coalesce(e ->> 'v', '') <> ''
        limit 4
      ) s
    ), '[]'::jsonb),
    'product_id', p.id,
    'slug', p.slug
  ) order by it.ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as x(item, ord)
  cross join lateral (select (x.item ->> 'product_id')::bigint as product_id, (x.item ->> 'qty')::int as qty, x.ord) it
  join public.products p on p.id = it.product_id
  left join lateral (
    select sum(c.cost_cents)::int as cost_cents,
           jsonb_agg(
             (case mp.kind when 'cpu' then 'Процесор' when 'motherboard' then 'Дънна платка' when 'ram' then 'RAM памет'
               when 'gpu' then 'Видеокарта' when 'storage' then 'Диск' when 'psu' then 'Захранване'
               when 'case' then 'Кутия' else 'Охлаждане' end) || ': ' || c.name
             order by mp.kind) as parts
    from public.machine_parts mp
    join public.components c on c.id = mp.component_id
    where mp.product_id = p.id
    having count(*) > 0
  ) m on true;
$$;

revoke execute on function private.quote_lines_from_products(jsonb) from public, anon, authenticated;

create function private.quote_snapshot(q public.quotes)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'status', q.status, 'client_name', q.client_name, 'client_company', q.client_company,
    'client_eik', q.client_eik, 'client_email', q.client_email, 'client_phone', q.client_phone,
    'valid_until', q.valid_until, 'note', q.note, 'lines', q.lines
  );
$$;

create function public.create_quote(p_items jsonb default '[]', p_source text default 'admin', p_source_url text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes;
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 50 then raise exception 'INVALID_ITEMS'; end if;

  insert into public.quotes (number, lines, source, source_url, created_by, updated_by)
  values (
    'OF-' || to_char(now() at time zone 'Europe/Sofia', 'YYYYMMDD') || '-' || lpad(nextval('private.quote_number_seq')::text, 6, '0'),
    private.quote_lines_from_products(p_items),
    case when p_source in ('product', 'cart') then p_source else 'admin' end,
    left(nullif(trim(coalesce(p_source_url, '')), ''), 500),
    auth.uid(), auth.uid()
  ) returning * into v_quote;

  insert into public.quote_versions (quote_id, version, data, saved_by)
  values (v_quote.id, 1, private.quote_snapshot(v_quote), auth.uid());

  return jsonb_build_object('id', v_quote.id, 'number', v_quote.number);
end;
$$;

-- Записване: само върху версията, която редакторът е отворил; всяко записване е нова версия
create function public.save_quote(p_id bigint, p_version int, p_data jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_status public.quote_status;
  v_until date;
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  select * into v_quote from public.quotes where id = p_id and deleted_at is null for update;
  if v_quote.id is null then raise exception 'QUOTE_NOT_FOUND'; end if;
  if v_quote.version <> p_version then raise exception 'QUOTE_CONFLICT'; end if;

  begin
    v_status := coalesce(p_data ->> 'status', 'draft')::public.quote_status;
    v_until := (p_data ->> 'valid_until')::date;
  exception when others then
    raise exception 'INVALID_QUOTE';
  end;
  if v_until is null then raise exception 'INVALID_QUOTE'; end if;

  update public.quotes set
    status = v_status,
    client_name = coalesce(nullif(left(trim(coalesce(p_data ->> 'client_name', '')), 200), ''), 'Краен клиент'),
    client_company = left(trim(coalesce(p_data ->> 'client_company', '')), 200),
    client_eik = left(regexp_replace(coalesce(p_data ->> 'client_eik', ''), '\s', '', 'g'), 20),
    client_email = left(trim(coalesce(p_data ->> 'client_email', '')), 200),
    client_phone = left(trim(coalesce(p_data ->> 'client_phone', '')), 40),
    valid_until = v_until,
    note = left(trim(coalesce(p_data ->> 'note', '')), 4000),
    lines = private.clean_quote_lines(coalesce(p_data -> 'lines', '[]'::jsonb)),
    version = version + 1,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id
  returning * into v_quote;

  insert into public.quote_versions (quote_id, version, data, saved_by)
  values (v_quote.id, v_quote.version, private.quote_snapshot(v_quote), auth.uid());
  delete from public.quote_versions where quote_id = p_id and version <= v_quote.version - 20;
  return v_quote.version;
end;
$$;

-- Възстановяване: стара версия става нова текуща версия (нищо не се трие)
create function public.restore_quote(p_id bigint, p_from_version int, p_version int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  select data into v_data from public.quote_versions where quote_id = p_id and version = p_from_version;
  if v_data is null then raise exception 'VERSION_NOT_FOUND'; end if;
  return public.save_quote(p_id, p_version, v_data);
end;
$$;

-- „Изтрий“ — в кошчето (офертата остава в базата, но излиза от списъка)
create function public.delete_quote(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  update public.quotes set deleted_at = now(), updated_by = auth.uid() where id = p_id and deleted_at is null;
end;
$$;

revoke execute on function public.create_quote(jsonb, text, text), public.save_quote(bigint, int, jsonb),
  public.restore_quote(bigint, int, int), public.delete_quote(bigint) from public, anon;
grant execute on function public.create_quote(jsonb, text, text), public.save_quote(bigint, int, jsonb),
  public.restore_quote(bigint, int, int), public.delete_quote(bigint) to authenticated;

-- ---------------------------------------------------------------- фактури
create table public.invoices (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('invoice', 'proforma', 'credit')),
  number text not null unique check (number ~ '^[0-9]{10}$'),
  order_id bigint not null references public.orders on delete restrict,
  credit_of bigint references public.invoices,
  cancelled boolean not null default false,
  issue_date date not null,
  tax_date date not null,
  data jsonb not null,
  total_cents int not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
-- Една жива фактура и една проформа на поръчка (кредитираната вече не се брои)
create unique index invoices_one_per_order on public.invoices (order_id, kind) where kind <> 'credit' and not cancelled;
create index invoices_order on public.invoices (order_id);

alter table public.invoices enable row level security;
create policy "Продажбите виждат фактурите" on public.invoices
  for select to authenticated
  using ((select private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[])));

-- Броячите: следващият номер за всяка серия. Фактурите и кредитните известия делят серията 09…
create table private.invoice_counters (
  series text primary key check (series in ('invoice', 'proforma')),
  next_number bigint not null,
  min_number bigint not null,
  max_number bigint not null,
  check (next_number between min_number and max_number + 1)
);
insert into private.invoice_counters (series, next_number, min_number, max_number) values
  ('invoice', 900000001, 900000001, 949999999),
  ('proforma', 950000001, 950000001, 999999999);

insert into public.settings (key, value) values
  ('invoices', '{"mode": "manual", "composed_by": "", "place": "Кърджали", "mol": ""}')
on conflict (key) do nothing;

alter table public.settings add constraint settings_invoices_valid check (
  key <> 'invoices' or (
    value ->> 'mode' in ('manual', 'on_delivered')
    and jsonb_typeof(value -> 'composed_by') = 'string'
    and jsonb_typeof(value -> 'place') = 'string'
    and jsonb_typeof(value -> 'mol') = 'string'
  )
);

-- Съдържанието на документа от поръчката: доставчик, получател, редове, суми (стойностите без ДДС
-- се изравняват така, че сборът им да е точно данъчната основа)
create function private.invoice_data(p_order_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_company jsonb := (select value from public.settings where key = 'company');
  v_bank jsonb := (select value from public.settings where key = 'bank');
  v_cfg jsonb := (select value from public.settings where key = 'invoices');
  v_inv jsonb;
  v_recipient jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_total int;
  v_base int;
  v_sum int := 0;
  v_big int := -1;
  v_big_idx int := 0;
  v_value int;
  i int := 0;
  r record;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  v_inv := v_order.invoice;

  v_recipient := case
    when v_inv is not null and coalesce(v_inv ->> 'type', 'company') = 'company' then jsonb_build_object(
      'type', 'company', 'name', v_inv ->> 'company', 'eik', v_inv ->> 'eik', 'vat', coalesce(v_inv ->> 'vat', ''),
      'mol', v_inv ->> 'mol', 'address', v_inv ->> 'address')
    when v_inv is not null then jsonb_build_object(
      'type', 'person', 'name', v_inv ->> 'name', 'egn', coalesce(v_inv ->> 'egn', ''), 'address', v_inv ->> 'address')
    else jsonb_build_object(
      'type', 'person', 'name', v_order.first_name || ' ' || v_order.last_name, 'egn', '',
      'address', concat_ws(', ', v_order.shipping_city, coalesce(v_order.shipping_address, v_order.econt_office)))
  end;

  v_total := v_order.total_cents;
  v_base := round(v_total / 1.2)::int;

  for r in
    select oi.name, oi.qty, oi.line_total_cents as total from public.order_items oi where oi.order_id = v_order.id
    union all
    select 'Доставка с Еконт', 1, v_order.shipping_cents where v_order.shipping_cents > 0
  loop
    v_value := round(r.total / 1.2)::int;
    v_sum := v_sum + v_value;
    if r.total > v_big then v_big := r.total; v_big_idx := i; end if;
    v_lines := v_lines || jsonb_build_object('name', r.name, 'unit', 'бр.', 'qty', r.qty,
      'value_cents', v_value, 'total_cents', r.total);
    i := i + 1;
  end loop;
  -- Стотинките от закръглянето отиват в най-големия ред
  if jsonb_array_length(v_lines) > 0 and v_sum <> v_base then
    v_lines := jsonb_set(v_lines, array[v_big_idx::text, 'value_cents'],
      to_jsonb((v_lines -> v_big_idx ->> 'value_cents')::int + v_base - v_sum));
  end if;

  return jsonb_build_object(
    'order_number', v_order.number,
    'supplier', jsonb_build_object(
      'name', v_company ->> 'legal_name', 'eik', v_company ->> 'eik', 'vat', v_company ->> 'vat',
      'mol', coalesce(v_cfg ->> 'mol', ''), 'address', v_company ->> 'address',
      'phone', v_company ->> 'phone', 'email', v_company ->> 'email'),
    'recipient', v_recipient,
    'lines', v_lines,
    'base_cents', v_base,
    'vat_rate', 20,
    'vat_cents', v_total - v_base,
    'total_cents', v_total,
    'payment', case v_order.payment_method when 'cod' then 'Наложен платеж' else 'Банков превод' end,
    'bank', jsonb_build_object('name', coalesce(v_bank ->> 'bank_name', ''), 'iban', coalesce(v_bank ->> 'iban', ''),
      'bic', coalesce(v_bank ->> 'bic', '')),
    'place', coalesce(nullif(v_cfg ->> 'place', ''), 'Кърджали'),
    'composed_by', coalesce(v_cfg ->> 'composed_by', '')
  );
end;
$$;

revoke execute on function private.invoice_data(bigint) from public, anon, authenticated;

create function private.next_invoice_number(p_series text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number bigint;
begin
  update private.invoice_counters set next_number = next_number + 1
  where series = p_series and next_number <= max_number
  returning next_number - 1 into v_number;
  if v_number is null then raise exception 'INVOICE_SERIES_FULL'; end if;
  return lpad(v_number::text, 10, '0');
end;
$$;

revoke execute on function private.next_invoice_number(text) from public, anon, authenticated;

create function private.issue_invoice(p_order_id bigint, p_kind text, p_by uuid)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invoices;
  v_data jsonb;
  v_today date := (now() at time zone 'Europe/Sofia')::date;
begin
  if p_kind not in ('invoice', 'proforma') then raise exception 'INVALID_KIND'; end if;
  -- Втори натиск връща същия документ
  perform pg_advisory_xact_lock(hashtext('invoice:' || p_order_id || ':' || p_kind));
  select * into v_inv from public.invoices where order_id = p_order_id and kind = p_kind and not cancelled;
  if v_inv.id is not null then return v_inv; end if;

  v_data := private.invoice_data(p_order_id);
  insert into public.invoices (kind, number, order_id, issue_date, tax_date, data, total_cents, created_by)
  values (p_kind, private.next_invoice_number(p_kind), p_order_id, v_today, v_today, v_data,
          (v_data ->> 'total_cents')::int, p_by)
  returning * into v_inv;

  insert into public.order_events (order_id, actor, type, data)
  values (p_order_id, p_by, 'invoice_issued', jsonb_build_object('kind', p_kind, 'number', v_inv.number));
  return v_inv;
end;
$$;

revoke execute on function private.issue_invoice(bigint, text, uuid) from public, anon, authenticated;

create function public.issue_invoice(p_order_id bigint, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invoices;
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  v_inv := private.issue_invoice(p_order_id, p_kind, auth.uid());
  return jsonb_build_object('id', v_inv.id, 'number', v_inv.number);
end;
$$;

-- Кредитно известие към фактура: същите редове с обратен знак; фактурата се отбелязва като кредитирана
create function public.issue_credit_note(p_invoice_id bigint, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_orig public.invoices;
  v_credit public.invoices;
  v_data jsonb;
  v_today date := (now() at time zone 'Europe/Sofia')::date;
begin
  if not private.is_staff(array['admin', 'manager']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_orig from public.invoices where id = p_invoice_id for update;
  if v_orig.id is null or v_orig.kind <> 'invoice' then raise exception 'INVOICE_NOT_FOUND'; end if;
  if v_orig.cancelled then raise exception 'ALREADY_CREDITED'; end if;

  v_data := v_orig.data || jsonb_build_object(
    'lines', (select jsonb_agg(l || jsonb_build_object('value_cents', -(l ->> 'value_cents')::int, 'total_cents', -(l ->> 'total_cents')::int))
              from jsonb_array_elements(v_orig.data -> 'lines') l),
    'base_cents', -(v_orig.data ->> 'base_cents')::int,
    'vat_cents', -(v_orig.data ->> 'vat_cents')::int,
    'total_cents', -(v_orig.data ->> 'total_cents')::int,
    'credit_of', jsonb_build_object('number', v_orig.number, 'issue_date', v_orig.issue_date),
    'reason', left(trim(p_reason), 300)
  );
  insert into public.invoices (kind, number, order_id, credit_of, issue_date, tax_date, data, total_cents, created_by)
  values ('credit', private.next_invoice_number('invoice'), v_orig.order_id, v_orig.id, v_today, v_today, v_data,
          -v_orig.total_cents, auth.uid())
  returning * into v_credit;
  update public.invoices set cancelled = true where id = v_orig.id;

  insert into public.order_events (order_id, actor, type, data)
  values (v_orig.order_id, auth.uid(), 'invoice_credited',
          jsonb_build_object('number', v_credit.number, 'credit_of', v_orig.number, 'reason', left(trim(p_reason), 300)));
  return jsonb_build_object('id', v_credit.id, 'number', v_credit.number);
end;
$$;

-- Чернова за преглед преди издаване (без номер)
create function public.invoice_preview(p_order_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  return private.invoice_data(p_order_id);
end;
$$;

-- Екранът „Фактури“: следващи номера и „Започни от“ (само докато в серията няма издаден документ)
create function public.invoice_counters()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then (
    select jsonb_object_agg(c.series, jsonb_build_object(
      'next', lpad(c.next_number::text, 10, '0'),
      'min', lpad(c.min_number::text, 10, '0'),
      'max', lpad(c.max_number::text, 10, '0'),
      'issued', (select count(*) from public.invoices i
                 where case c.series when 'invoice' then i.kind in ('invoice', 'credit') else i.kind = 'proforma' end),
      'locked', exists (select 1 from public.invoices i
                 where case c.series when 'invoice' then i.kind in ('invoice', 'credit') else i.kind = 'proforma' end)
    ))
    from private.invoice_counters c
  ) end;
$$;

create function public.set_invoice_start(p_series text, p_next text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_counter private.invoice_counters;
begin
  if not private.is_staff(array['admin']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  select * into v_counter from private.invoice_counters where series = p_series for update;
  if v_counter.series is null then raise exception 'INVALID_SERIES'; end if;
  if exists (select 1 from public.invoices i
             where case p_series when 'invoice' then i.kind in ('invoice', 'credit') else i.kind = 'proforma' end) then
    raise exception 'SERIES_LOCKED';
  end if;
  if coalesce(p_next, '') !~ '^[0-9]{10}$' or p_next::bigint not between v_counter.min_number and v_counter.max_number then
    raise exception 'INVALID_START';
  end if;
  update private.invoice_counters set next_number = p_next::bigint where series = p_series;
end;
$$;

revoke execute on function public.issue_invoice(bigint, text), public.issue_credit_note(bigint, text),
  public.invoice_preview(bigint), public.invoice_counters(), public.set_invoice_start(text, text) from public, anon;
grant execute on function public.issue_invoice(bigint, text), public.issue_credit_note(bigint, text),
  public.invoice_preview(bigint), public.invoice_counters(), public.set_invoice_start(text, text) to authenticated;

-- Автоматично издаване при „Доставена“, ако е избрано в настройките
create function private.invoice_on_delivered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered'
     and (select value ->> 'mode' from public.settings where key = 'invoices') = 'on_delivered' then
    perform private.issue_invoice(new.id, 'invoice', auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_invoice_on_delivered after update of status on public.orders
  for each row execute function private.invoice_on_delivered();

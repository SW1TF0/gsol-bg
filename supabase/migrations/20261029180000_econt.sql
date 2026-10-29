-- Еконт по документа на клиента:
-- 1. Град и офис се избират от списъците на Еконт (обновяват се всяка нощ), не се пишат свободно.
-- 2. Цената на доставката идва на живо от Еконт по теглото — с наложения платеж и обявената стойност.
--    Базата сама строи заявката и пази отговора; поръчката взима цената оттук, не от браузъра.
--    Ако Еконт не отговори, важат цените от „Настройки“.
-- 3. Товарителница веднага след поръчката (или ръчно от админа), анулиране и статус на пратката.
--
-- С Еконт говори само Edge Function „econt“ (HTTPS). Тя вика econt_worker_* със секретния ключ,
-- който Supabase ѝ дава; нищо от тях не е достъпно за браузъра или за служителите.
-- Потребителят и паролата за Еконт са във Vault — въвежда ги администраторът от админа.

create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- ---------------------------------------------------------------- тегла
-- Без тегло Еконт не смята доставка. Машините — по линия (по документа), останалите — по вид,
-- с начални стойности, които собственикът проверява в админа. Продуктът може да има свое тегло.
alter table public.categories add column weight_kg numeric(6, 2)
  check (weight_kg is null or (weight_kg > 0 and weight_kg <= 500));
alter table public.products add column weight_kg numeric(6, 2)
  check (weight_kg is null or (weight_kg > 0 and weight_kg <= 500));

update public.categories c set weight_kg = v.w
from (values
  ('gsol-office', 10), ('gsol-basic', 14), ('gsol-izbor', 16), ('gsol-premium', 20), ('kompyutri', 14),
  ('laptopi', 3), ('rabota-i-dom', 3), ('geiming-laptopi', 4),
  ('komponenti', 1), ('procesori', 0.5), ('videokarti', 2), ('ram', 0.3), ('ssd', 0.5),
  ('periferiya', 1), ('monitori', 7), ('geiming-monitori', 8), ('mishki', 0.5), ('klaviaturi', 1.5), ('slushalki', 1),
  ('renovirani', 2)
) as v(slug, w)
where c.slug = v.slug;

create function private.cart_weight(p_items jsonb)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(round(coalesce(sum(
    coalesce(p.weight_kg, c.weight_kg, pc.weight_kg, 1) * least(greatest(coalesce(it.qty, 1), 1), 99)
  ), 0), 2), 0.1)
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as it(product_id bigint, qty int)
  join public.products p on p.id = it.product_id
  left join public.categories c on c.id = p.category_id
  left join public.categories pc on pc.id = c.parent_id;
$$;

revoke execute on function private.cart_weight(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- градове и офиси
create table public.econt_cities (
  id int primary key,
  name text not null,
  post_code text not null default '',
  region text not null default '',
  offices int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.econt_offices (
  code text primary key,
  name text not null,
  city_id int not null,
  city_name text not null,
  post_code text not null default '',
  address text not null default '',
  updated_at timestamptz not null default now()
);
create index econt_offices_city on public.econt_offices (city_id);

alter table public.econt_cities enable row level security;
alter table public.econt_offices enable row level security;
create policy "Градовете на Еконт са публични" on public.econt_cities for select to anon, authenticated using (true);
create policy "Офисите на Еконт са публични" on public.econt_offices for select to anon, authenticated using (true);

-- ---------------------------------------------------------------- настройки и състояние
-- env: demo (тестовата среда на Еконт) или live (истинският договор).
-- Офисът за изпращане и упълномощеното лице са задължителни за реалната среда.
insert into public.settings (key, value) values
  ('econt', '{"env": "demo", "sender_office_code": "", "sender_agent": "", "auto_label": true, "declared_value": true}')
on conflict (key) do nothing;

alter table public.settings add constraint settings_econt_valid check (
  key <> 'econt' or (
    value ->> 'env' in ('demo', 'live')
    and jsonb_typeof(value -> 'sender_office_code') = 'string'
    and jsonb_typeof(value -> 'sender_agent') = 'string'
    and jsonb_typeof(value -> 'auto_label') = 'boolean'
    and jsonb_typeof(value -> 'declared_value') = 'boolean'
  )
);

create table private.econt_state (
  id boolean primary key default true check (id),
  worker_url text,
  sync_requested boolean not null default true,
  sync_claimed_at timestamptz,
  synced_at timestamptz,
  sync_error text,
  test_requested boolean not null default false,
  test_ok boolean,
  test_message text,
  tested_at timestamptz,
  ticked_at timestamptz
);
insert into private.econt_state default values;

create table private.econt_prices (
  key text primary key,
  cents int,
  error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- поръчки и пратки
alter table public.orders
  add column econt_city_id int,
  add column econt_office_code text,
  add column shipping_weight_kg numeric(7, 2),
  add column shipping_source text check (shipping_source in ('econt', 'flat', 'free'));

create table public.shipments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders on delete cascade,
  env text not null check (env in ('demo', 'live')),
  state text not null default 'queued' check (state in ('queued', 'sending', 'created', 'failed', 'cancelling', 'cancelled')),
  number text,
  pdf_url text,
  price_cents int,
  status text,
  expected_at timestamptz,
  delivered_at timestamptz,
  events jsonb not null default '[]',
  error text,
  attempts int not null default 0,
  claimed_at timestamptz,
  status_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Една жива пратка на поръчка; неуспешните и анулираните остават за историята
create unique index shipments_one_active on public.shipments (order_id) where state not in ('failed', 'cancelled');
create index shipments_order on public.shipments (order_id);
create trigger shipments_touch before update on public.shipments
  for each row execute function public.touch_updated_at();

alter table public.shipments enable row level security;
create policy "Служителите с поръчки виждат пратките" on public.shipments
  for select to authenticated
  using ((select private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[])));

-- ---------------------------------------------------------------- цена
-- Заявката „calculate“ за количката. Връща {key, request, env} или {skip: причина}.
create function private.econt_price_context(p_items jsonb, p_code text, p_shipping jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb := (select value from public.settings where key = 'econt');
  v_company jsonb := (select value from public.settings where key = 'company');
  v_free_from int := coalesce((select (value ->> 'free_from_cents')::int from public.settings where key = 'shipping'), 0);
  v_method text := p_shipping ->> 'method';
  v_base jsonb;
  v_items int;
  v_sender text;
  v_office public.econt_offices;
  v_city public.econt_cities;
  v_receiver jsonb;
  v_services jsonb := '{}'::jsonb;
  v_request jsonb;
  v_weight numeric;
begin
  if v_method not in ('econt_office', 'econt_address') then return '{"skip": "method"}'; end if;

  v_base := private.compute_quote(p_items, p_code, null, v_method);
  if jsonb_array_length(v_base -> 'lines') = 0 then return '{"skip": "empty"}'; end if;
  v_items := (v_base ->> 'subtotal_cents')::int - (v_base ->> 'discount_cents')::int;

  -- Безплатна доставка (праг или промо код) — плаща магазинът, клиентът вижда 0
  if (v_base -> 'promo' ->> 'ok')::boolean is true and v_base -> 'promo' ->> 'type' = 'free_shipping'
    or (v_free_from > 0 and v_items >= v_free_from) then
    return '{"skip": "free"}';
  end if;

  if v_method = 'econt_office' then
    select * into v_office from public.econt_offices where code = p_shipping ->> 'office_code';
    if v_office.code is null then return '{"skip": "no_office"}'; end if;
    v_receiver := jsonb_build_object('receiverOfficeCode', v_office.code);
  else
    select * into v_city from public.econt_cities where id = (nullif(p_shipping ->> 'city_id', ''))::int;
    if v_city.id is null then return '{"skip": "no_city"}'; end if;
    v_receiver := jsonb_build_object('receiverAddress', jsonb_build_object(
      'city', jsonb_build_object('country', '{"code3": "BGR"}'::jsonb, 'name', v_city.name, 'postCode', v_city.post_code)
    ));
  end if;

  -- Изпращаме от офиса в настройките; в тестовата среда — от първия офис в Кърджали
  v_sender := nullif(v_cfg ->> 'sender_office_code', '');
  if v_sender is null and v_cfg ->> 'env' = 'demo' then
    select code into v_sender from public.econt_offices where city_name = 'Кърджали' order by code limit 1;
  end if;
  if v_sender is null then return '{"skip": "not_configured"}'; end if;
  if v_cfg ->> 'env' = 'live' and not exists (select 1 from vault.secrets where name = 'econt_password') then
    return '{"skip": "not_configured"}';
  end if;

  if p_shipping ->> 'payment' = 'cod' then
    v_services := v_services || jsonb_build_object('cdAmount', v_items / 100.0, 'cdType', 'get', 'cdCurrency', 'EUR');
  end if;
  if (v_cfg ->> 'declared_value')::boolean then
    v_services := v_services || jsonb_build_object('declaredValueAmount', v_items / 100.0, 'declaredValueCurrency', 'EUR');
  end if;

  v_weight := private.cart_weight(p_items);
  v_request := jsonb_build_object(
    'label', jsonb_build_object(
      'senderClient', jsonb_build_object('name', v_company ->> 'legal_name', 'phones', jsonb_build_array(regexp_replace(v_company ->> 'phone', '[^0-9+]', '', 'g'))),
      'senderOfficeCode', v_sender,
      'receiverClient', '{"name": "Получател", "phones": ["0888000000"]}'::jsonb,
      'packCount', 1,
      'shipmentType', 'pack',
      'weight', v_weight,
      'services', v_services
    ) || v_receiver,
    'mode', 'calculate'
  );
  return jsonb_build_object(
    'key', md5((v_cfg ->> 'env') || v_request::text),
    'request', v_request,
    'weight', v_weight
  );
end;
$$;

revoke execute on function private.econt_price_context(jsonb, text, jsonb) from public, anon, authenticated;

-- Офертата за чекаута: както quote_order, но доставката е цената от Еконт (ако я има в кеша)
create function private.checkout_quote(p_items jsonb, p_code text, p_email text, p_shipping jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_base jsonb := private.compute_quote(p_items, p_code, p_email, coalesce(p_shipping ->> 'method', 'econt_office'));
  v_ctx jsonb := private.econt_price_context(p_items, p_code, p_shipping);
  v_cents int;
begin
  if v_ctx ? 'skip' then
    return v_base || jsonb_build_object(
      'shipping_source', case when v_ctx ->> 'skip' = 'free' then 'free' else 'flat' end,
      'shipping_pending', v_ctx ->> 'skip' in ('no_office', 'no_city'),
      'weight_kg', private.cart_weight(p_items)
    );
  end if;

  select p.cents into v_cents from private.econt_prices p
  where p.key = v_ctx ->> 'key' and p.cents is not null and p.created_at > now() - interval '2 hours';
  if v_cents is null then
    return v_base || jsonb_build_object('shipping_source', 'flat', 'shipping_pending', false, 'weight_kg', v_ctx -> 'weight');
  end if;

  return v_base || jsonb_build_object(
    'shipping_cents', v_cents,
    'shipping_discount_cents', 0,
    'total_cents', (v_base ->> 'total_cents')::int - (v_base ->> 'shipping_cents')::int
      + (v_base ->> 'shipping_discount_cents')::int + v_cents,
    'shipping_source', 'econt',
    'shipping_pending', false,
    'weight_kg', v_ctx -> 'weight'
  );
end;
$$;

revoke execute on function private.checkout_quote(jsonb, text, text, jsonb) from public, anon, authenticated;

-- Публичната оферта за страницата на поръчката (без имейл — той идва при поръчката)
create function public.quote_checkout(p_items jsonb, p_code text default null, p_shipping jsonb default '{}')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.checkout_quote(p_items, p_code, null, p_shipping);
$$;

grant execute on function public.quote_checkout(jsonb, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- товарителница
create function private.econt_label_request(p_order_id bigint, p_env text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb := (select value from public.settings where key = 'econt');
  v_company jsonb := (select value from public.settings where key = 'company');
  v_order public.orders;
  v_city public.econt_cities;
  v_sender text := nullif(v_cfg ->> 'sender_office_code', '');
  v_agent text := nullif(trim(v_cfg ->> 'sender_agent'), '');
  v_items int;
  v_services jsonb := '{}'::jsonb;
  v_receiver jsonb;
  v_desc text;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Поръчката не съществува.'; end if;

  if p_env = 'demo' then
    v_sender := coalesce(v_sender, (select code from public.econt_offices where city_name = 'Кърджали' order by code limit 1));
    v_agent := coalesce(v_agent, 'Служител GSOL');
  end if;
  if v_sender is null then raise exception 'Изберете офис за изпращане (Настройки → Еконт).'; end if;
  if v_agent is null then raise exception 'Попълнете упълномощено лице (Настройки → Еконт) — Еконт го изисква за фирми.'; end if;

  if v_order.shipping_method = 'econt_office' then
    if v_order.econt_office_code is null then raise exception 'Поръчката няма избран офис от списъка на Еконт.'; end if;
    v_receiver := jsonb_build_object('receiverOfficeCode', v_order.econt_office_code);
  else
    select * into v_city from public.econt_cities where id = v_order.econt_city_id;
    v_receiver := jsonb_build_object('receiverAddress', jsonb_build_object(
      'city', jsonb_build_object('country', '{"code3": "BGR"}'::jsonb,
        'name', coalesce(v_city.name, v_order.shipping_city), 'postCode', coalesce(v_city.post_code, '')),
      'fullAddress', coalesce(v_order.shipping_address, '')
    ));
  end if;

  v_items := v_order.subtotal_cents - v_order.discount_cents;
  if v_order.payment_method = 'cod' then
    v_services := v_services || jsonb_build_object('cdAmount', v_order.total_cents / 100.0, 'cdType', 'get', 'cdCurrency', 'EUR');
  end if;
  if (v_cfg ->> 'declared_value')::boolean then
    v_services := v_services || jsonb_build_object('declaredValueAmount', v_items / 100.0, 'declaredValueCurrency', 'EUR');
  end if;

  select left(string_agg(oi.qty || ' × ' || oi.name, '; ' order by oi.id), 120) into v_desc
  from public.order_items oi where oi.order_id = v_order.id;

  return jsonb_build_object(
    'label', jsonb_build_object(
      'senderClient', jsonb_build_object('name', v_company ->> 'legal_name', 'phones', jsonb_build_array(regexp_replace(v_company ->> 'phone', '[^0-9+]', '', 'g'))),
      'senderAgent', jsonb_build_object('name', v_agent, 'phones', jsonb_build_array(regexp_replace(v_company ->> 'phone', '[^0-9+]', '', 'g'))),
      'senderOfficeCode', v_sender,
      'receiverClient', jsonb_build_object(
        'name', v_order.first_name || ' ' || v_order.last_name,
        'phones', jsonb_build_array(regexp_replace(v_order.phone, '[^0-9+]', '', 'g'))
      ),
      'packCount', 1,
      'shipmentType', 'pack',
      'weight', coalesce(v_order.shipping_weight_kg, 1),
      'shipmentDescription', coalesce(v_desc, 'Компютърна техника'),
      'orderNumber', v_order.number,
      'services', v_services
    ) || v_receiver,
    'mode', 'create'
  );
end;
$$;

revoke execute on function private.econt_label_request(bigint, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- поръчка
create or replace function public.place_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_order ->> 'email', '')));
  v_code text := nullif(upper(regexp_replace(coalesce(p_order ->> 'promo_code', ''), '\s', '', 'g')), '');
  v_method text := p_order ->> 'shipping_method';
  v_invoice jsonb := case when jsonb_typeof(p_order -> 'invoice') = 'object' then p_order -> 'invoice' end;
  v_company jsonb;
  v_quote jsonb;
  v_promo_id bigint;
  v_customer uuid;
  v_order public.orders;
  v_econt jsonb := (select value from public.settings where key = 'econt');
  v_listed boolean := exists (select 1 from public.econt_offices);
  v_office public.econt_offices;
  v_city public.econt_cities;
  v_city_name text := trim(coalesce(p_order ->> 'shipping_city', ''));
  v_office_text text := nullif(trim(coalesce(p_order ->> 'econt_office', '')), '');
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if length(trim(coalesce(p_order ->> 'first_name', ''))) < 2 then raise exception 'INVALID_FIRST_NAME'; end if;
  if length(trim(coalesce(p_order ->> 'last_name', ''))) < 2 then raise exception 'INVALID_LAST_NAME'; end if;
  if regexp_replace(coalesce(p_order ->> 'phone', ''), '[^0-9+]', '', 'g') !~ '^\+?[0-9]{8,15}$' then
    raise exception 'INVALID_PHONE';
  end if;
  if v_method is null or v_method not in ('econt_office', 'econt_address') then raise exception 'INVALID_SHIPPING'; end if;

  -- Град и офис — само от списъците на Еконт (докато списъците не са дошли — свободен текст)
  if v_listed and v_method = 'econt_office' then
    select * into v_office from public.econt_offices where code = p_order ->> 'econt_office_code';
    if v_office.code is null then raise exception 'INVALID_OFFICE'; end if;
    v_city_name := v_office.city_name;
    v_office_text := v_office.name || ' — ' || v_office.address;
  elsif v_listed then
    select * into v_city from public.econt_cities where id = (nullif(p_order ->> 'econt_city_id', ''))::int;
    if v_city.id is null then raise exception 'INVALID_CITY'; end if;
    v_city_name := v_city.name;
  end if;
  if length(v_city_name) < 2 then raise exception 'INVALID_CITY'; end if;
  if v_method = 'econt_address' and length(trim(coalesce(p_order ->> 'shipping_address', ''))) < 5 then
    raise exception 'INVALID_ADDRESS';
  end if;
  if v_method = 'econt_office' and length(coalesce(v_office_text, '')) < 2 then
    raise exception 'INVALID_OFFICE';
  end if;
  if coalesce(p_order ->> 'payment_method', '') not in ('cod', 'bank') then raise exception 'INVALID_PAYMENT'; end if;

  -- Фактура: на физическо лице (име, адрес, ЕГН по избор) или на фирма (фирма, ЕИК/Булстат, МОЛ, адрес)
  if v_invoice is not null then
    if coalesce(v_invoice ->> 'type', 'company') = 'person' then
      if length(trim(coalesce(v_invoice ->> 'name', ''))) < 3
        or length(trim(coalesce(v_invoice ->> 'address', ''))) < 5
        or coalesce(v_invoice ->> 'egn', '') !~ '^([0-9]{10})?$' then
        raise exception 'INVALID_INVOICE';
      end if;
    else
      if coalesce(v_invoice ->> 'eik', '') !~ '^([0-9]{9}|[0-9]{13})$'
        or length(trim(coalesce(v_invoice ->> 'company', ''))) < 2
        or length(trim(coalesce(v_invoice ->> 'mol', ''))) < 3
        or length(trim(coalesce(v_invoice ->> 'address', ''))) < 5
        or coalesce(v_invoice ->> 'vat', '') !~ '^(BG[0-9]{9,10})?$' then
        raise exception 'INVALID_INVOICE';
      end if;
      v_company := v_invoice - 'type';
    end if;
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'EMPTY_CART';
  end if;

  -- Заключваме кода, за да не се надвиши лимитът при едновременни поръчки
  if v_code is not null then
    perform 1 from public.promo_codes pc where pc.code = v_code for update;
  end if;

  -- Цената на доставката е тази, която базата е взела от Еконт за същата количка (или цената от настройките)
  v_quote := private.checkout_quote(p_items, v_code, v_email, jsonb_build_object(
    'method', v_method,
    'office_code', v_office.code,
    'city_id', v_city.id,
    'payment', p_order ->> 'payment_method'
  ));

  if jsonb_array_length(v_quote -> 'missing') > 0 then raise exception 'ITEMS_UNAVAILABLE'; end if;
  if jsonb_array_length(v_quote -> 'lines') = 0 then raise exception 'EMPTY_CART'; end if;
  if v_code is not null and not (v_quote -> 'promo' ->> 'ok')::boolean then
    raise exception 'PROMO_%', upper(v_quote -> 'promo' ->> 'reason');
  end if;
  v_promo_id := (v_quote -> 'promo' ->> 'id')::bigint;

  insert into public.customers (email, phone, first_name, last_name, company, marketing_opt_in)
  values (
    v_email,
    trim(p_order ->> 'phone'),
    trim(p_order ->> 'first_name'),
    trim(p_order ->> 'last_name'),
    v_company,
    coalesce((p_order ->> 'marketing_opt_in')::boolean, false)
  )
  on conflict (lower(email)) do update set
    phone = excluded.phone,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    company = coalesce(excluded.company, public.customers.company),
    marketing_opt_in = public.customers.marketing_opt_in or excluded.marketing_opt_in
  returning id into v_customer;

  insert into public.orders (
    customer_id, email, phone, first_name, last_name,
    shipping_method, shipping_city, shipping_address, econt_office,
    econt_city_id, econt_office_code, shipping_weight_kg, shipping_source,
    payment_method, invoice, note,
    subtotal_cents, discount_cents, shipping_cents, total_cents,
    promo_code_id, promo_code, utm, legal
  ) values (
    v_customer, v_email, trim(p_order ->> 'phone'), trim(p_order ->> 'first_name'), trim(p_order ->> 'last_name'),
    v_method, v_city_name,
    case when v_method = 'econt_address' then trim(p_order ->> 'shipping_address') end,
    case when v_method = 'econt_office' then v_office_text end,
    coalesce(v_city.id, v_office.city_id), v_office.code,
    (v_quote ->> 'weight_kg')::numeric, v_quote ->> 'shipping_source',
    p_order ->> 'payment_method', v_invoice, nullif(left(trim(coalesce(p_order ->> 'note', '')), 2000), ''),
    (v_quote ->> 'subtotal_cents')::int,
    (v_quote ->> 'discount_cents')::int,
    (v_quote ->> 'shipping_cents')::int - (v_quote ->> 'shipping_discount_cents')::int,
    (v_quote ->> 'total_cents')::int,
    v_promo_id,
    case when v_promo_id is not null then v_code end,
    case when jsonb_typeof(p_order -> 'utm') = 'object' then p_order -> 'utm' end,
    -- Правният запис: приетите версии и точните думи на тикчето (фиксирани тук, не от браузъра)
    jsonb_build_object(
      'terms', private.legal_ref('obshti-usloviya'),
      'privacy', private.legal_ref('poveritelnost'),
      'consent', 'Прочетох и приемам Общите условия. Данните за поръчката са верни.',
      'accepted_at', now()
    )
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, name, sku, unit_price_cents, qty, discount_cents, line_total_cents)
  select v_order.id, (l ->> 'product_id')::bigint, l ->> 'name', l ->> 'sku',
         (l ->> 'unit_price_cents')::int, (l ->> 'qty')::int, (l ->> 'discount_cents')::int,
         (l ->> 'unit_price_cents')::int * (l ->> 'qty')::int - (l ->> 'discount_cents')::int
  from jsonb_array_elements(v_quote -> 'lines') l;

  insert into public.order_events (order_id, type, data)
  values (v_order.id, 'created', jsonb_build_object('total_cents', v_order.total_cents, 'promo_code', v_order.promo_code));

  if v_promo_id is not null then
    insert into public.promo_redemptions (promo_code_id, order_id, email, discount_cents)
    values (v_promo_id, v_order.id, v_email,
            (v_quote ->> 'discount_cents')::int + (v_quote ->> 'shipping_discount_cents')::int);
    update public.promo_codes set times_used = times_used + 1 where id = v_promo_id;
  end if;

  -- Товарителница след поръчката: работникът я създава веднага (сайтът го буди) или до 5 минути
  if (v_econt ->> 'auto_label')::boolean then
    insert into public.shipments (order_id, env) values (v_order.id, v_econt ->> 'env');
  end if;

  return jsonb_build_object('order_id', v_order.id, 'number', v_order.number, 'total_cents', v_order.total_cents);
end;
$$;

-- ---------------------------------------------------------------- за служителите
create function public.econt_ship(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from public.shipments where order_id = p_order_id and state not in ('failed', 'cancelled')) then
    raise exception 'SHIPMENT_EXISTS';
  end if;
  insert into public.shipments (order_id, env)
  values (p_order_id, (select value ->> 'env' from public.settings where key = 'econt'));
end;
$$;

create function public.econt_cancel(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  update public.shipments set state = 'cancelling', claimed_at = null, error = null
  where order_id = p_order_id and state = 'created' and delivered_at is null;
  if not found then raise exception 'NO_SHIPMENT'; end if;
end;
$$;

create function public.econt_refresh(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  update public.shipments set status_checked_at = null where order_id = p_order_id and state = 'created';
end;
$$;

-- Потребител и парола за Еконт → Vault. Празен потребител изтрива достъпа.
create function public.econt_set_access(p_username text, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := trim(coalesce(p_username, ''));
  v_id uuid;
begin
  if not private.is_staff(array['admin']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if v_user = '' then
    delete from vault.secrets where name in ('econt_username', 'econt_password');
  else
    if length(coalesce(p_password, '')) < 3 then raise exception 'INVALID_PASSWORD'; end if;
    select id into v_id from vault.secrets where name = 'econt_username';
    if v_id is null then
      perform vault.create_secret(v_user, 'econt_username', 'Еконт — потребител');
    else
      perform vault.update_secret(v_id, v_user);
    end if;
    select id into v_id from vault.secrets where name = 'econt_password';
    if v_id is null then
      perform vault.create_secret(p_password, 'econt_password', 'Еконт — парола');
    else
      perform vault.update_secret(v_id, p_password);
    end if;
  end if;
  update private.econt_state set test_requested = v_user <> '', test_ok = null, test_message = null;
end;
$$;

create function public.econt_request(p_what text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_what = 'test' then
    update private.econt_state set test_requested = true;
  elsif p_what = 'sync' then
    update private.econt_state set sync_requested = true, sync_claimed_at = null;
  else
    raise exception 'INVALID_REQUEST';
  end if;
end;
$$;

-- Какво вижда админът: има ли достъп (без паролата), кога са обновени списъците, проверката
create function public.econt_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.is_staff() then jsonb_build_object(
    'username', (select decrypted_secret from vault.decrypted_secrets where name = 'econt_username'),
    'has_password', exists (select 1 from vault.secrets where name = 'econt_password'),
    'cities', (select count(*) from public.econt_cities),
    'offices', (select count(*) from public.econt_offices),
    'synced_at', s.synced_at,
    'sync_error', s.sync_error,
    'sync_pending', s.sync_requested,
    'test_ok', s.test_ok,
    'test_message', s.test_message,
    'tested_at', s.tested_at,
    'test_pending', s.test_requested,
    'ticked_at', s.ticked_at,
    'worker', s.worker_url is not null
  ) end
  from private.econt_state s;
$$;

grant execute on function public.econt_ship(bigint), public.econt_cancel(bigint), public.econt_refresh(bigint),
  public.econt_set_access(text, text), public.econt_request(text), public.econt_overview() to authenticated;
revoke execute on function public.econt_ship(bigint), public.econt_cancel(bigint), public.econt_refresh(bigint),
  public.econt_set_access(text, text), public.econt_request(text), public.econt_overview() from anon;

-- ---------------------------------------------------------------- за работника (само секретният ключ)
create function public.econt_worker_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'env', (select value ->> 'env' from public.settings where key = 'econt'),
    'username', (select decrypted_secret from vault.decrypted_secrets where name = 'econt_username'),
    'password', (select decrypted_secret from vault.decrypted_secrets where name = 'econt_password')
  );
$$;

create function public.econt_worker_price(p_items jsonb, p_code text, p_shipping jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ctx jsonb := private.econt_price_context(p_items, p_code, p_shipping);
  v_hit private.econt_prices;
begin
  if v_ctx ? 'skip' then return v_ctx; end if;
  select * into v_hit from private.econt_prices where key = v_ctx ->> 'key';
  -- Цената важи 2 часа; грешка — 5 минути (да не питаме Еконт отново при всяко докосване)
  if v_hit.cents is not null and v_hit.created_at > now() - interval '2 hours' then
    return jsonb_build_object('cents', v_hit.cents);
  end if;
  if v_hit.error is not null and v_hit.created_at > now() - interval '5 minutes' then
    return '{"skip": "error"}';
  end if;
  -- Пазим акаунта на магазина: най-много 60 нови сметки в минута
  if (select count(*) from private.econt_prices where created_at > now() - interval '1 minute') >= 60 then
    return '{"skip": "rate"}';
  end if;
  return jsonb_build_object('key', v_ctx ->> 'key', 'request', v_ctx -> 'request');
end;
$$;

create function public.econt_worker_price_store(p_key text, p_cents int, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.econt_prices (key, cents, error) values (p_key, p_cents, left(p_error, 500))
  on conflict (key) do update set cents = excluded.cents, error = excluded.error, created_at = now();
  delete from private.econt_prices where created_at < now() - interval '1 day';
$$;

-- Какво чака: товарителници, анулиране, статуси, проверка на достъпа, обновяване на списъците
create function public.econt_worker_claim()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_labels jsonb := '[]'::jsonb;
  v_cancels jsonb;
  v_statuses jsonb;
  v_test boolean;
  v_sync boolean;
  r record;
begin
  update private.econt_state set ticked_at = now();

  for r in
    with c as (
      select id from public.shipments
      where state = 'queued' or (state = 'sending' and claimed_at < now() - interval '5 minutes')
      order by id limit 10
      for update skip locked
    )
    update public.shipments s set state = 'sending', claimed_at = now(), attempts = attempts + 1, error = null
    from c where s.id = c.id
    returning s.id, s.order_id, s.env
  loop
    begin
      v_labels := v_labels || jsonb_build_object('shipment_id', r.id, 'request', private.econt_label_request(r.order_id, r.env));
    exception when others then
      update public.shipments set state = 'failed', error = sqlerrm where id = r.id;
      insert into public.order_events (order_id, type, data)
      values (r.order_id, 'shipment_failed', jsonb_build_object('error', sqlerrm));
    end;
  end loop;

  with c as (
    select id from public.shipments
    where state = 'cancelling' and (claimed_at is null or claimed_at < now() - interval '5 minutes')
    limit 10 for update skip locked
  ), u as (
    update public.shipments s set claimed_at = now() from c where s.id = c.id returning s.id, s.number
  )
  select coalesce(jsonb_agg(jsonb_build_object('shipment_id', id, 'number', number)), '[]') into v_cancels from u;

  -- Статус: на всеки 2 часа за живите пратки от последните 30 дни (или веднага при заявка)
  with c as (
    select id from public.shipments
    where state = 'created' and delivered_at is null and created_at > now() - interval '30 days'
      and (status_checked_at is null or status_checked_at < now() - interval '2 hours')
    order by status_checked_at nulls first limit 50
    for update skip locked
  ), u as (
    update public.shipments s set status_checked_at = now() from c where s.id = c.id returning s.number
  )
  select coalesce(jsonb_agg(number), '[]') into v_statuses from u;

  update private.econt_state set test_requested = false where test_requested returning true into v_test;

  update private.econt_state
  set sync_requested = false, sync_claimed_at = now()
  where (sync_requested or synced_at is null or synced_at < now() - interval '20 hours')
    and (sync_claimed_at is null or sync_claimed_at < now() - interval '10 minutes')
  returning true into v_sync;

  return jsonb_build_object(
    'labels', v_labels,
    'cancels', v_cancels,
    'statuses', v_statuses,
    'test', coalesce(v_test, false),
    'sync', coalesce(v_sync, false)
  );
end;
$$;

create function public.econt_worker_label_done(p_shipment_id bigint, p_label jsonb, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ship public.shipments;
begin
  if p_error is not null or p_label ->> 'shipmentNumber' is null then
    update public.shipments set state = 'failed', error = left(coalesce(p_error, 'Еконт не върна номер на пратка.'), 500)
    where id = p_shipment_id returning * into v_ship;
    insert into public.order_events (order_id, type, data)
    values (v_ship.order_id, 'shipment_failed', jsonb_build_object('error', v_ship.error));
    return;
  end if;
  update public.shipments set
    state = 'created',
    number = p_label ->> 'shipmentNumber',
    pdf_url = p_label ->> 'pdfURL',
    price_cents = round((p_label ->> 'totalPrice')::numeric * 100)::int,
    status = p_label ->> 'shortDeliveryStatus',
    expected_at = to_timestamp((p_label ->> 'expectedDeliveryDate')::bigint / 1000.0),
    status_checked_at = now()
  where id = p_shipment_id returning * into v_ship;
  insert into public.order_events (order_id, type, data)
  values (v_ship.order_id, 'shipment_created', jsonb_build_object('number', v_ship.number, 'env', v_ship.env));
end;
$$;

create function public.econt_worker_cancel_done(p_shipment_id bigint, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ship public.shipments;
begin
  update public.shipments set
    state = case when p_error is null then 'cancelled' else 'created' end,
    error = case when p_error is not null then 'Анулирането не мина: ' || left(p_error, 400) end
  where id = p_shipment_id returning * into v_ship;
  insert into public.order_events (order_id, type, data)
  values (v_ship.order_id, case when p_error is null then 'shipment_cancelled' else 'shipment_cancel_failed' end,
          jsonb_build_object('number', v_ship.number, 'error', p_error));
end;
$$;

create function public.econt_worker_status_done(p_statuses jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.shipments s set
    status = coalesce(st ->> 'shortDeliveryStatus', s.status),
    expected_at = coalesce(to_timestamp((st ->> 'expectedDeliveryDate')::bigint / 1000.0), s.expected_at),
    delivered_at = to_timestamp((st ->> 'deliveryTime')::bigint / 1000.0),
    pdf_url = coalesce(st ->> 'pdfURL', s.pdf_url),
    events = coalesce((
      select jsonb_agg(jsonb_build_object(
        'time', to_timestamp((e ->> 'time')::bigint / 1000.0),
        'text', coalesce(nullif(e ->> 'destinationDetails', ''), e ->> 'destinationType'),
        'place', coalesce(nullif(e ->> 'officeName', ''), e ->> 'cityName')
      ) order by (e ->> 'time')::bigint desc)
      from jsonb_array_elements(coalesce(st -> 'trackingEvents', '[]')) e
    ), s.events),
    status_checked_at = now()
  from jsonb_array_elements(coalesce(p_statuses, '[]')) st
  where s.number = st ->> 'shipmentNumber';
$$;

create function public.econt_worker_test_done(p_ok boolean, p_message text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.econt_state set test_ok = p_ok, test_message = left(p_message, 300), tested_at = now();
$$;

create function public.econt_worker_sync_done(p_cities jsonb, p_offices jsonb, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Пазим старите списъци, ако Еконт върне грешка или подозрително малко записи
  if p_error is not null or jsonb_array_length(coalesce(p_cities, '[]')) < 100 or jsonb_array_length(coalesce(p_offices, '[]')) < 100 then
    update private.econt_state set sync_error = coalesce(p_error, 'Еконт върна непълни списъци.'), sync_claimed_at = null;
    return;
  end if;

  insert into public.econt_cities (id, name, post_code, region, updated_at)
  select (c ->> 'id')::int, c ->> 'name', coalesce(c ->> 'post_code', ''), coalesce(c ->> 'region', ''), now()
  from jsonb_array_elements(p_cities) c
  on conflict (id) do update set name = excluded.name, post_code = excluded.post_code, region = excluded.region, updated_at = now();
  delete from public.econt_cities where updated_at < now();

  insert into public.econt_offices (code, name, city_id, city_name, post_code, address, updated_at)
  select o ->> 'code', o ->> 'name', (o ->> 'city_id')::int, o ->> 'city_name', coalesce(o ->> 'post_code', ''),
         coalesce(o ->> 'address', ''), now()
  from jsonb_array_elements(p_offices) o
  on conflict (code) do update set name = excluded.name, city_id = excluded.city_id, city_name = excluded.city_name,
    post_code = excluded.post_code, address = excluded.address, updated_at = now();
  delete from public.econt_offices where updated_at < now();

  update public.econt_cities c set offices = (select count(*) from public.econt_offices o where o.city_id = c.id);
  update private.econt_state set synced_at = now(), sync_error = null, sync_claimed_at = null;
end;
$$;

revoke execute on function public.econt_worker_access(), public.econt_worker_price(jsonb, text, jsonb),
  public.econt_worker_price_store(text, int, text), public.econt_worker_claim(),
  public.econt_worker_label_done(bigint, jsonb, text), public.econt_worker_cancel_done(bigint, text),
  public.econt_worker_status_done(jsonb), public.econt_worker_test_done(boolean, text),
  public.econt_worker_sync_done(jsonb, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.econt_worker_access(), public.econt_worker_price(jsonb, text, jsonb),
  public.econt_worker_price_store(text, int, text), public.econt_worker_claim(),
  public.econt_worker_label_done(bigint, jsonb, text), public.econt_worker_cancel_done(bigint, text),
  public.econt_worker_status_done(jsonb), public.econt_worker_test_done(boolean, text),
  public.econt_worker_sync_done(jsonb, jsonb, text)
  to service_role;

-- ---------------------------------------------------------------- будилник
-- На всеки 5 минути: ако има нещо за вършене, будим работника. Адресът му е в econt_state.worker_url.
create function private.econt_wake()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s private.econt_state;
begin
  select * into s from private.econt_state;
  if s.worker_url is null then return; end if;
  if s.sync_requested or s.test_requested or s.synced_at is null or s.synced_at < now() - interval '20 hours'
    or exists (
      select 1 from public.shipments
      where state in ('queued', 'cancelling')
        or (state = 'sending' and claimed_at < now() - interval '5 minutes')
        or (state = 'created' and delivered_at is null and created_at > now() - interval '30 days'
            and (status_checked_at is null or status_checked_at < now() - interval '2 hours'))
    ) then
    perform net.http_post(
      url := s.worker_url,
      body := '{"action": "tick"}'::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 60000
    );
  end if;
end;
$$;

revoke execute on function private.econt_wake() from public, anon, authenticated;

select cron.schedule('econt-wake', '*/5 * * * *', 'select private.econt_wake()');

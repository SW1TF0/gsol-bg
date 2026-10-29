-- Чекаут по документа на клиента:
-- 1. Версии на правните текстове с отпечатък (SHA-256); всяка поръчка пази коя версия е приета
--    и точните думи на тикчето. Версията се вдига сама при всяка промяна на текста — не може
--    текстът да се смени „без да се вдигне версията“.
-- 2. Фактура на физическо лице (ЕГН по избор) или на фирма.
-- 3. Броячи за менюто: продукти по категория и марка (празните категории изчезват от менюто сами).

create table public.legal_versions (
  id bigint generated always as identity primary key,
  slug text not null,
  version int not null,
  title text not null,
  body text not null,
  sha256 text not null,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

alter table public.legal_versions enable row level security;
create policy "Версиите на правните текстове са публични" on public.legal_versions
  for select to anon, authenticated using (true);

create function private.record_legal_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last public.legal_versions;
begin
  if new.slug not in ('obshti-usloviya', 'poveritelnost', 'dostavka-i-plashtane', 'vrashtane-i-otkaz', 'garanciya') then
    return new;
  end if;
  select * into v_last from public.legal_versions where slug = new.slug order by version desc limit 1;
  if v_last.id is null or v_last.sha256 <> encode(extensions.digest(new.body, 'sha256'), 'hex') then
    insert into public.legal_versions (slug, version, title, body, sha256)
    values (new.slug, coalesce(v_last.version, 0) + 1, new.title, new.body, encode(extensions.digest(new.body, 'sha256'), 'hex'));
  end if;
  return new;
end;
$$;

create trigger pages_legal_version after insert or update of body on public.pages
  for each row execute function private.record_legal_version();

insert into public.legal_versions (slug, version, title, body, sha256)
select p.slug, 1, p.title, p.body, encode(extensions.digest(p.body, 'sha256'), 'hex')
from public.pages p
where p.slug in ('obshti-usloviya', 'poveritelnost', 'dostavka-i-plashtane', 'vrashtane-i-otkaz', 'garanciya');

alter table public.orders add column legal jsonb;

-- Последната версия на правен текст като запис за поръчката
create function private.legal_ref(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', v.id, 'version', v.version, 'sha256', v.sha256)
  from public.legal_versions v where v.slug = p_slug order by v.version desc limit 1;
$$;

revoke execute on function private.legal_ref(text) from public, anon, authenticated;

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
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if length(trim(coalesce(p_order ->> 'first_name', ''))) < 2 then raise exception 'INVALID_FIRST_NAME'; end if;
  if length(trim(coalesce(p_order ->> 'last_name', ''))) < 2 then raise exception 'INVALID_LAST_NAME'; end if;
  if regexp_replace(coalesce(p_order ->> 'phone', ''), '[^0-9+]', '', 'g') !~ '^\+?[0-9]{8,15}$' then
    raise exception 'INVALID_PHONE';
  end if;
  if v_method is null or v_method not in ('econt_office', 'econt_address') then raise exception 'INVALID_SHIPPING'; end if;
  if length(trim(coalesce(p_order ->> 'shipping_city', ''))) < 2 then raise exception 'INVALID_CITY'; end if;
  if v_method = 'econt_address' and length(trim(coalesce(p_order ->> 'shipping_address', ''))) < 5 then
    raise exception 'INVALID_ADDRESS';
  end if;
  if v_method = 'econt_office' and length(trim(coalesce(p_order ->> 'econt_office', ''))) < 2 then
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

  v_quote := private.compute_quote(p_items, v_code, v_email, v_method);

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
    payment_method, invoice, note,
    subtotal_cents, discount_cents, shipping_cents, total_cents,
    promo_code_id, promo_code, utm, legal
  ) values (
    v_customer, v_email, trim(p_order ->> 'phone'), trim(p_order ->> 'first_name'), trim(p_order ->> 'last_name'),
    v_method, trim(p_order ->> 'shipping_city'), nullif(trim(coalesce(p_order ->> 'shipping_address', '')), ''),
    nullif(trim(coalesce(p_order ->> 'econt_office', '')), ''),
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

  return jsonb_build_object('order_id', v_order.id, 'number', v_order.number, 'total_cents', v_order.total_cents);
end;
$$;

-- ---------------------------------------------------------------- меню
-- Продукти по категория и марка — за падащите менюта и „Популярни марки“ (без ограничението от 1000 реда)
create function public.catalog_menu()
returns table (category_id bigint, brand text, products int)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.category_id, coalesce(nullif(trim(p.brand), ''), '—'), count(*)::int
  from public.products p
  where p.is_active and p.category_id is not null
  group by 1, 2;
$$;

grant execute on function public.catalog_menu() to anon, authenticated;

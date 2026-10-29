-- Адрес по полетата на Еконт: улица и квартал от списъка на Еконт, номер и подробности.
-- Така товарителницата до адрес не се проваля заради изписване. Сайтът проверява адреса в Еконт
-- преди поръчката; тук пазим частите и ги подаваме на Еконт поотделно.

alter table public.orders add column econt_address jsonb;

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
  -- Адресът по полетата на Еконт: улица + номер или квартал + блок/вход (и подробности)
  v_parts jsonb := case when jsonb_typeof(p_order -> 'econt_address') = 'object' then p_order -> 'econt_address' end;
  v_address jsonb;
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
  if v_method = 'econt_address' and v_parts is not null then
    v_address := jsonb_strip_nulls(jsonb_build_object(
      'street', left(nullif(trim(v_parts ->> 'street'), ''), 120),
      'num', left(nullif(trim(v_parts ->> 'num'), ''), 20),
      'quarter', left(nullif(trim(v_parts ->> 'quarter'), ''), 120),
      'other', left(nullif(trim(v_parts ->> 'other'), ''), 200)
    ));
    if not ((v_address ? 'street' and v_address ? 'num') or (v_address ? 'quarter' and v_address ? 'other')
            or length(coalesce(v_address ->> 'other', '')) >= 5) then
      raise exception 'INVALID_ADDRESS';
    end if;
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
    econt_city_id, econt_office_code, econt_address, shipping_weight_kg, shipping_source,
    payment_method, invoice, note,
    subtotal_cents, discount_cents, shipping_cents, total_cents,
    promo_code_id, promo_code, utm, legal
  ) values (
    v_customer, v_email, trim(p_order ->> 'phone'), trim(p_order ->> 'first_name'), trim(p_order ->> 'last_name'),
    v_method, v_city_name,
    case when v_method = 'econt_address' then trim(p_order ->> 'shipping_address') end,
    case when v_method = 'econt_office' then v_office_text end,
    coalesce(v_city.id, v_office.city_id), v_office.code, v_address,
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

create or replace function private.econt_label_request(p_order_id bigint, p_env text)
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
    -- По полетата на Еконт, ако ги има; по-старите поръчки — целият адрес в един ред
    v_receiver := jsonb_build_object('receiverAddress',
      jsonb_build_object('city', jsonb_build_object('country', '{"code3": "BGR"}'::jsonb,
        'name', coalesce(v_city.name, v_order.shipping_city), 'postCode', coalesce(v_city.post_code, '')))
      || coalesce(v_order.econt_address, jsonb_build_object('fullAddress', coalesce(v_order.shipping_address, '')))
    );
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

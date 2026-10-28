-- Цените и промо кодовете се изчисляват в базата: quote_order дава оферта за количката,
-- place_order я пресмята отново и записва поръчката. Така сайтът работи само с публичния ключ
-- и клиентът не може да подмени цена или отстъпка.

-- is_staff се ползва в RLS политиките, но не трябва да е достъпна като /rpc
create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.is_staff(public.staff_role[]) set schema private;

drop function public.create_order(jsonb, jsonb);

-- ---------------------------------------------------------------- оферта
-- Вътрешна: проверките по имейл (лимит на клиент, първа поръчка) се правят само при поръчка,
-- за да не може публичната оферта да издава дали даден имейл вече е поръчвал.
create function private.compute_quote(
  p_items jsonb,
  p_code text default null,
  p_email text default null,
  p_shipping_method text default 'econt_office'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code text := nullif(upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_promo public.promo_codes;
  v_has_promo boolean := false;
  v_reason text;
  v_lines jsonb := '[]'::jsonb;
  v_missing jsonb;
  v_subtotal int := 0;
  v_eligible_total int := 0;
  v_discount int := 0;
  v_shipping jsonb;
  v_ship int := 0;
  v_ship_discount int := 0;
  v_free_from int;
  v_alloc int := 0;
  v_largest int := -1;
  v_largest_idx int := 0;
  v_line_total int;
  v_share int;
  r record;
begin
  if v_code is not null then
    select * into v_promo from public.promo_codes pc where pc.code = v_code;
    v_has_promo := found;
    if not found then
      v_reason := 'invalid';
    end if;
  end if;

  -- Цените винаги идват от базата; количеството се ограничава до 1..99
  for r in
    select p.id, p.slug, p.name, p.sku, p.brand, p.category_id, p.is_promo, p.price_cents,
           p.images[1] as image, least(greatest(coalesce(it.qty, 1), 1), 99) as qty
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as it(product_id bigint, qty int)
    join public.products p on p.id = it.product_id and p.is_active and p.stock_status <> 'out_of_stock'
  loop
    v_subtotal := v_subtotal + r.price_cents * r.qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', r.id,
      'slug', r.slug,
      'name', r.name,
      'sku', r.sku,
      'image', r.image,
      'unit_price_cents', r.price_cents,
      'qty', r.qty,
      'discount_cents', 0,
      'eligible', coalesce(case
        when not v_has_promo then false
        when v_promo.exclude_promo_items and r.is_promo then false
        when v_promo.scope = 'categories' then r.category_id = any (v_promo.scope_category_ids)
        when v_promo.scope = 'brands' then lower(coalesce(r.brand, '')) = any (select lower(b) from unnest(v_promo.scope_brands) b)
        when v_promo.scope = 'products' then r.id = any (v_promo.scope_product_ids)
        else true
      end, false)
    );
  end loop;

  select coalesce(jsonb_agg(it.product_id), '[]'::jsonb) into v_missing
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as it(product_id bigint, qty int)
  where not exists (
    select 1 from public.products p
    where p.id = it.product_id and p.is_active and p.stock_status <> 'out_of_stock'
  );

  select s.value into v_shipping from public.settings s where s.key = 'shipping';
  v_ship := case when p_shipping_method = 'econt_address'
    then coalesce((v_shipping ->> 'econt_address_cents')::int, 0)
    else coalesce((v_shipping ->> 'econt_office_cents')::int, 0) end;

  -- Проверки на кода (тези за клиента — само ако имаме имейл)
  if v_has_promo then
    if not v_promo.is_active then
      v_reason := 'inactive';
    elsif v_promo.starts_at is not null and now() < v_promo.starts_at then
      v_reason := 'not_started';
    elsif v_promo.ends_at is not null and now() > v_promo.ends_at then
      v_reason := 'expired';
    elsif v_promo.usage_limit is not null and v_promo.times_used >= v_promo.usage_limit then
      v_reason := 'exhausted';
    elsif v_email is not null and cardinality(v_promo.allowed_emails) > 0
      and not (v_email = any (select lower(e) from unnest(v_promo.allowed_emails) e)) then
      v_reason := 'not_allowed';
    elsif v_email is not null and v_promo.per_customer_limit is not null
      and (select count(*) from public.promo_redemptions pr
           where pr.promo_code_id = v_promo.id and lower(pr.email) = v_email) >= v_promo.per_customer_limit then
      v_reason := 'customer_limit';
    elsif v_email is not null and v_promo.first_order_only
      and exists (select 1 from public.orders o where lower(o.email) = v_email and o.status <> 'cancelled') then
      v_reason := 'first_order_only';
    elsif v_subtotal < v_promo.min_subtotal_cents then
      v_reason := 'min_subtotal';
    end if;
  end if;

  select coalesce(sum((l ->> 'unit_price_cents')::int * (l ->> 'qty')::int)
                  filter (where (l ->> 'eligible')::boolean), 0)
    into v_eligible_total
  from jsonb_array_elements(v_lines) l;

  if v_has_promo and v_reason is null then
    if v_promo.discount_type = 'free_shipping' then
      if v_promo.scope <> 'order' and v_eligible_total = 0 then
        v_reason := 'no_eligible_items';
      else
        v_ship_discount := v_ship;
      end if;
    elsif v_eligible_total = 0 then
      v_reason := 'no_eligible_items';
    else
      v_discount := case when v_promo.discount_type = 'percent'
        then round(v_eligible_total * v_promo.percent / 100)::int
        else least(v_promo.amount_cents, v_eligible_total) end;
      if v_promo.max_discount_cents is not null then
        v_discount := least(v_discount, v_promo.max_discount_cents);
      end if;
    end if;
  end if;

  -- Разпределяне на отстъпката по редовете; остатъкът отива към най-големия ред
  if v_discount > 0 then
    for idx in 0 .. jsonb_array_length(v_lines) - 1 loop
      if (v_lines -> idx ->> 'eligible')::boolean then
        v_line_total := (v_lines -> idx ->> 'unit_price_cents')::int * (v_lines -> idx ->> 'qty')::int;
        v_share := floor(v_discount::numeric * v_line_total / v_eligible_total)::int;
        v_alloc := v_alloc + v_share;
        v_lines := jsonb_set(v_lines, array[idx::text, 'discount_cents'], to_jsonb(v_share));
        if v_line_total > v_largest then
          v_largest := v_line_total;
          v_largest_idx := idx;
        end if;
      end if;
    end loop;
    v_lines := jsonb_set(
      v_lines,
      array[v_largest_idx::text, 'discount_cents'],
      to_jsonb((v_lines -> v_largest_idx ->> 'discount_cents')::int + v_discount - v_alloc)
    );
  end if;

  v_free_from := coalesce((v_shipping ->> 'free_from_cents')::int, 0);
  if v_free_from > 0 and v_subtotal - v_discount >= v_free_from then
    v_ship_discount := v_ship;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'missing', v_missing,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'shipping_cents', v_ship,
    'shipping_discount_cents', v_ship_discount,
    'total_cents', v_subtotal - v_discount + v_ship - v_ship_discount,
    'promo', case when v_code is null then null else jsonb_build_object(
      'code', v_code,
      'id', case when v_reason is null then v_promo.id end,
      'ok', v_reason is null,
      'reason', v_reason,
      'type', v_promo.discount_type,
      'min_subtotal_cents', v_promo.min_subtotal_cents
    ) end
  );
end;
$$;

-- Публична оферта за количката — без имейл
create function public.quote_order(
  p_items jsonb,
  p_code text default null,
  p_shipping_method text default 'econt_office'
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.compute_quote(p_items, p_code, null, p_shipping_method);
$$;

-- ---------------------------------------------------------------- поръчка
create function public.place_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_order ->> 'email', '')));
  v_code text := nullif(upper(regexp_replace(coalesce(p_order ->> 'promo_code', ''), '\s', '', 'g')), '');
  v_method text := p_order ->> 'shipping_method';
  v_invoice jsonb := case when jsonb_typeof(p_order -> 'invoice') = 'object' then p_order -> 'invoice' end;
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
  if v_invoice is not null and (
    coalesce(v_invoice ->> 'eik', '') !~ '^[0-9]{9,13}$'
    or length(trim(coalesce(v_invoice ->> 'company', ''))) < 2
    or length(trim(coalesce(v_invoice ->> 'mol', ''))) < 3
  ) then
    raise exception 'INVALID_INVOICE';
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
    v_invoice,
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
    promo_code_id, promo_code, utm
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
    case when jsonb_typeof(p_order -> 'utm') = 'object' then p_order -> 'utm' end
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

-- Публични по замисъл: изчисляват всичко от базата и не връщат чужди данни
revoke execute on function private.compute_quote(jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function public.quote_order(jsonb, text, text) from public;
revoke execute on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.quote_order(jsonb, text, text) to anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;

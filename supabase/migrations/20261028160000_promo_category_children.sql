-- Промо код за категория важи и за всичките ѝ подкатегории
-- (продуктите са в подкатегориите, напр. „Периферия › Монитори“).
create or replace function private.compute_quote(
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
    select p.id, p.slug, p.name, p.sku, p.brand, p.category_id, c.parent_id as parent_category_id,
           p.is_promo, p.price_cents, p.images[1] as image,
           least(greatest(coalesce(it.qty, 1), 1), 99) as qty
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as it(product_id bigint, qty int)
    join public.products p on p.id = it.product_id and p.is_active and p.stock_status <> 'out_of_stock'
    left join public.categories c on c.id = p.category_id
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
          or r.parent_category_id = any (v_promo.scope_category_ids)
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

revoke execute on function private.compute_quote(jsonb, text, text, text) from public, anon, authenticated;

-- Имейли при поръчка: данните за писмото и запис в историята на поръчката.
-- Сайтът няма таен ключ, затова и двете функции изискват номер + имейл и работят само първия час след поръчката.

-- Артикулите и сумите за потвърждението (личните данни идват от формата за поръчка)
create function public.order_receipt(p_number text, p_email text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', o.number,
    'created_at', o.created_at,
    'subtotal_cents', o.subtotal_cents,
    'discount_cents', o.discount_cents,
    'shipping_cents', o.shipping_cents,
    'total_cents', o.total_cents,
    'promo_code', o.promo_code,
    'shipping_method', o.shipping_method,
    'payment_method', o.payment_method,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', i.name, 'sku', i.sku, 'qty', i.qty, 'unit_price_cents', i.unit_price_cents,
        'discount_cents', i.discount_cents, 'line_total_cents', i.line_total_cents
      ) order by i.id), '[]'::jsonb)
      from public.order_items i where i.order_id = o.id
    ),
    'raffles', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', r.slug, 'title', r.title, 'entries', e.entries)), '[]'::jsonb)
      from public.raffles r
      cross join lateral private.raffle_entries(r.id) e
      where r.status = 'active' and e.order_id = o.id and e.entries > 0
    )
  )
  from public.orders o
  where upper(o.number) = upper(trim(p_number))
    and lower(o.email) = lower(trim(p_email))
    and o.created_at > now() - interval '1 hour'
  limit 1;
$$;

revoke execute on function public.order_receipt(text, text) from public;
grant execute on function public.order_receipt(text, text) to anon, authenticated;

-- „Изпратен имейл“ в историята — по веднъж за вид, само първия час.
-- result: sent (изпратен), failed (грешка при изпращане), disabled (изпращането не е настроено)
create function public.log_order_email(p_number text, p_email text, p_kind text, p_result text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id bigint;
begin
  if p_kind not in ('confirmation', 'shop_alert') or p_result not in ('sent', 'failed', 'disabled') then
    raise exception 'INVALID_EMAIL_LOG';
  end if;

  select o.id into v_order_id
  from public.orders o
  where upper(o.number) = upper(trim(p_number))
    and lower(o.email) = lower(trim(p_email))
    and o.created_at > now() - interval '1 hour';
  if v_order_id is null then
    return;
  end if;

  if exists (
    select 1 from public.order_events e
    where e.order_id = v_order_id and e.type = 'email' and e.data ->> 'kind' = p_kind
  ) then
    return;
  end if;

  insert into public.order_events (order_id, type, data)
  values (v_order_id, 'email', jsonb_build_object('kind', p_kind, 'result', p_result));
end;
$$;

revoke execute on function public.log_order_email(text, text, text, text) from public;
grant execute on function public.log_order_email(text, text, text, text) to anon, authenticated;

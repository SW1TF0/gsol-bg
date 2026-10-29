-- Клиенти в админа: бележки и етикети, обобщение по поръчки, запитвания на клиента
-- и съгласие за маркетинг, което персоналът може само да оттегли.

alter table public.customers
  add column note text,
  add column tags text[] not null default '{}',
  add column marketing_opt_in_at timestamptz,
  add column updated_at timestamptz not null default now();

create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

-- Съгласието дава само клиентът (при поръчка, през place_order). Персоналът може само да отпише.
create function private.customers_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.marketing_opt_in and (tg_op = 'INSERT' or not old.marketing_opt_in) then
    if current_user in ('anon', 'authenticated') then
      raise exception 'CONSENT_ONLY_BY_CUSTOMER';
    end if;
    new.marketing_opt_in_at := now();
  elsif not new.marketing_opt_in then
    new.marketing_opt_in_at := null;
  end if;
  return new;
end;
$$;

create trigger customers_consent before insert or update of marketing_opt_in on public.customers
  for each row execute function private.customers_consent();

-- Персоналът променя само бележката, етикетите и съгласието (отписване)
revoke update on public.customers from anon, authenticated;
grant update (note, tags, marketing_opt_in) on public.customers to authenticated;

create policy "Продажби обновяват клиенти" on public.customers
  for update to authenticated
  using ((select private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[])))
  with check ((select private.is_staff(array['admin', 'manager', 'sales']::public.staff_role[])));

-- Обобщение за списъка; security_invoker — важат правата на служителя (RLS)
create view public.customer_stats with (security_invoker = true) as
select
  c.id, c.email, c.phone, c.first_name, c.last_name, c.company,
  c.marketing_opt_in, c.marketing_opt_in_at, c.note, c.tags, c.created_at,
  coalesce(s.orders_count, 0)::int as orders_count,
  coalesce(s.spent_cents, 0)::bigint as spent_cents,
  s.first_order_at,
  s.last_order_at
from public.customers c
left join lateral (
  select
    count(*) filter (where o.status not in ('cancelled', 'returned')) as orders_count,
    sum(o.total_cents) filter (where o.status not in ('cancelled', 'returned')) as spent_cents,
    min(o.created_at) as first_order_at,
    max(o.created_at) as last_order_at
  from public.orders o
  where o.customer_id = c.id
) s on true;

grant select on public.customer_stats to authenticated;
revoke select on public.customer_stats from anon;

-- Запитванията на клиента: по имейл или по последните 9 цифри на телефона
create function public.customer_inquiries(p_customer uuid)
returns setof public.inquiries
language sql
stable
security invoker
set search_path = ''
as $$
  select i.*
  from public.inquiries i
  join public.customers c on c.id = p_customer
  where lower(trim(i.contact)) = lower(c.email)
     or (
       length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 9
       and right(regexp_replace(i.contact, '\D', '', 'g'), 9) = right(regexp_replace(c.phone, '\D', '', 'g'), 9)
     )
  order by i.created_at desc
  limit 50;
$$;

revoke execute on function public.customer_inquiries(uuid) from public, anon;
grant execute on function public.customer_inquiries(uuid) to authenticated;

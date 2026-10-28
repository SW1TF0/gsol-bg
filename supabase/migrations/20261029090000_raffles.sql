-- Томболи: кампании, награди, участия от поръчки, теглене и победители.
-- Участията НЕ се пазят отделно — изчисляват се от поръчките в периода, затова
-- отказаните и върнатите поръчки отпадат автоматично.

create type public.raffle_status as enum ('draft', 'active', 'drawn', 'cancelled');

create table public.raffles (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  title text not null check (char_length(title) between 3 and 120),
  intro text check (char_length(intro) <= 400),
  rules text not null default '',
  image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.raffle_status not null default 'draft',
  -- Правила за участия
  min_order_cents int not null default 0 check (min_order_cents >= 0),
  base_entries int not null default 1 check (base_entries >= 0),
  per_amount_cents int check (per_amount_cents is null or per_amount_cents > 0),
  bonus_entries int not null default 0 check (bonus_entries >= 0),
  bonus_category_ids bigint[] not null default '{}',
  bonus_product_ids bigint[] not null default '{}',
  max_entries_per_order int check (max_entries_per_order is null or max_entries_per_order > 0),
  count_statuses public.order_status[] not null default '{confirmed,processing,shipped,delivered}',
  reserves_count int not null default 1 check (reserves_count between 0 and 20),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint raffle_period check (ends_at > starts_at)
);

create trigger raffles_touch before update on public.raffles
  for each row execute function public.touch_updated_at();

-- Всяка награда може да е в няколко бройки; местата се дават по реда на наградите
create table public.raffle_prizes (
  id bigint generated always as identity primary key,
  raffle_id bigint not null references public.raffles on delete cascade,
  position int not null default 0,
  title text not null check (char_length(title) between 2 and 120),
  description text check (char_length(description) <= 400),
  image_url text,
  quantity int not null default 1 check (quantity between 1 and 100)
);
create index raffle_prizes_raffle_idx on public.raffle_prizes (raffle_id, position);

create table public.raffle_winners (
  id bigint generated always as identity primary key,
  raffle_id bigint not null references public.raffles on delete cascade,
  order_id bigint references public.orders on delete set null,
  email text not null,
  display_name text not null,
  position int not null,
  is_reserve boolean not null default false,
  prize_id bigint references public.raffle_prizes on delete set null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (raffle_id, position)
);

-- Запис за проверка на тегленето: seed и списък с участията към момента
create table public.raffle_draws (
  raffle_id bigint primary key references public.raffles on delete cascade,
  seed text not null,
  participants int not null,
  total_entries int not null,
  snapshot jsonb not null,
  drawn_by uuid references auth.users on delete set null,
  drawn_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- участия
create function private.raffle_entries(p_raffle_id bigint)
returns table (
  order_id bigint,
  order_number text,
  email text,
  first_name text,
  last_name text,
  amount_cents int,
  entries int
)
language sql
stable
security definer
set search_path = ''
as $$
  with r as (
    select * from public.raffles where id = p_raffle_id
  ),
  o as (
    select o.id, o.number, lower(o.email) as email, o.first_name, o.last_name,
           o.subtotal_cents - o.discount_cents as amount
    from public.orders o
    cross join r
    where o.created_at >= r.starts_at
      and o.created_at < r.ends_at
      and o.status = any (r.count_statuses)
  ),
  bonus as (
    select i.order_id, sum(i.qty)::int as qty
    from public.order_items i
    join o on o.id = i.order_id
    join public.products p on p.id = i.product_id
    left join public.categories c on c.id = p.category_id
    cross join r
    where p.id = any (r.bonus_product_ids)
       or p.category_id = any (r.bonus_category_ids)
       or c.parent_id = any (r.bonus_category_ids)
    group by i.order_id
  )
  select o.id, o.number, o.email, o.first_name, o.last_name, o.amount,
         least(
           coalesce(r.max_entries_per_order, 1000000),
           r.base_entries
             + case when r.per_amount_cents is not null then o.amount / r.per_amount_cents else 0 end
             + coalesce(b.qty, 0) * r.bonus_entries
         )::int
  from o
  cross join r
  left join bonus b on b.order_id = o.id
  where o.amount >= r.min_order_cents;
$$;

revoke execute on function private.raffle_entries(bigint) from public, anon, authenticated;

-- Списък с участниците — само за мениджъри и администратори
create function public.raffle_participants(p_raffle_id bigint)
returns table (
  order_id bigint,
  order_number text,
  email text,
  first_name text,
  last_name text,
  amount_cents int,
  entries int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin', 'manager']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  return query
    select * from private.raffle_entries(p_raffle_id) e
    where e.entries > 0
    order by e.entries desc, e.order_id;
end;
$$;

revoke execute on function public.raffle_participants(bigint) from public, anon;
grant execute on function public.raffle_participants(bigint) to authenticated;

-- ---------------------------------------------------------------- теглене
create function public.draw_raffle(p_raffle_id bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_r public.raffles;
  v_seed text;
  v_total bigint;
  v_participants int;
  v_winners int;
  v_needed int;
  v_pick bigint;
  v_try int := 0;
  v_pos int := 0;
  v_taken text[] := '{}';
  v_row record;
  v_prize bigint;
begin
  if not private.is_staff(array['admin', 'manager']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_r from public.raffles where id = p_raffle_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_r.status <> 'active' then raise exception 'NOT_ACTIVE'; end if;
  if now() < v_r.ends_at then raise exception 'NOT_ENDED'; end if;

  select coalesce(sum(quantity), 0) into v_winners from public.raffle_prizes where raffle_id = p_raffle_id;
  if v_winners = 0 then raise exception 'NO_PRIZES'; end if;

  -- Участията с натрупана сума: всеки ред „покрива“ интервал от числа според участията си
  create temp table _raffle_entries on commit drop as
    select e.*, sum(e.entries) over (order by e.order_id) as cum
    from private.raffle_entries(p_raffle_id) e
    where e.entries > 0;

  select count(distinct t.email), coalesce(sum(t.entries), 0)
    into v_participants, v_total
  from _raffle_entries t;
  if v_total = 0 then raise exception 'NO_ENTRIES'; end if;

  -- Криптографски случаен seed; всяко теглене i е sha256(seed:i), така резултатът може да се провери
  v_seed := encode(extensions.gen_random_bytes(16), 'hex');
  v_needed := least(v_winners + v_r.reserves_count, v_participants);

  while v_pos < v_needed and v_try < 100000 loop
    v_pick := ('x' || substr(encode(extensions.digest(v_seed || ':' || v_try, 'sha256'), 'hex'), 1, 15))::bit(60)::bigint % v_total;
    v_try := v_try + 1;

    select * into v_row from _raffle_entries t where t.cum > v_pick order by t.cum limit 1;
    -- Един човек (имейл) печели само веднъж
    if v_row.email = any (v_taken) then
      continue;
    end if;
    v_taken := v_taken || v_row.email;
    v_pos := v_pos + 1;

    v_prize := null;
    if v_pos <= v_winners then
      select p.id into v_prize
      from public.raffle_prizes p
      cross join lateral generate_series(1, p.quantity) g
      where p.raffle_id = p_raffle_id
      order by p.position, p.id, g
      offset v_pos - 1
      limit 1;
    end if;

    insert into public.raffle_winners (raffle_id, order_id, email, display_name, position, is_reserve, prize_id)
    values (
      p_raffle_id,
      v_row.order_id,
      v_row.email,
      trim(v_row.first_name) || ' ' || upper(left(trim(v_row.last_name), 1)) || '.',
      v_pos,
      v_pos > v_winners,
      v_prize
    );
  end loop;

  insert into public.raffle_draws (raffle_id, seed, participants, total_entries, snapshot, drawn_by)
  select p_raffle_id, v_seed, v_participants, v_total,
         jsonb_agg(jsonb_build_object('order', t.order_number, 'entries', t.entries, 'cum', t.cum) order by t.order_id),
         (select auth.uid())
  from _raffle_entries t;

  update public.raffles set status = 'drawn' where id = p_raffle_id;

  return jsonb_build_object('seed', v_seed, 'participants', v_participants, 'total_entries', v_total, 'drawn', v_pos);
end;
$$;

revoke execute on function public.draw_raffle(bigint) from public, anon;
grant execute on function public.draw_raffle(bigint) to authenticated;

-- ---------------------------------------------------------------- публични данни
-- Страницата на томболата: награди, статистика и победители със скрити имена (без имейли)
create function public.get_raffle(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'slug', r.slug,
    'title', r.title,
    'intro', r.intro,
    'rules', r.rules,
    'image_url', r.image_url,
    'starts_at', r.starts_at,
    'ends_at', r.ends_at,
    'status', r.status,
    'min_order_cents', r.min_order_cents,
    'base_entries', r.base_entries,
    'per_amount_cents', r.per_amount_cents,
    'bonus_entries', r.bonus_entries,
    'has_bonus_items', cardinality(r.bonus_category_ids) + cardinality(r.bonus_product_ids) > 0,
    'max_entries_per_order', r.max_entries_per_order,
    'prizes', (
      select coalesce(jsonb_agg(jsonb_build_object('title', p.title, 'description', p.description, 'image_url', p.image_url, 'quantity', p.quantity) order by p.position, p.id), '[]'::jsonb)
      from public.raffle_prizes p where p.raffle_id = r.id
    ),
    'stats', (
      select jsonb_build_object('participants', count(distinct e.email), 'entries', coalesce(sum(e.entries), 0))
      from private.raffle_entries(r.id) e where e.entries > 0
    ),
    'winners', case when r.status = 'drawn' then (
      select coalesce(jsonb_agg(jsonb_build_object('position', w.position, 'name', w.display_name, 'prize', p.title) order by w.position), '[]'::jsonb)
      from public.raffle_winners w left join public.raffle_prizes p on p.id = w.prize_id
      where w.raffle_id = r.id and not w.is_reserve
    ) end,
    'seed', case when r.status = 'drawn' then (select d.seed from public.raffle_draws d where d.raffle_id = r.id) end
  )
  from public.raffles r
  where r.slug = p_slug and r.status in ('active', 'drawn');
$$;

revoke execute on function public.get_raffle(text) from public;
grant execute on function public.get_raffle(text) to anon, authenticated;

-- Предварителен преглед за количката: колко участия би донесла поръчка с тези продукти и сума
create function public.raffle_preview(p_amount_cents int, p_items jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', x.slug, 'title', x.title, 'entries', x.entries, 'min_order_cents', x.min_order_cents)), '[]'::jsonb)
  from (
    select r.slug, r.title, r.min_order_cents,
      case when p_amount_cents < r.min_order_cents then 0 else least(
        coalesce(r.max_entries_per_order, 1000000),
        r.base_entries
          + case when r.per_amount_cents is not null then p_amount_cents / r.per_amount_cents else 0 end
          + coalesce((
              select sum(least(greatest(coalesce(it.qty, 1), 1), 99))
              from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as it(product_id bigint, qty int)
              join public.products p on p.id = it.product_id
              left join public.categories c on c.id = p.category_id
              where p.id = any (r.bonus_product_ids)
                 or p.category_id = any (r.bonus_category_ids)
                 or c.parent_id = any (r.bonus_category_ids)
            ), 0) * r.bonus_entries
      ) end::int as entries
    from public.raffles r
    where r.status = 'active' and now() >= r.starts_at and now() < r.ends_at
  ) x;
$$;

revoke execute on function public.raffle_preview(int, jsonb) from public;
grant execute on function public.raffle_preview(int, jsonb) to anon, authenticated;

-- Проследяването на поръчка показва и участията в томболи
create or replace function public.track_order(p_number text, p_email text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', o.number,
    'status', o.status,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'total_cents', o.total_cents,
    'shipping_method', o.shipping_method,
    'payment_method', o.payment_method,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'line_total_cents', i.line_total_cents) order by i.id), '[]'::jsonb)
      from public.order_items i where i.order_id = o.id
    ),
    'raffles', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', r.slug, 'title', r.title, 'status', r.status, 'entries', e.entries)), '[]'::jsonb)
      from public.raffles r
      cross join lateral private.raffle_entries(r.id) e
      where r.status in ('active', 'drawn') and e.order_id = o.id and e.entries > 0
    )
  )
  from public.orders o
  where upper(o.number) = upper(trim(p_number))
    and lower(o.email) = lower(trim(p_email))
  limit 1;
$$;

-- ---------------------------------------------------------------- RLS
alter table public.raffles enable row level security;
alter table public.raffle_prizes enable row level security;
alter table public.raffle_winners enable row level security;
alter table public.raffle_draws enable row level security;

create policy "Активните томболи са публични" on public.raffles
  for select to anon, authenticated using (status in ('active', 'drawn') or (select private.is_staff()));
create policy "Мениджъри управляват томболи" on public.raffles
  for all to authenticated
  using ((select private.is_staff(array['admin', 'manager']::public.staff_role[])))
  with check ((select private.is_staff(array['admin', 'manager']::public.staff_role[])));

create policy "Наградите на публичните томболи са публични" on public.raffle_prizes
  for select to anon, authenticated using (
    exists (select 1 from public.raffles r where r.id = raffle_id and (r.status in ('active', 'drawn') or (select private.is_staff())))
  );
create policy "Мениджъри управляват награди" on public.raffle_prizes
  for all to authenticated
  using ((select private.is_staff(array['admin', 'manager']::public.staff_role[])))
  with check ((select private.is_staff(array['admin', 'manager']::public.staff_role[])));

-- Победителите (с имейли) и записът на тегленето са само за персонала
create policy "Служители виждат победителите" on public.raffle_winners
  for select to authenticated using ((select private.is_staff()));
create policy "Мениджъри отбелязват уведомени победители" on public.raffle_winners
  for update to authenticated
  using ((select private.is_staff(array['admin', 'manager']::public.staff_role[])))
  with check ((select private.is_staff(array['admin', 'manager']::public.staff_role[])));
create policy "Служители виждат тегленията" on public.raffle_draws
  for select to authenticated using ((select private.is_staff()));

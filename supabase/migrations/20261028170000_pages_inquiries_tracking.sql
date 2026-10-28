-- Информационни страници (редактират се от админа), запитвания от сайта и проследяване на поръчка.

-- ---------------------------------------------------------------- страници
create table public.pages (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (char_length(title) between 2 and 120),
  intro text check (char_length(intro) <= 400),
  body text not null default '',
  is_published boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();

alter table public.pages enable row level security;

create policy "Публикуваните страници са публични" on public.pages
  for select to anon, authenticated using (is_published or (select private.is_staff()));
create policy "Редактори пишат страници" on public.pages
  for all to authenticated
  using ((select private.is_staff(array['admin', 'manager', 'editor']::public.staff_role[])))
  with check ((select private.is_staff(array['admin', 'manager', 'editor']::public.staff_role[])));

-- ---------------------------------------------------------------- запитвания
create type public.inquiry_status as enum ('new', 'in_progress', 'done', 'spam');

create table public.inquiries (
  id bigint generated always as identity primary key,
  topic text not null check (topic in ('servis', 'profilaktika', 'video', 'nov-kompyutar', 'it', 'it-pregled', 'kontakti', 'drugo')),
  name text not null check (char_length(name) between 2 and 100),
  contact text not null check (char_length(contact) between 5 and 120),
  message text not null check (char_length(message) between 5 and 3000),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object' and pg_column_size(details) < 4000),
  source_url text check (char_length(source_url) <= 300),
  status public.inquiry_status not null default 'new',
  notes text check (char_length(notes) <= 5000),
  handled_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inquiries_status_idx on public.inquiries (status, created_at desc);

create trigger inquiries_touch before update on public.inquiries
  for each row execute function public.touch_updated_at();

alter table public.inquiries enable row level security;

-- Посетителите могат само да изпращат (не и да четат); служебните полета остават празни
create policy "Всеки може да изпрати запитване" on public.inquiries
  for insert to anon, authenticated
  with check (status = 'new' and notes is null and handled_by is null);
create policy "Служители четат запитвания" on public.inquiries
  for select to authenticated using ((select private.is_staff()));
create policy "Служители обработват запитвания" on public.inquiries
  for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- ---------------------------------------------------------------- проследяване на поръчка
-- Връща само статуса и продуктите, и само ако номерът и имейлът съвпадат.
create function public.track_order(p_number text, p_email text)
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
    )
  )
  from public.orders o
  where upper(o.number) = upper(trim(p_number))
    and lower(o.email) = lower(trim(p_email))
  limit 1;
$$;

revoke execute on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

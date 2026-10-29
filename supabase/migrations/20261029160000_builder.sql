-- Билдър на машини: части с доставни цени (само за екипа), връзка машина → части, прогони,
-- цена на машина в базата и публични функции за конфигуратора (без доставни цени и доставчици).
-- Параметрите на цената са в settings.builder_pricing и се попълват от админа — не са в кода.

create type public.part_kind as enum ('cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler');

create table public.components (
  id bigint generated always as identity primary key,
  kind public.part_kind not null,
  name text not null,
  brand text,
  part_number text,
  ean text,
  specs jsonb not null default '{}',
  cost_cents int not null check (cost_cents > 0),
  supplier text,
  lead_days int not null default 3 check (lead_days between 0 and 60),
  in_stock boolean not null default true,
  image_url text,
  is_sample boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index components_kind_idx on public.components (kind) where is_active and in_stock;
create trigger components_touch before update on public.components
  for each row execute function public.touch_updated_at();

create table public.machine_parts (
  product_id bigint not null references public.products on delete cascade,
  kind public.part_kind not null,
  component_id bigint not null references public.components on delete restrict,
  primary key (product_id, kind)
);
create index machine_parts_component_idx on public.machine_parts (component_id);

create table public.builder_runs (
  id bigint generated always as identity primary key,
  run_by uuid references auth.users on delete set null,
  mode text not null check (mode in ('dry', 'publish')),
  ok boolean not null,
  summary jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.products drop constraint products_source_check;
alter table public.products add constraint products_source_check
  check (source in ('manual', 'feed', 'woocommerce', 'builder'));

-- RLS: частите и прогоните — мениджъри и администратори; конфигураторът ползва функциите по-долу
alter table public.components enable row level security;
alter table public.machine_parts enable row level security;
alter table public.builder_runs enable row level security;

create policy "Мениджъри управляват частите" on public.components
  for all to authenticated
  using ((select private.is_staff(array['admin', 'manager']::public.staff_role[])))
  with check ((select private.is_staff(array['admin', 'manager']::public.staff_role[])));
create policy "Мениджъри управляват частите на машините" on public.machine_parts
  for all to authenticated
  using ((select private.is_staff(array['admin', 'manager']::public.staff_role[])))
  with check ((select private.is_staff(array['admin', 'manager']::public.staff_role[])));
create policy "Мениджъри виждат прогоните" on public.builder_runs
  for select to authenticated using ((select private.is_staff(array['admin', 'manager']::public.staff_role[])));
create policy "Мениджъри записват прогони" on public.builder_runs
  for insert to authenticated
  with check ((select private.is_staff(array['admin', 'manager']::public.staff_role[])) and run_by = (select auth.uid()));

-- ---------------------------------------------------------------- цена
-- Същата формула като src/lib/builder/pricing.ts; портата сравнява двете при всеки прогон.
create function private.machine_price(p_parts_cents int, p_line text)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb := (select s.value from public.settings s where s.key = 'builder_pricing');
  v_fixed int;
  v_warranty int;
  v_labor int;
  v_sub bigint;
  v_gross bigint;
  v_eur bigint;
  v_step int;
begin
  if v is null then
    raise exception 'PRICING_NOT_CONFIGURED';
  end if;
  select coalesce(sum(e.value::int), 0) into v_fixed from jsonb_each_text(v -> 'fixed_costs_cents') e;
  v_warranty := round(p_parts_cents * (v ->> 'warranty_pct')::numeric / 100);
  v_labor := greatest((v -> 'labor' ->> 'min_cents')::int, round(p_parts_cents * (v -> 'labor' ->> 'pct')::numeric / 100)::int);
  v_sub := p_parts_cents + v_fixed + v_warranty + (v -> 'markup_cents' ->> p_line)::int
    + coalesce((v -> 'line_addon_cents' ->> p_line)::int, 0) + v_labor;
  v_gross := ceil(v_sub / (1 - (v ->> 'payment_fee_pct')::numeric / 100));
  v_eur := ceil(v_gross / 100.0);
  v_step := case when v_eur <= (v -> 'rounding' ->> 'threshold_eur')::int
    then (v -> 'rounding' ->> 'small_step_eur')::int
    else (v -> 'rounding' ->> 'large_step_eur')::int end;
  return ((ceil((v_eur + 1)::numeric / v_step) * v_step - 1) * 100)::int;
end;
$$;

revoke execute on function private.machine_price(int, text) from public, anon, authenticated;

-- Цени на конфигурации: [{ line, parts: [id…] }] → [цена | null]. null — ако част липсва или не е налична.
-- Публична (за конфигуратора): връща само крайната цена, никога доставни цени.
create function public.price_builds(p_builds jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_build jsonb;
  v_out jsonb := '[]'::jsonb;
  v_ids bigint[];
  v_line text;
  v_sum bigint;
  v_found int;
begin
  if jsonb_typeof(p_builds) <> 'array' or jsonb_array_length(p_builds) > 1000 then
    raise exception 'INVALID_BUILDS';
  end if;
  for v_build in select * from jsonb_array_elements(p_builds) loop
    v_line := v_build ->> 'line';
    select array_agg(distinct x::bigint) into v_ids
    from jsonb_array_elements_text(coalesce(v_build -> 'parts', '[]'::jsonb)) x;
    if v_line not in ('office', 'basic', 'izbor', 'premium') or v_ids is null or cardinality(v_ids) > 8 then
      v_out := v_out || 'null'::jsonb;
      continue;
    end if;
    select coalesce(sum(c.cost_cents), 0), count(*) into v_sum, v_found
    from public.components c
    where c.id = any (v_ids) and c.is_active and c.in_stock;
    if v_found <> cardinality(v_ids) then
      v_out := v_out || 'null'::jsonb;
    else
      v_out := v_out || to_jsonb(private.machine_price(v_sum::int, v_line));
    end if;
  end loop;
  return v_out;
end;
$$;

revoke execute on function public.price_builds(jsonb) from public;
grant execute on function public.price_builds(jsonb) to anon, authenticated;

-- Частите за конфигуратора: само налични, без доставна цена, доставчик и кодове
create function public.configurator_parts()
returns table (id bigint, kind public.part_kind, name text, brand text, specs jsonb, image_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.name, c.brand, c.specs, c.image_url
  from public.components c
  where c.is_active and c.in_stock
  order by c.kind, c.name;
$$;

revoke execute on function public.configurator_parts() from public;
grant execute on function public.configurator_parts() to anon, authenticated;

-- Частите на публикувана машина — за „Промени тази конфигурация“
create function public.machine_build(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_object_agg(mp.kind, mp.component_id)
  from public.machine_parts mp
  join public.products p on p.id = mp.product_id
  where p.slug = p_slug and p.is_active and p.source = 'builder';
$$;

revoke execute on function public.machine_build(text) from public;
grant execute on function public.machine_build(text) to anon, authenticated;

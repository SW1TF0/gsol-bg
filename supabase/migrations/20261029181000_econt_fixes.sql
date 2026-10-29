-- Поправки след първия опит на работника:
-- 1. Заявките през API минават със safeupdate — UPDATE без WHERE се отказва. Състоянието е
--    един ред, затова навсякъде добавяме „where id“.
-- 2. Функцията изисква JWT (verify_jwt) — будилникът изпраща публичния anon ключ от econt_state.

alter table private.econt_state add column worker_key text;

create or replace function public.econt_set_access(p_username text, p_password text)
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
  update private.econt_state set test_requested = v_user <> '', test_ok = null, test_message = null where id;
end;
$$;

create or replace function public.econt_request(p_what text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin']::public.staff_role[]) then raise exception 'FORBIDDEN'; end if;
  if p_what = 'test' then
    update private.econt_state set test_requested = true where id;
  elsif p_what = 'sync' then
    update private.econt_state set sync_requested = true, sync_claimed_at = null where id;
  else
    raise exception 'INVALID_REQUEST';
  end if;
end;
$$;

create or replace function public.econt_worker_claim()
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
  update private.econt_state set ticked_at = now() where id;

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

  update private.econt_state set test_requested = false where id and test_requested returning true into v_test;

  update private.econt_state
  set sync_requested = false, sync_claimed_at = now()
  where id
    and (sync_requested or synced_at is null or synced_at < now() - interval '20 hours')
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

create or replace function public.econt_worker_test_done(p_ok boolean, p_message text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.econt_state set test_ok = p_ok, test_message = left(p_message, 300), tested_at = now() where id;
$$;

create or replace function public.econt_worker_sync_done(p_cities jsonb, p_offices jsonb, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Пазим старите списъци, ако Еконт върне грешка или подозрително малко записи
  if p_error is not null or jsonb_array_length(coalesce(p_cities, '[]')) < 100 or jsonb_array_length(coalesce(p_offices, '[]')) < 100 then
    update private.econt_state set sync_error = coalesce(p_error, 'Еконт върна непълни списъци.'), sync_claimed_at = null where id;
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

  update public.econt_cities c set offices = (select count(*) from public.econt_offices o where o.city_id = c.id)
  where true;
  update private.econt_state set synced_at = now(), sync_error = null, sync_claimed_at = null where id;
end;
$$;

create or replace function private.econt_wake()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s private.econt_state;
begin
  select * into s from private.econt_state;
  if s.worker_url is null or s.worker_key is null then return; end if;
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
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.worker_key),
      timeout_milliseconds := 60000
    );
  end if;
end;
$$;

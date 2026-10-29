-- Служители от админа: покани, роли, спиране на достъпа.
-- Всичко минава през функции само за администратори; таен ключ не е нужен.

alter table public.staff
  add column disabled_at timestamptz,
  add column added_by uuid references auth.users on delete set null,
  add column updated_at timestamptz not null default now();

create trigger staff_touch before update on public.staff
  for each row execute function public.touch_updated_at();

-- Спрян служител няма права никъде (всички RLS политики минават през is_staff)
create or replace function private.is_staff(roles public.staff_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid())
      and s.disabled_at is null
      and (roles is null or s.role = any (roles))
  );
$$;

-- Винаги поне един активен администратор. security definer — проверката вижда всички служители,
-- независимо кой прави промяната (иначе RLS би скрил админите от останалите).
create function private.staff_keep_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.staff where role = 'admin' and disabled_at is null) then
    raise exception 'LAST_ADMIN';
  end if;
  return null;
end;
$$;

create trigger staff_keep_admin after update or delete on public.staff
  for each statement execute function private.staff_keep_admin();

-- ---------------------------------------------------------------- покани
create table public.staff_invites (
  id bigint generated always as identity primary key,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.staff_role not null,
  display_name text,
  invited_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_user uuid references auth.users on delete set null
);
create unique index staff_invites_open_idx on public.staff_invites (lower(email)) where accepted_at is null;

alter table public.staff_invites enable row level security;
create policy "Админи виждат поканите" on public.staff_invites
  for select to authenticated using ((select private.is_staff(array['admin']::public.staff_role[])));
create policy "Админи отменят покани" on public.staff_invites
  for delete to authenticated using ((select private.is_staff(array['admin']::public.staff_role[])));

-- Дава роля на потребител (нов или спрян); общо за поканата и за одобрението
create function private.grant_staff(p_user uuid, p_role public.staff_role, p_name text, p_by uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.staff (user_id, role, display_name, added_by)
  values (p_user, p_role, nullif(trim(p_name), ''), p_by)
  on conflict (user_id) do update set
    role = excluded.role,
    display_name = coalesce(excluded.display_name, public.staff.display_name),
    disabled_at = null;
$$;

revoke execute on function private.grant_staff(uuid, public.staff_role, text, uuid) from public, anon, authenticated;

-- Покана от админа. Ако човекът вече има потвърден профил — ролята важи веднага.
-- Връща 'granted' или 'invited'.
create function public.invite_staff(p_email text, p_role public.staff_role, p_name text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
begin
  if not private.is_staff(array['admin']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  select u.id into v_user from auth.users u
  where lower(u.email) = v_email and u.email_confirmed_at is not null;

  if v_user is not null then
    perform private.grant_staff(v_user, p_role, p_name, (select auth.uid()));
    delete from public.staff_invites where lower(email) = v_email and accepted_at is null;
    return 'granted';
  end if;

  insert into public.staff_invites (email, role, display_name, invited_by)
  values (v_email, p_role, nullif(trim(p_name), ''), (select auth.uid()))
  on conflict (lower(email)) where accepted_at is null do update set
    role = excluded.role,
    display_name = excluded.display_name,
    invited_by = excluded.invited_by,
    created_at = now(),
    expires_at = now() + interval '14 days';
  return 'invited';
end;
$$;

revoke execute on function public.invite_staff(text, public.staff_role, text) from public, anon;
grant execute on function public.invite_staff(text, public.staff_role, text) to authenticated;

-- При потвърден имейл: отворена покана → роля. Грешка тук не бива да спира регистрацията.
create function private.accept_staff_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.staff_invites;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  begin
    select * into v_invite from public.staff_invites i
    where lower(i.email) = lower(new.email) and i.accepted_at is null and i.expires_at > now()
    limit 1;
    if v_invite.id is not null then
      perform private.grant_staff(new.id, v_invite.role, v_invite.display_name, v_invite.invited_by);
      update public.staff_invites set accepted_at = now(), accepted_user = new.id where id = v_invite.id;
    end if;
  exception when others then
    raise warning 'accept_staff_invite: %', sqlerrm;
  end;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function private.accept_staff_invite();

-- ---------------------------------------------------------------- списъци за админа
create function public.staff_members()
returns table (
  user_id uuid, email text, role public.staff_role, display_name text,
  created_at timestamptz, disabled_at timestamptz, last_sign_in_at timestamptz, is_self boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  return query
    select s.user_id, u.email::text, s.role, s.display_name, s.created_at, s.disabled_at, u.last_sign_in_at,
           s.user_id = (select auth.uid())
    from public.staff s
    join auth.users u on u.id = s.user_id
    order by s.disabled_at is not null, s.created_at;
end;
$$;

-- Регистрирани в /admin/vhod без роля и без покана — чакат одобрение
create function public.staff_pending_users()
returns table (user_id uuid, email text, created_at timestamptz, confirmed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff(array['admin']::public.staff_role[]) then
    raise exception 'FORBIDDEN';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.email_confirmed_at is not null
    from auth.users u
    where not exists (select 1 from public.staff s where s.user_id = u.id)
      and not exists (select 1 from public.customers c where c.user_id = u.id)
    order by u.created_at desc
    limit 50;
end;
$$;

revoke execute on function public.staff_members() from public, anon;
revoke execute on function public.staff_pending_users() from public, anon;
grant execute on function public.staff_members() to authenticated;
grant execute on function public.staff_pending_users() to authenticated;

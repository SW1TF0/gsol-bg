-- Страниците от сегашния gsol.bg на същите адреси:
-- 1. Статиите („Съвети“) живеят в pages с kind = 'post' — същият редактор в админа, адрес /<slug>.
--    Всяка статия има свой бутон за действие (cta) и дата на публикуване.
-- 2. Правните текстове носят версията на собственика (напр. „25.08.2026-1“) — показва се на страницата;
--    legal_versions продължава да пази отпечатъка при всяка промяна на текста.
-- 3. „Рекламации, гаранция и сервиз“ е на адреса на стария сайт; добавени са бисквитките, AI и сигурността.
-- Самото съдържание се зарежда от supabase/content/live-content.json (scripts/import-live-content.py).

alter table public.pages
  add column kind text not null default 'page' check (kind in ('page', 'post')),
  add column cta jsonb,
  add column published_at timestamptz,
  add column version_label text check (char_length(version_label) <= 40);

create index pages_posts on public.pages (published_at desc) where kind = 'post' and is_published;

update public.pages set slug = 'reklamacii-garanciya-serviz' where slug = 'garanciya';
update public.legal_versions set slug = 'reklamacii-garanciya-serviz' where slug = 'garanciya';

create or replace function private.record_legal_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last public.legal_versions;
begin
  if new.slug not in ('obshti-usloviya', 'poveritelnost', 'biskvitki', 'dostavka-i-plashtane', 'vrashtane-i-otkaz',
                      'reklamacii-garanciya-serviz', 'izpolzvane-na-ai', 'sigurnost') then
    return new;
  end if;
  select * into v_last from public.legal_versions where slug = new.slug order by version desc limit 1;
  if v_last.id is null or v_last.sha256 <> encode(extensions.digest(new.body, 'sha256'), 'hex') then
    insert into public.legal_versions (slug, version, title, body, sha256)
    values (new.slug, coalesce(v_last.version, 0) + 1, new.title, new.body, encode(extensions.digest(new.body, 'sha256'), 'hex'));
  end if;
  return new;
end;
$$;

-- „За нас“ е заменена от „Кои сме ние“ (/za-gsol)
update public.pages set is_published = false where slug = 'za-nas';

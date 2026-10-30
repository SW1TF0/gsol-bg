-- Отзивите в Google (оценка и брой) — пишат се на ръка от собственика; сайтът ги чете публично
insert into public.settings (key, value) values ('reviews', '{"rating": "", "count": 0}') on conflict (key) do nothing;

drop policy "Всички четат публичните настройки" on public.settings;
create policy "Всички четат публичните настройки" on public.settings
  for select to anon, authenticated
  using (key in ('company', 'shipping', 'bank', 'reviews'));

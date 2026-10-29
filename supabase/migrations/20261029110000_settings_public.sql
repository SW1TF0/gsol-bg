-- Настройки от админа: фирмени данни, доставка и банкова сметка.
-- Сайтът чете само тези три ключа; пишат само администраторите (политиката от init).

insert into public.settings (key, value) values
  ('company', '{
    "brand": "GSOL",
    "legal_name": "ГлобалНет Сървис Солюшънс ЕООД",
    "eik": "208548488",
    "vat": "BG208548488",
    "phone": "0898 570 500",
    "email": "contact.globalnetss@gmail.com",
    "address": "Кърджали, ул. „Булаир“ 35",
    "hours": "Пон–Пет 09:00–18:00",
    "socials": [
      {"name": "Facebook", "href": "https://www.facebook.com/profile.php?id=61594105307680"},
      {"name": "Instagram", "href": "https://www.instagram.com/gsol.bg/"},
      {"name": "TikTok", "href": "https://www.tiktok.com/@gsol.bg"}
    ]
  }')
on conflict (key) do nothing;

update public.settings set value = value || '{"bank_name": ""}' where key = 'bank' and not value ? 'bank_name';

create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

create policy "Всички четат публичните настройки" on public.settings
  for select to anon, authenticated
  using (key in ('company', 'shipping', 'bank'));

-- Цените на доставката влизат в сметката на всяка поръчка — пазим ги цели и разумни
alter table public.settings add constraint settings_shipping_valid check (
  key <> 'shipping' or (
    jsonb_typeof(value -> 'econt_office_cents') = 'number'
    and jsonb_typeof(value -> 'econt_address_cents') = 'number'
    and jsonb_typeof(value -> 'free_from_cents') = 'number'
    and (value ->> 'econt_office_cents')::numeric between 0 and 100000
    and (value ->> 'econt_address_cents')::numeric between 0 and 100000
    and (value ->> 'free_from_cents')::numeric between 0 and 10000000
    and (value ->> 'econt_office_cents')::numeric = trunc((value ->> 'econt_office_cents')::numeric)
    and (value ->> 'econt_address_cents')::numeric = trunc((value ->> 'econt_address_cents')::numeric)
    and (value ->> 'free_from_cents')::numeric = trunc((value ->> 'free_from_cents')::numeric)
  )
);

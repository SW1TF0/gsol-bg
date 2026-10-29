-- Затягане след Еконт:
-- 1. pg_net идва с права за anon/authenticated (заявки навън и отговорите им). Будилникът работи като
--    собственика, така че махаме каквото можем. Правата за PUBLIC са дадени от supabase_admin и остават —
--    това е стандартът на Supabase; схемата net не е в API-то, така че браузърът не стига до нея.
-- 2. Функциите за служители проверяват ролята сами, но по подразбиране са разрешени и за PUBLIC — махаме го.

revoke all on all functions in schema net from anon, authenticated;
revoke all on all tables in schema net from anon, authenticated;
revoke usage on schema net from anon, authenticated;

revoke execute on function public.econt_ship(bigint), public.econt_cancel(bigint), public.econt_refresh(bigint),
  public.econt_set_access(text, text), public.econt_request(text), public.econt_overview() from public;
grant execute on function public.econt_ship(bigint), public.econt_cancel(bigint), public.econt_refresh(bigint),
  public.econt_set_access(text, text), public.econt_request(text), public.econt_overview() to authenticated;

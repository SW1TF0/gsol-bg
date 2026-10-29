-- pg_net беше записан към схемата public (създаден без „with schema“) — пресъздаваме го в extensions.
-- Функциите му остават в схемата net (не е в API-то); правата, дадени от нас на anon/authenticated, махаме отново.

drop extension if exists pg_net;
create extension pg_net with schema extensions;

revoke all on all functions in schema net from anon, authenticated;
revoke all on all tables in schema net from anon, authenticated;
revoke usage on schema net from anon, authenticated;

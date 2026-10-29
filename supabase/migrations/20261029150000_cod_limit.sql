-- Наложеният платеж е плащане в брой — законовият лимит е 5 112,92 € (същото и в чекаута).
create function private.orders_cod_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_method = 'cod' and new.total_cents > 511292 then
    raise exception 'COD_LIMIT';
  end if;
  return new;
end;
$$;

create trigger orders_cod_limit before insert or update of payment_method, total_cents on public.orders
  for each row execute function private.orders_cod_limit();

-- Публичната страница на томболата показва за кои категории и продукти има бонус участия.
-- get_raffle връща и bonus_items: [{ name, href }] — категориите с връзка към каталога и активните продукти.

create or replace function public.get_raffle(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'slug', r.slug,
    'title', r.title,
    'intro', r.intro,
    'rules', r.rules,
    'image_url', r.image_url,
    'starts_at', r.starts_at,
    'ends_at', r.ends_at,
    'status', r.status,
    'min_order_cents', r.min_order_cents,
    'base_entries', r.base_entries,
    'per_amount_cents', r.per_amount_cents,
    'bonus_entries', r.bonus_entries,
    'has_bonus_items', cardinality(r.bonus_category_ids) + cardinality(r.bonus_product_ids) > 0,
    'bonus_items', (
      select coalesce(jsonb_agg(jsonb_build_object('name', b.name, 'href', b.href) order by b.kind, b.sort_order, b.name), '[]'::jsonb)
      from (
        select 1 as kind, coalesce(parent.sort_order, c.sort_order) * 1000 + c.sort_order as sort_order,
          case when parent.id is null then c.name else parent.name || ' › ' || c.name end as name,
          case when parent.id is null then '/katalog/' || c.slug else '/katalog/' || parent.slug || '?sub=' || c.slug end as href
        from public.categories c
        left join public.categories parent on parent.id = c.parent_id
        where c.id = any (r.bonus_category_ids) and c.is_active
        union all
        select 2, 0, p.name, '/produkt/' || p.slug
        from public.products p
        where p.id = any (r.bonus_product_ids) and p.is_active
      ) b
    ),
    'max_entries_per_order', r.max_entries_per_order,
    'prizes', (
      select coalesce(jsonb_agg(jsonb_build_object('title', p.title, 'description', p.description, 'image_url', p.image_url, 'quantity', p.quantity) order by p.position, p.id), '[]'::jsonb)
      from public.raffle_prizes p where p.raffle_id = r.id
    ),
    'stats', (
      select jsonb_build_object('participants', count(distinct e.email), 'entries', coalesce(sum(e.entries), 0))
      from private.raffle_entries(r.id) e where e.entries > 0
    ),
    'winners', case when r.status = 'drawn' then (
      select coalesce(jsonb_agg(jsonb_build_object('position', w.position, 'name', w.display_name, 'prize', p.title) order by w.position), '[]'::jsonb)
      from public.raffle_winners w left join public.raffle_prizes p on p.id = w.prize_id
      where w.raffle_id = r.id and not w.is_reserve
    ) end,
    'seed', case when r.status = 'drawn' then (select d.seed from public.raffle_draws d where d.raffle_id = r.id) end
  )
  from public.raffles r
  where r.slug = p_slug and r.status in ('active', 'drawn');
$$;

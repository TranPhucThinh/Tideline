-- User-selected visual style. Theme number is derived from the current cycle,
-- so no scheduled job or mutable theme counter is needed.
alter table public.profiles
  add column if not exists visual_style text not null default 'modern'
  check (visual_style in ('modern', 'skeuomorphic'));

create or replace function public.save_visual_style(p_visual_style text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_visual_style not in ('modern', 'skeuomorphic') or p_visual_style is null then
    raise exception 'Invalid visual style';
  end if;

  update public.profiles
  set visual_style = p_visual_style
  where id = auth.uid();
end;
$$;

revoke all on function public.save_visual_style(text) from public;
grant execute on function public.save_visual_style(text) to authenticated;

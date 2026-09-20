-- Make limit setting changes atomic and enforce append-only history.

drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "limit_settings insert own" on public.limit_settings;
drop policy if exists "limit_settings update own" on public.limit_settings;
drop policy if exists "limit_settings delete own" on public.limit_settings;

create or replace function public.save_limit_settings(
  p_default_limit numeric,
  p_day_start integer,
  p_effective_from date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_default_limit is null or p_default_limit <= 0 then
    raise exception 'default_limit must be positive';
  end if;
  if p_day_start is null or p_day_start < 1 or p_day_start > 31 then
    raise exception 'day_start must be between 1 and 31';
  end if;

  insert into public.profiles (id, default_limit, day_start)
  values (v_user_id, p_default_limit, p_day_start)
  on conflict (id) do update
    set default_limit = excluded.default_limit,
        day_start = excluded.day_start;

  insert into public.limit_settings (user_id, default_limit, day_start, effective_from)
  select v_user_id, p_default_limit, p_day_start, p_effective_from
  where not exists (
    select 1
    from public.limit_settings
    where user_id = v_user_id
      and default_limit = p_default_limit
      and day_start = p_day_start
      and effective_from = p_effective_from
  );
end;
$$;

revoke all on function public.save_limit_settings(numeric, integer, date) from public;
grant execute on function public.save_limit_settings(numeric, integer, date) to authenticated;

create or replace function public.mark_guide_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set guide_seen = true
  where id = auth.uid();
$$;

revoke all on function public.mark_guide_seen() from public;
grant execute on function public.mark_guide_seen() to authenticated;

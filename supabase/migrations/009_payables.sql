-- Independent salary-cycle obligations. No writes to the existing ledger tables.
begin;
create table if not exists public.payable_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null,
  day_start integer not null check (day_start between 1 and 31),
  default_income bigint check (default_income between 0 and 1000000000000),
  primary key(user_id, effective_from)
);
create table if not exists public.payable_incomes (
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_start date not null,
  amount bigint not null check (amount between 0 and 1000000000000),
  primary key(user_id, cycle_start)
);
create table if not exists public.payable_items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  provider text not null default '' check (length(provider) <= 120),
  note text not null default '' check (length(note) <= 1000),
  kind text not null check (kind in ('once','installment','subscription')),
  amount bigint not null check (amount between 1 and 1000000000000),
  first_due date not null check (first_due between '2000-01-01' and '2100-12-31'),
  count integer,
  estimated boolean not null default false,
  stop_from date,
  created_at timestamptz not null default now(),
  check ((kind = 'installment' and count between 1 and 600 and count is not null) or (kind <> 'installment' and count is null)),
  check (stop_from is null or kind = 'subscription'),
  unique(user_id, id)
);
create table if not exists public.payable_prices (
  user_id uuid not null,
  item_id uuid not null,
  from_sequence integer not null check (from_sequence between 0 and 1211),
  amount bigint not null check (amount between 1 and 1000000000000),
  primary key(item_id, from_sequence),
  foreign key(user_id, item_id) references public.payable_items(user_id, id) on delete cascade
);
create table if not exists public.payable_overrides (
  user_id uuid not null,
  item_id uuid not null,
  sequence integer not null check (sequence between 0 and 1211),
  amount bigint not null check (amount between 1 and 1000000000000),
  paid_on date,
  primary key(item_id, sequence),
  foreign key(user_id, item_id) references public.payable_items(user_id, id) on delete cascade
);
create index if not exists payable_items_owner on public.payable_items(user_id);
create index if not exists payable_prices_owner on public.payable_prices(user_id);
create index if not exists payable_overrides_owner on public.payable_overrides(user_id);

do $$ declare t text; begin
  foreach t in array array['payable_settings','payable_incomes','payable_items','payable_prices','payable_overrides'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_read on public.%I', t);
    execute format('create policy own_read on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

create or replace function public.payable_month_date(p_date date, p_offset integer)
returns date language sql immutable set search_path = '' as $$
  select (date_trunc('month', p_date)::date + make_interval(months => p_offset))::date
    + (least(extract(day from p_date)::integer,
      extract(day from date_trunc('month', p_date) + make_interval(months => p_offset + 1) - interval '1 day')::integer) - 1);
$$;

create or replace function public.payable_anchor(p_date date, p_day integer, p_offset integer)
returns date language sql immutable set search_path = '' as $$
  select (date_trunc('month', p_date)::date + make_interval(months => p_offset))::date
    + (least(p_day, extract(day from date_trunc('month', p_date) + make_interval(months => p_offset + 1) - interval '1 day')::integer) - 1);
$$;

create or replace function public.payable_period(p_date date, p_user uuid)
returns table(start_date date, end_date date) language plpgsql stable set search_path = '' as $$
declare s public.payable_settings; n date; revision date;
begin
  select * into s from public.payable_settings where user_id = p_user and effective_from <= p_date order by effective_from desc limit 1;
  if not found then raise exception 'Chưa thiết lập kỳ lương.' using errcode = '23514'; end if;
  start_date := public.payable_anchor(p_date, s.day_start, 0);
  if start_date > p_date then start_date := public.payable_anchor(p_date, s.day_start, -1); end if;
  start_date := greatest(start_date, s.effective_from);
  n := public.payable_anchor(start_date, s.day_start, 0);
  if n <= start_date then n := public.payable_anchor(start_date, s.day_start, 1); end if;
  select min(effective_from) into revision from public.payable_settings where user_id = p_user and effective_from > p_date;
  end_date := least(n, coalesce(revision, n)) - 1;
  return next;
end $$;

-- All writes are validated here, even when the RPC is called outside the web UI.
-- One user lock makes duplicate submits and concurrent price/payment changes atomic.
create or replace function public.mutate_payables(p_action text, p_payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid();
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  i public.payable_items;
  o public.payable_overrides;
  item_id uuid;
  seq integer;
  amount_value bigint;
  due_date date;
  paid_date date;
  effective date;
  start_day integer;
begin
  if u is null then raise exception 'Bạn cần đăng nhập.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 91009));
  if p_action = 'settings' then
    start_day := (p_payload->>'day_start')::integer;
    amount_value := (p_payload->>'income')::bigint;
    if start_day is null or start_day not between 1 and 31 or amount_value < 0 or amount_value > 1000000000000 then
      raise exception 'Ngày kỳ lương hoặc thu nhập không hợp lệ.' using errcode = '23514';
    end if;
    if exists(select 1 from public.payable_settings where user_id = u) then
      select end_date + 1 into effective from public.payable_period(today, u);
    else effective := '2000-01-01'; end if;
    insert into public.payable_settings values(u, effective, start_day, amount_value)
      on conflict(user_id, effective_from) do update set day_start = excluded.day_start, default_income = excluded.default_income;
    return;
  elsif p_action = 'income' then
    effective := (p_payload->>'cycle_start')::date;
    if effective is null or effective not between '2000-01-01' and '2100-12-31' or
       effective <> (select start_date from public.payable_period(effective, u)) then
      raise exception 'Kỳ lương không hợp lệ.' using errcode = '23514'; end if;
    amount_value := (p_payload->>'amount')::bigint;
    if amount_value is null then delete from public.payable_incomes where user_id = u and cycle_start = effective;
    else insert into public.payable_incomes values(u, effective, amount_value)
      on conflict(user_id, cycle_start) do update set amount = excluded.amount;
    end if;
    return;
  end if;
  item_id := (p_payload->>'id')::uuid;
  if item_id is null then raise exception 'Thiếu mã khoản.' using errcode = '23514'; end if;
  if p_action = 'create' then
    insert into public.payable_items(id,user_id,name,provider,note,kind,amount,first_due,count,estimated)
    values(item_id,u,trim(p_payload->>'name'),coalesce(p_payload->>'provider',''),coalesce(p_payload->>'note',''),
      p_payload->>'kind',(p_payload->>'amount')::bigint,(p_payload->>'first_due')::date,
      (p_payload->>'count')::integer,coalesce((p_payload->>'estimated')::boolean,false))
    on conflict(id) do nothing;
    if not exists(select 1 from public.payable_items where id = item_id and user_id = u) then
      raise exception 'Không tìm thấy khoản.' using errcode = 'P0002'; end if;
    return;
  end if;
  select * into i from public.payable_items where id = item_id and user_id = u for update;
  if not found then raise exception 'Không tìm thấy khoản.' using errcode = 'P0002'; end if;
  if p_action = 'delete' then
    if exists(select 1 from public.payable_overrides where payable_overrides.item_id = i.id and paid_on is not null) then
      raise exception 'Khoản có lịch sử thanh toán không thể xóa. Hãy ngừng gia hạn hoặc hoàn tác lần đánh dấu nhầm.' using errcode = '23514'; end if;
    delete from public.payable_items where id = i.id;
    return;
  elsif p_action = 'edit' then
    -- Schedule changes only for an unpaid one-off. Recurring edits use keyed overrides.
    if i.kind = 'once' and (p_payload ? 'first_due' or p_payload ? 'amount') then
      if exists(select 1 from public.payable_overrides where payable_overrides.item_id = i.id and paid_on is not null) then
        raise exception 'Không sửa lịch hoặc số tiền đã trả.' using errcode = '23514'; end if;
      update public.payable_items set first_due = coalesce((p_payload->>'first_due')::date, first_due),
        amount = coalesce((p_payload->>'amount')::bigint, amount) where id = i.id;
      delete from public.payable_overrides where payable_overrides.item_id = i.id;
    end if;
    update public.payable_items set name = trim(p_payload->>'name'), provider = coalesce(p_payload->>'provider',''),
      note = coalesce(p_payload->>'note',''), estimated = coalesce((p_payload->>'estimated')::boolean,estimated) where id = i.id;
    return;
  elsif p_action = 'stop' then
    if i.stop_from is not null then raise exception 'Khoản này đã được đặt lịch ngừng gia hạn.' using errcode = '23514'; end if;
    effective := (p_payload->>'stop_from')::date;
    if i.kind <> 'subscription' or effective is null or effective <= today or effective > '2100-12-31' then
      raise exception 'Chỉ ngừng khoản định kỳ từ một ngày trong tương lai.' using errcode = '23514'; end if;
    update public.payable_items set stop_from = effective where id = i.id;
    return;
  end if;
  seq := (p_payload->>'sequence')::integer;
  if seq is null or seq < 0 or seq > 1211 or (i.kind = 'once' and seq <> 0) or (i.kind = 'installment' and seq >= i.count) then
    raise exception 'Lần thanh toán không hợp lệ.' using errcode = '23514'; end if;
  due_date := public.payable_month_date(i.first_due, seq);
  select * into o from public.payable_overrides where payable_overrides.item_id = i.id and sequence = seq;
  if i.stop_from is not null and due_date >= i.stop_from and o.paid_on is null then
    raise exception 'Lần thanh toán này đã ngừng gia hạn.' using errcode = '23514'; end if;
  if p_action = 'undo' then
    update public.payable_overrides set paid_on = null where payable_overrides.item_id = i.id and sequence = seq;
    return;
  end if;
  if p_action = 'pay' and o.paid_on is not null then return; end if;
  if o.paid_on is not null then raise exception 'Không sửa số tiền đã thanh toán.' using errcode = '23514'; end if;
  amount_value := coalesce((p_payload->>'amount')::bigint, o.amount,
    (select amount from public.payable_prices where payable_prices.item_id = i.id and from_sequence <= seq order by from_sequence desc limit 1), i.amount);
  if amount_value is null or amount_value < 1 or amount_value > 1000000000000 then
    raise exception 'Số tiền không hợp lệ.' using errcode = '23514'; end if;
  if p_action = 'price' then
    if i.kind <> 'subscription' or due_date < today then raise exception 'Chỉ đổi giá các lần định kỳ từ hôm nay trở đi.' using errcode = '23514'; end if;
    delete from public.payable_prices where payable_prices.item_id = i.id and from_sequence >= seq;
    insert into public.payable_prices values(u,i.id,seq,amount_value);
  elsif p_action in ('amount','pay') then
    paid_date := case when p_action = 'pay' then (p_payload->>'paid_on')::date else null end;
    if p_action = 'pay' and (paid_date is null or paid_date > today or paid_date < '2000-01-01') then
      raise exception 'Ngày trả phải từ năm 2000 đến hôm nay.' using errcode = '23514'; end if;
    insert into public.payable_overrides values(u,i.id,seq,amount_value,paid_date)
      on conflict on constraint payable_overrides_pkey do update set amount = excluded.amount, paid_on = excluded.paid_on;
  else raise exception 'Thao tác không hợp lệ.' using errcode = '23514';
  end if;
end $$;

revoke all on function public.payable_month_date(date,integer) from public;
revoke all on function public.payable_anchor(date,integer,integer) from public;
revoke all on function public.payable_period(date,uuid) from public;
revoke all on function public.mutate_payables(text,jsonb) from public;
grant execute on function public.mutate_payables(text,jsonb) to authenticated;
commit;

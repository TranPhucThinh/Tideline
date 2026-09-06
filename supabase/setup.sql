-- Setup cho App quản lý chi tiêu hằng ngày
-- Chạy trong Supabase: SQL Editor
--
-- 1. Bảng profiles (hạn mức mặc định + ngày bắt đầu vòng của mỗi user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_limit numeric not null default 100000,
  day_start integer not null default 1 check (day_start between 1 and 31),
  guide_seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Bảng expenses (các khoản chi)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date);

-- 2a. Bảng incomes (các khoản thu — tiền user NHĀN, vd lương). Khoản thu được cộng
-- vào số dư hằng ngày: balance = limit - spent + income (xem app/src/lib/ledger.ts).
create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists incomes_user_date_idx on public.incomes (user_id, date);

-- 2b. Bảng limit_settings: LỊCH SỬ đổi cài đặt hạn mức / ngày bắt đầu vòng (append-only).
-- Mỗi lần user đổi -> INSERT 1 row mới với effective_from = ngày đổi. Khi tính ledger, tra
-- cứu giá trị theo TỪNG NGÀY (giá trị có effective_from <= ngày đó gần nhất) để cài đặt mới
-- chỉ áp dụng từ ngày đổi trở đi, các ngày đã qua giữ nguyên (non-retroactive). Xem
-- app/src/lib/settings.ts và migration 003.
create table if not exists public.limit_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  default_limit numeric not null,
  day_start integer not null check (day_start between 1 and 31),
  effective_from date not null,
  created_at timestamptz not null default now()
);

create index if not exists limit_settings_user_effective_idx
  on public.limit_settings (user_id, effective_from);

-- 3. Bật Row Level Security
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
alter table public.limit_settings enable row level security;

-- 4. Chính sách RLS: mỗi user chỉ truy cập dữ liệu của chính mình
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using ((select auth.uid()) = id);

drop policy if exists "expenses insert own" on public.expenses;
create policy "expenses insert own" on public.expenses
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "expenses select own" on public.expenses;
create policy "expenses select own" on public.expenses
  for select using ((select auth.uid()) = user_id);

drop policy if exists "expenses update own" on public.expenses;
create policy "expenses update own" on public.expenses
  for update using ((select auth.uid()) = user_id);

drop policy if exists "expenses delete own" on public.expenses;
create policy "expenses delete own" on public.expenses
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "incomes insert own" on public.incomes;
create policy "incomes insert own" on public.incomes
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "incomes select own" on public.incomes;
create policy "incomes select own" on public.incomes
  for select using ((select auth.uid()) = user_id);

drop policy if exists "incomes update own" on public.incomes;
create policy "incomes update own" on public.incomes
  for update using ((select auth.uid()) = user_id);

drop policy if exists "incomes delete own" on public.incomes;
create policy "incomes delete own" on public.incomes
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "limit_settings insert own" on public.limit_settings;
create policy "limit_settings insert own" on public.limit_settings
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "limit_settings select own" on public.limit_settings;
create policy "limit_settings select own" on public.limit_settings
  for select using ((select auth.uid()) = user_id);

drop policy if exists "limit_settings update own" on public.limit_settings;
create policy "limit_settings update own" on public.limit_settings
  for update using ((select auth.uid()) = user_id);

drop policy if exists "limit_settings delete own" on public.limit_settings;
create policy "limit_settings delete own" on public.limit_settings
  for delete using ((select auth.uid()) = user_id);

-- 5. Tự động tạo profile khi user mới đăng ký (default_limit = 100000)
-- + tạo 1 row limit_settings (lịch sử) để từ ngày đầu đã có.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, default_limit)
  values (new.id, 100000)
  on conflict (id) do nothing;

  insert into public.limit_settings (user_id, default_limit, day_start, effective_from)
  values (new.id, 100000, 1, now()::date)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5b. Backfill cho user ĐÃ TỒN TẠI trước khi có bảng limit_settings: tạo 1 row với
-- effective_from = ngày tạo tài khoản, lấy giá trị hiện tại của họ.
insert into public.limit_settings (user_id, default_limit, day_start, effective_from)
select p.id, p.default_limit, p.day_start, p.created_at::date
from public.profiles p
where not exists (
  select 1 from public.limit_settings ls where ls.user_id = p.id
);
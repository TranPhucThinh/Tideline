-- Setup cho App quản lý chi tiêu hằng ngày
-- Chạy trong Supabase: SQL Editor
--
-- 1. Bảng profiles (hạn mức mặc định + ngày bắt đầu vòng của mỗi user)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_limit numeric not null default 100000,
  day_start integer not null default 1 check (day_start between 1 and 31),
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

-- 3. Bật Row Level Security
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;

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

drop policy if exists "expenses delete own" on public.expenses;
create policy "expenses delete own" on public.expenses
  for delete using ((select auth.uid()) = user_id);

-- 5. Tự động tạo profile khi user mới đăng ký (default_limit = 100000)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, default_limit)
  values (new.id, 100000)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
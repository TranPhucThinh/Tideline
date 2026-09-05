-- Migration: thêm bảng incomes (khoản thu).
-- Chạy một lần trên project đã tồn tại. Bảng mirror'e bảng `expenses` — khoản thu được
-- cộng vào số dư hằng ngày (balance = limit - spent + income), xem
-- app/src/lib/ledger.ts / app/src/lib/cycle.ts.

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists incomes_user_date_idx on public.incomes (user_id, date);

-- Row Level Security: mỗi user chỉ đọc/ghi dữ liệu của chính mình (giống expenses)
alter table public.incomes enable row level security;

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
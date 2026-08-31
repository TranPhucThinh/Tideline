-- Migration: thêm bảng limit_settings lưu LỊCH SỬ thay đổi cài đặt hạn mức / ngày
-- bắt đầu vòng. Sửa bug non-retroactive.
--
-- VẤN ĐỀ: trước đây chương trình chỉ lưu `default_limit` / `day_start` hiện tại trong
-- `profiles` (giá trị duy nhất áp dụng cho mọi ngày). Khi user đổi giữa một vòng đang
-- chạy, lần load lại sẽ tính lại TOÀN BỘ ledger của vòng (kể cả ngày đã qua) bằng giá
-- trị mới -> sai với kỳ vọng "không tính lại (non-retroactive)".
--
-- FIX: `limit_settings` là bảng append-only (chỉ INSERT, không update row cũ). Mỗi lần
-- user đổi cài đặt -> INSERT 1 row mới với:
--   - default_limit / day_start : giá trị MỚI
--   - effective_from            : ngày đổi (YYYY-MM-DD)
-- Lúc tính ledger, tra cứu giá trị có `effective_from` <= ngày đang xét, áp dụng cho TỪNG
-- ngày riêng lẻ -> các ngày TRƯỚC ngày đổi giữ nguyên giá trị cũ, từ ngày đổi trở đi dùng
-- giá trị mới. Xem `app/src/lib/settings.ts` (createLimitLookups) và `computeCycleLedger`.

-- 1. Bảng limit_settings (append-only history)
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

-- 2. Row Level Security: mỗi user chỉ đọc/ghi dữ liệu của chính mình (giống profiles/expenses)
alter table public.limit_settings enable row level security;

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

-- 3. Cập nhật trigger tạo profile cho user MỚI: ngoài profiles, cũng tạo 1 row
-- limit_settings (effective_from = ngày tạo account) để từ ngày đầu đã có lịch sử.
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

-- 4. Backfill cho user ĐÃ TỒN TẠI (trước khi có bảng này): tạo 1 row limit_settings với
-- effective_from = ngày tạo tài khoản (profiles.created_at), lấy default_limit/day_start
-- hiện tại của họ. Chỉ backfill user chưa có row nào trong limit_settings.
insert into public.limit_settings (user_id, default_limit, day_start, effective_from)
select p.id, p.default_limit, p.day_start, p.created_at::date
from public.profiles p
where not exists (
  select 1 from public.limit_settings ls where ls.user_id = p.id
);
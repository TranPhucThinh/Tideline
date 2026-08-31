-- Migration: thêm cột day_start (ngày bắt đầu vòng chi tiêu) cho profile.
-- Chạy một lần trên project đã tồn tại (tạo trước khi có day_start).
-- Với bảng có sẵn dữ liệu, default 1 sẽ được gán cho các dòng hiện có.

alter table public.profiles
  add column if not exists day_start integer not null default 1 check (day_start between 1 and 31);
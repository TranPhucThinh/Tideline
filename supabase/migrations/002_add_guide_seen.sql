-- Migration: thêm cột guide_seen cho profile (đánh dấu user đã xem hướng dẫn lần đầu).
-- Chạy một lần trên project đã tồn tại. Với dòng sẵn có, default false
-- sẽ khiến hướng dẫn tự hiện một lần khi đăng nhập lại.

alter table public.profiles
  add column if not exists guide_seen boolean not null default false;
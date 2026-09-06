-- Migration: thêm RLS policy UPDATE bị thiếu cho bảng expenses.
--
-- Bảng `expenses` có chính sách insert/select/delete nhưng THIẾU "expenses update own"
-- (bảng incomes/limit_settings/profiles đều có). Hệ quả: khi user sửa khoản chi, PostgREST
-- nhận request và trả 204 (HTTP success) vì câu update khớp 1 row theo id, nhưng RLS chặn
-- việc cập nhật dữ liệu thật → giá trị KHÔNG được lưu vào DB. Client cập nhật state cục bộ
-- nên trông như đã sửa, nhưng khi reload (load lại từ DB phía server) thì trả về giá trị cũ.
--
-- Fix: thêm policy UPDATE cho phép mỗi user sửa dữ liệu của chính mình (giống các bảng khác).
-- Chạy một lần trên project đã tồn tại.

drop policy if exists "expenses update own" on public.expenses;
create policy "expenses update own" on public.expenses
  for update using ((select auth.uid()) = user_id);
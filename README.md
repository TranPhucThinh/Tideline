# Ứng dụng quản lý chi tiêu hằng ngày

Web app gọn giúp kiểm soát chi tiêu theo từng ngày bằng **hạn mức** mỗi ngày, tự động cộng dồn số dư/thiếu sang ngày kế tiếp — nhìn ngay hôm nay còn tiêu được bao nhiêu.

Stack: **SvelteKit + TailwindCSS + Supabase** (Postgres + Auth + RLS).

## Cài đặt & chạy

### 1. Cấu hình Supabase

1. Tạo project miễn phí tại [supabase.com](https://supabase.com).
2. Mở **Project Settings → API**, lấy **Project URL** và **anon public key**.
3. Copy `.env.example` thành `.env` và điền hai giá trị trên:

   ```sh
   cp .env.example .env
   ```

4. Mở **SQL Editor** trong Supabase và chạy **[`supabase/setup.sql`](./supabase/setup.sql)** — script này tạo bảng `profiles`/`expenses`, bật **RLS**, chính sách truy cập theo user, và **trigger** tự tạo profile (`default_limit = 100000`) khi có user mới đăng ký.

> Nếu Supabase chưa được cấu hình, app vẫn chạy và hiển thị trang hướng dẫn tại `/setup`.

### 2. Cài dependencies & chạy dev server

```sh
pnpm install
pnpm run dev
```

Mở `http://localhost:5173`.

### Các lệnh

| Lệnh | Mô tả |
|---|---|
| `pnpm run dev` | Chạy dev server (hot reload) |
| `pnpm run build` | Build production |
| `pnpm run preview` | Xem trước bản production |
| `pnpm run check` | Kiểm tra type + lỗi Svelte |
| `pnpm run test:ledger` | Chạy test logic hạn mức (schedule §3) |

## Logic hạn mức (quan trọng)

Xem [`src/lib/ledger.ts`](./src/lib/ledger.ts). Tính **một lần cho cả tháng** bằng vòng lặp tuần tự:

- Ngày 1 mỗi tháng: `hạn mức = defaultLimit` (reset, không cộng dồn từ tháng trước).
- Ngày N>1: `hạn mức = defaultLimit + số dư(ngày N-1)`.
- `số dư = hạn mức - tổng chi tiêu ngày đó` (có thể âm hoặc dương).

Mọi tính toán dùng ngày **giờ local của trình duyệt**, không dùng UTC (tránh lệch ngày).

## Cấu trúc dự án

```
src/
  lib/
    ledger.ts          # Core logic hạn mức
    money.ts           # Format tiền kiểu Việt Nam + parse input
    supabaseClient.ts  # Browser Supabase client (lazy)
    server/supabase.ts # Server Supabase client (SSR, cookie)
    env.ts / types.ts
  routes/
    +layout.*          # Root layout (font, css, session)
    (app)/             # Nhóm trang có đăng nhập + bottom nav
      +page.svelte     # "Hôm nay": hero số dư + thêm/xoá chi tiêu
      history/         # "Lịch sử": xem theo tháng
      stats/           # "Thống kê": tóm tắt / biểu đồ / danh sách theo tháng
      settings/        # "Cài đặt": đổi hạn mức + đăng xuất
    auth/login|signup  # Đăng nhập / đăng ký
    setup/             # Hướng dẫn cấu hình khi chưa có Supabase
supabase/setup.sql     # SQL tạo bảng + RLS + trigger
scripts/verify-ledger.mjs # Test tự kiểm logic hạn mức
```

## Deploy

Frontend SvelteKit dùng adapter `auto`: tự detect **Vercel/Netlify** khi deploy. Backend chạy trên Supabase Cloud (managed), không cần deploy riêng.

## Acceptance criteria

- [x] Đăng ký mới → tự động có `default_limit = 100000` (trigger SQL).
- [x] Nhập chi hôm nay → số "còn lại hôm nay" giảm đúng số tiền.
- [x] Xoá khoản chi → số dư tăng lại đúng.
- [x] Sang ngày mới → hạn mức mới = `defaultLimit + số dư hôm trước` (khớp ví dụ spec §3, đã kiểm bằng `test:ledger`).
- [x] Ngày 1 tháng mới → hạn mức reset về `defaultLimit` (đã kiểm).
- [x] User A không xem/sửa/xoá được dữ liệu user B (RLS theo `auth.uid()`).
- [x] Trang Lịch sử hiển thị đúng số liệu từng ngày (dùng cùng `computeMonthLedger`).
- [x] Đổi `default_limit` ở Cài đặt → áp dụng cho lần tính tiếp theo.
- [x] Form thêm chi có **chọn ngày** (mặc định hôm nay) để nhập bù các khoản chi của ngày trước.
- [x] Trang Thống kê (`/stats`): tóm tắt tháng + biểu đồ Chart.js (số dư/đã chi) + danh sách ngày.
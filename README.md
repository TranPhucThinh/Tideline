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

4. Mở **SQL Editor** trong Supabase và chạy **[`supabase/setup.sql`](./supabase/setup.sql)** — script này tạo bảng `profiles`/`expenses`/`incomes`/`limit_settings`, bật **RLS**, chính sách truy cập theo user, trigger chặn giao dịch tương lai, RPC cập nhật setting atomic, RPC lưu style giao diện, và trigger tự tạo profile (`default_limit = 100000`) khi có user mới đăng ký. Với project đã có dữ liệu, chạy thêm các migration theo thứ tự, mới nhất là `008_visual_style.sql`.

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
- `số dư = hạn mức - tổng chi tiêu + tổng khoản thu ngày đó` (có thể âm hoặc dương).

**Khoản thu (income):** cùng trong vòng chi tiêu, khoản thu (vd lương) được cộng vào số dư
hằng ngày — `balance = limit - spent + income`. Khoản thu mang du sang ngày kế tiếp qua
balance, nên nhân lương giúpa "còn lại hôm nay" và các ngày sau. Xem `src/lib/cycle.ts`.

Mọi tính toán dùng timezone nghiệp vụ **Asia/Ho_Chi_Minh**, không phụ thuộc timezone của browser hay server (tránh lệch ngày khi SSR/deploy ở UTC).

## Giao diện theo vòng chi tiêu

Trong **Cài đặt → Giao diện**, người dùng chọn một trong hai style: **Hiện tại** hoặc **Sổ tay** (skeuomorphic). Mỗi style có bốn theme; theme tự chuyển khi vòng chi tiêu mới bắt đầu và lặp lại sau bốn vòng. Theme đầu tiên được neo vào vòng chứa ngày tạo tài khoản, nên cùng tài khoản luôn thấy cùng theme trên các thiết bị. Style được lưu trong `profiles.visual_style`; với database đã tồn tại, cần chạy migration `008_visual_style.sql` để lưu lựa chọn.

## Cấu trúc dự án

```
src/
  lib/
    ledger.ts          # Logic hạn mức (theo tháng dương lịch — giữ làm chuẩn tham chiếu)
    cycle.ts           # Logic vòng chi tiêu (tổng quát hoá: ngày bắt đầu vòng user-set)
    money.ts           # Format tiền kiểu Việt Nam + parse input
    supabaseClient.ts  # Browser Supabase client (lazy)
    server/supabase.ts # Server Supabase client (SSR, cookie)
    env.ts / types.ts
  routes/
    +layout.*          # Root layout (font, css, session)
    (app)/             # Nhóm trang có đăng nhập + bottom nav
      +page.svelte     # "Hôm nay": hero số dư + thêm/xoá khoản chi & thu
      history/         # "Lịch sử": xem theo vòng
      stats/           # "Thống kê": tóm tắt / biểu đồ / danh sách theo vòng
      settings/        # "Cài đặt": đổi hạn mức + ngày bắt đầu vòng + đăng xuất
    auth/login|signup  # Đăng nhập / đăng ký
    setup/             # Hướng dẫn cấu hình khi chưa có Supabase
supabase/setup.sql     # SQL tạo bảng + RLS + trigger
supabase/migrations/   # Migration cho project đã có (vd thêm cột day_start)
scripts/verify-ledger.mjs # Test logic hạn mức (spec §3)
scripts/verify-cycle.mjs  # Test logic vòng chi tiêu
```

## Deploy

Frontend SvelteKit dùng adapter `auto`: tự detect **Vercel/Netlify** khi deploy. Backend chạy trên Supabase Cloud (managed), không cần deploy riêng.

## PWA

Ứng dụng có thể cài như một app độc lập trên điện thoại hoặc desktop. Sau khi deploy qua HTTPS,
mở Tideline bằng Chrome/Edge và chọn **Cài đặt ứng dụng**, hoặc trên iPhone/iPad chọn **Chia sẻ →
Thêm vào Màn hình chính**. Khi mất kết nối, các trang mới sẽ hiển thị trang ngoại tuyến; dữ liệu tài
khoản luôn cần Internet để đọc/ghi với Supabase và không bị service worker lưu vào cache.

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
- [x] Trang Thống kê (`/stats`): tóm tắt vòng + biểu đồ Chart.js (số dư/đã chi) + danh sách ngày.
- [x] **Khoản thu (income)**: trang Hôm nay có chọn "Chi tiêu / Thu"; khoản thu được cộng vào số dư hằng ngày (`balance = limit - spent + income`) và mang du sang ngày kế tiếp; hiển thị ở Lịch sử & Thống kê (upload tiêu/Thu, số dư tính cùng với khoản thu).
- [x] **Vòng chi tiêu tuỳ chỉnh**: đổi ngày bắt đầu vòng (1–31, mặc định 1 = tháng dương lịch) ở Cài đặt; toàn bộ Hôm nay/Lịch sử/Thống kê chuyển sang vòng đó (vd mùng 21 → mùng 20 tháng sau).

## Ghi chú về vòng chi tiêu

- `day_start` lưu trong `profiles` (mặc định `1` = theo tháng dương lịch, đúng spec).
- Logic tính rõ ràng trong [`src/lib/cycle.ts`](./src/lib/cycle.ts); kiểm bằng `pnpm run test:cycle`.
- **Project Supabase đã có dữ liệu**: sau khi cập nhật schema trên dashboard, chạy thêm `supabase/migrations/001_add_day_start.sql` để thêm cột `day_start` cho các profile cũ.

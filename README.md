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
| `pnpm run test:payables-view` | Kiểm tra hiển thị số dư sau quá hạn và ngữ cảnh kỳ đang sửa bằng dữ liệu mẫu |

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

Trong **Cài đặt → Giao diện**, người dùng chọn một trong hai style: **Hiện tại** hoặc **Nổi mềm** (skeuomorphic/soft UI). Nổi mềm dùng bề mặt pastel, bóng nổi và lõm, cùng điểm nhấn san hô; bốn theme là Sương xanh, Cát ấm, Ngọc dịu và Hồng phấn. Mỗi style có bốn theme; theme tự chuyển khi vòng chi tiêu mới bắt đầu và lặp lại sau bốn vòng. Theme đầu tiên được neo vào vòng chứa ngày tạo tài khoản, nên cùng tài khoản luôn thấy cùng theme trên các thiết bị. Style được lưu trong `profiles.visual_style`; với database đã tồn tại, cần chạy migration `008_visual_style.sql` để lưu lựa chọn.

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

## Khoản phải trả

Mục **Phải trả** (`/payables`) quản lý các giao dịch trả sau một lần, trả góp hữu hạn và
subscription hàng tháng. Dữ liệu, kỳ lương và thu nhập dự kiến độc lập hoàn toàn với thu chi.
Đánh dấu đã trả không tạo khoản chi trong ledger hiện tại.

**Database đã có:** chạy `supabase/migrations/009_payables.sql` trong Supabase SQL Editor
trước khi sử dụng. Database mới dùng `supabase/setup.sql`, đã bao gồm migration này.
Khi chưa có migration hoặc tải lỗi, trang báo lỗi rõ ràng thay vì hiển thị tổng bằng 0.

- Thiết lập ngày bắt đầu kỳ lương và thu nhập dự kiến (có thể để trống hoặc nhập 0).
- Thêm từng giao dịch; trả góp nhập số lần còn lại, định kỳ tự chiếu lịch hàng tháng.
- Ngày 29–31 được chặn ở cuối tháng ngắn, rồi trở về ngày gốc vào tháng tiếp theo.
- Cài đặt kỳ lương mới áp dụng từ kỳ kế tiếp, với kỳ chuyển tiếp liên tục, không đổi lịch sử.
- Chỉnh thu nhập riêng từng kỳ; để trống sẽ trở về mặc định.
- Tổng nghĩa vụ vẫn gồm phần đã trả. “Còn lại dự kiến” là thu nhập trừ tổng nghĩa vụ,
  chưa trừ sinh hoạt. Khoản quá hạn kỳ trước được hiển thị riêng, không cộng trùng.
- Kỳ đã kết thúc hiển thị tình trạng thanh toán tại cuối kỳ. Chi tiết khoản hiển thị trạng thái hiện tại.
- Có chỉnh tiền từng lần, ghi nhận/hoàn tác trả toàn bộ, đổi giá định kỳ và ngừng gia hạn tương lai.
- Mô phỏng cắt giảm chỉ tính khoản định kỳ chưa trả trong kỳ tới, không sửa dữ liệu thật.
- Tiền tệ VND; khoản ngoại tệ nhập ước tính. Chỉ cảnh báo trong app, chưa có push/email,
  kết nối ngân hàng, tự hủy dịch vụ, tính lãi/phí hoặc thanh toán một phần.

Logic: `src/lib/payables/domain.ts`; giao diện và endpoint: `src/routes/(app)/payables/`.
Database chỉ cho authenticated đọc qua RLS; mọi ghi đi qua RPC `mutate_payables`, kiểm tra
chủ sở hữu và khóa giao dịch theo user. Lịch được tính từ ngày gốc, không cần cron; thanh toán
và chỉnh riêng có khóa `(item_id, sequence)` để không ghi trùng.

Kiểm thử logic: `npm run test:payables` (cũng nằm trong `npm test`). Kiểm thử PostgreSQL:
chạy `scripts/verify-payables-db.sql` bằng psql trên database **thử nghiệm riêng** đã có
schema `auth.users`, `auth.uid()`, role `authenticated` và migration 009. Bộ thử dùng hai
user giả, kiểm tra RPC/RLS rồi rollback; không chạy trên database production.

Kiểm thử giao diện: `node scripts/verify-payables-ui.mjs` khi có Playwright. Có thể đặt
`PLAYWRIGHT_MODULE` trỏ tới module Playwright có sẵn và `CHROME_PATH` tới Chrome đã cài.
Bộ thử dựng page Svelte thật với dữ liệu giả, kiểm tra form, giữ nội dung khi lỗi,
thanh toán/hoàn tác, mô phỏng và bố cục mobile; không truy cập tài khoản thật.

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

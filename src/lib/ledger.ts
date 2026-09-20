/**
 * Core logic — quy tắc hạn mức (quan trọng nhất của app).
 *
 * Dùng timezone nghiệp vụ của ứng dụng (Asia/Ho_Chi_Minh), không phụ thuộc timezone
 * của browser/server. Mọi giá trị ngày được biểu diễn là chuỗi `YYYY-MM-DD`.
 */

import { todayKey as configuredTodayKey, toDateKey } from './date.ts';

export interface LedgerRow {
	date: string; // 'YYYY-MM-DD' local
	day: number; // 1..31
	month: number; // 1..12
	year: number;
	limit: number; // hạn mức ngày hôm đó
	spent: number; // tổng chi tiêu ngày hôm đó
	income: number; // tổng khoản thu ngày hôm đó (0 nếu không có)
	balance: number; // limit - spent + income
}

/** Bối cảnh thời điểm "hiện tại" theo giờ local. Tách ra để dễ mock date trong test/UI. */
function todayParts(): { year: number; month: number; day: number } {
	const [year, month, day] = configuredTodayKey().split('-').map(Number);
	return {
		year,
		month,
		day
	};
}

/** Số ngày trong một tháng (local, không UTC — dùng Date constructor theo local). */
export function daysInMonth(year: number, month: number): number {
	// month là 1..12; new Date(year, month, 0) = ngày cuối tháng (0 nghĩa là hôm trước ngày 1 của tháng sau)
	return new Date(year, month, 0).getDate();
}

export { toDateKey } from './date.ts';

/** Lấy key `YYYY-MM-DD` local của hôm nay. */
export function todayKey(): string {
	return configuredTodayKey();
}

export interface MonthKey {
	year: number;
	month: number; // 1..12
}

/** Key của tháng hiện tại (local). */
export function currentMonth(): MonthKey {
	const t = todayParts();
	return { year: t.year, month: t.month };
}

/** Serialize MonthKey thành `YYYY-MM`. */
export function monthKeyToString(k: MonthKey): string {
	return `${k.year}-${String(k.month).padStart(2, '0')}`;
}

/** Parse `YYYY-MM` thành MonthKey; trả null nếu không hợp lệ. */
export function parseMonthKey(s: string): MonthKey | null {
	const m = /^(\d{4})-(\d{2})$/.exec(s);
	if (!m) return null;
	const year = Number(m[1]);
	const month = Number(m[2]);
	if (month < 1 || month > 12) return null;
	return { year, month };
}

/** Chuyển MonthKey about (+/- n tháng). */
export function addMonths(key: MonthKey, n: number): MonthKey {
	// dùng (year*12 + monthIndex + n) rồi chia ra
	const idx = key.year * 12 + (key.month - 1) + n;
	const year = Math.floor(idx / 12);
	const month = (idx % 12) + 1;
	return { year, month };
}

/** So sánh thứ tự 2 MonthKey. */
export function monthIsAfter(a: MonthKey, b: MonthKey): boolean {
	if (a.year !== b.year) return a.year > b.year;
	return a.month > b.month;
}

export interface LedgerInput {
	year: number;
	month: number;
	/**
	 * Hàm tra cứu default_limit theo TỪNG NGÀY (non-retroactive). Với vòng = tháng dương
	 * lịch (dayStart=1), mỗi ngày tra cứu giá trị có hiệu lực tại chính ngày đó, nên ngày
	 * trước ngày đổi giữ nguyên hạn mức cũ, từ ngày đổi dùng giá trị mới. Xem `settings.ts`.
	 */
	defaultLimitForDate: (date: string) => number;
	/** map dateKey -> tổng chi tiêu ngày đó (số dương). Có thể chứa cả ngày ngoài tháng; sẽ bỏ qua. */
	spentByDate: Record<string, number>;
	/**
	 * map dateKey -> tổng khoản thu ngày đó (số dương). Khoản thu được cộng vào số dư:
	 * balance = limit - spent + income. Nếu không gi (vd test cũ), mặc ảo {}.
	 */
	incomeByDate?: Record<string, number>;
}

/**
 * Tính toàn bộ ledger cho 1 tháng, tuần tự từ ngày 1 đến hết tháng (một lần duy nhất bằng reduce/vòng lặp).
 *
 * Quy tắc:
 *  - Ngày 1: limit = defaultLimitForDate(ngày 1)
 *  - Ngày N>1: limit = defaultLimitForDate(ngày N) + balance(N-1)
 *  - balance = limit - spent + income
 */
export function computeMonthLedger(input: LedgerInput): LedgerRow[] {
	const { year, month, defaultLimitForDate, spentByDate, incomeByDate = {} } = input;
	const rows: LedgerRow[] = [];
	const nDays = daysInMonth(year, month);
	let previousBalance = 0;

	for (let day = 1; day <= nDays; day++) {
		const date = toDateKey(year, month, day);
		const base = defaultLimitForDate(date);
		const limit =
			day === 1 ? base : base + previousBalance;
		const spent = spentByDate[date] ?? 0;
		const income = incomeByDate[date] ?? 0;
		const balance = limit - spent + income;
		rows.push({ date, day, month, year, limit, spent, income, balance });
		previousBalance = balance;
	}
	return rows;
}

/** Lấy số dư của 1 ngày cụ thể từ ledger đã tính. */
export function balanceForDay(rows: LedgerRow[], date: string): number | undefined {
	return rows.find((r) => r.date === date)?.balance;
}

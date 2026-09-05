/**
 * Logic vòng chi tiêu (cycle) — tổng quát hoá luật hạn mức của spec mục 3.
 *
 * Mặc định (dayStart = 1) tương đương "mỗi chu kỳ = một tháng dương lịch", đúng như spec.
 * Khi user đặt dayStart = S (vd 21), mỗi vòng chạy từ ngày start (gọi là "ngày reset")
 * đến hết ngày trước ngày reset của vòng kế tiếp. Luật hạn mức giữ nguyên nhưng điểm
 * reset dịch chuyển tới ngày start của vòng.
 */

import { daysInMonth, toDateKey } from './ledger.ts';

/**
 * Kiểu hàm tra cứu ngày bắt đầu vòng theo 1 ngày. Thay vì nhận một `dayStart: number`
 * cố định, chương trình dùng hàm này để tra cứu giá trị `day_start` có hiệu lực tại từng
 * ngày (từ lịch sử `limit_settings`). Hoá ra yêu cầu non-retroactive cho ranh giới vòng.
 */
export type DayStartLookup = (date: string) => number;

export interface CycleBound {
	start: string; // 'YYYY-MM-DD' — ngày reset của vòng
	end: string; // 'YYYY-MM-DD' — ngày cuối của vòng (bao gồm)
}

/** Ngày reset của tháng (Y,M) theo dayStart: min(daysInMonth, S). */
export function cycleStartDayOfMonth(year: number, month: number, dayStart: number): number {
	return Math.min(daysInMonth(year, month), dayStart);
}

/**
 * Ngày reset của tháng (Y,M) dựa trên `day_start` CÓ HIỆU LỰC tại tháng đó.
 *
 * LƯU Ý (quyết định option "a" — an toàn, không làm xáo trộn dữ liệu đang xem):
 * ta lấy `day_start` có hiệu lực tại NGÀY MỒNG 1 của tháng làm neo cho ranh giới vòng
 * của tháng đó. Hệ quả khi user đổi `day_start` GIỮA vòng đang chạy:
 *   - Vòng đang chạy (bắt đầu trước ngày đổi) GIỮ NGUYÊN ranh giới cũ, vì ngày mồng 1
 *     của tháng chứa vòng đó vẫn ánh xạ sang giá trị cũ -> đúng option (a).
 *   - Giá trị `day_start` mới chỉ bắt đầu ảnh hưởng từ vòng kế tiếp mà ngày mồng 1 của
 *     tháng của nó đã chuyển sang giá trị mới.
 * Không chọn option (b) (đổi ranh giới ngay lập tức, cắt ngắn/kéo dài vòng hiện tại) vì
 * khó hiểu với user và dễ sai lệch dữ liệu.
 */
function cycleStartDayOfMonthFor(dayStartForDate: DayStartLookup, year: number, month: number): number {
	const anchor = toDateKey(year, month, 1);
	return cycleStartDayOfMonth(year, month, dayStartForDate(anchor));
}

/**
 * Xác định vòng chứa ngày `date` (YYYY-MM-DD).
 * Vòng bắt đầu tại thời điểm "ngày reset" gần nhất (≤ date) trong chuỗi các tháng.
 * `dayStartForDate` dùng để tra cứu `day_start` có hiệu lực tại từng tháng (xem
 * `cycleStartDayOfMonthFor`).
 */
export function cycleOf(date: string, dayStartForDate: DayStartLookup): CycleBound {
	// Hỗ trợ gọi trực tiếp với 1 số (từ code cũ/test): bọc thành hàm hằng.
	const lookup =
		typeof dayStartForDate === 'number' ? () => dayStartForDate : dayStartForDate;
	const [y, m, d] = date.split('-').map(Number);
	// Bước lùi dần sang các tháng trước để tìm ngày reset ≤ date.
	let cy = y;
	let cm = m;
	// Điểm reset tháng hiện tại (nếu ≤ date thì tháng này chứa reset của vòng dữ liệu)
	let start: string | null = null;
	let iterations = 0;
	while (iterations < 72) {
		// Nếu tháng cm trước đó
		const sd = cycleStartDayOfMonthFor(lookup, cy, cm);
		const candidate = toDateKey(cy, cm, sd);
		if (candidate <= date) {
			start = candidate;
			break;
		}
		// lùi 1 tháng
		if (cm === 1) {
			cm = 12;
			cy -= 1;
		} else {
			cm -= 1;
		}
		iterations++;
	}
	// Dự phòng: nếu không tìm được (không nên xảy ra), dùng ngày đó làm start.
	const cycleStart = start ?? date;
	// end = ngày trước ngày reset của vòng kế tiếp
	const next = nextCycleStart(cycleStart, lookup);
	const end = shiftDays(next, -1);
	return { start: cycleStart, end };
}

/** Tính ngày reset của vòng kế tiếp sau `cycleStart`. */
function nextCycleStart(cycleStart: string, dayStartForDate: DayStartLookup): string {
	const [y, m, d] = cycleStart.split('-').map(Number);
	// vòng kế tiếp nằm ở tháng sau
	let ny = y;
	let nm = m + 1;
	if (nm > 12) {
		nm = 1;
		ny += 1;
	}
	const sd = cycleStartDayOfMonthFor(dayStartForDate, ny, nm);
	return toDateKey(ny, nm, sd);
}

/** Dịch chuyển ngày 'YYYY-MM-DD' (local) đi n ngày (có thể âm). */
export function shiftDays(date: string, n: number): string {
	const [y, m, d] = date.split('-').map(Number);
	const dt = new Date(y, m - 1, d + n);
	return toDateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/** Vòng tiếp theo / vòng trước của một vòng. */
export function prevCycle(bound: CycleBound, dayStartForDate: DayStartLookup): CycleBound {
	const [y, m, d] = bound.start.split('-').map(Number);
	// vòng trước = vòng chứa ngày trước ngày start hiện tại
	return cycleOf(shiftDays(bound.start, -1), dayStartForDate);
}
export function nextCycle(bound: CycleBound, dayStartForDate: DayStartLookup): CycleBound {
	return cycleOf(shiftDays(bound.end, 1), dayStartForDate);
}

export interface CycleLedgerRow {
	date: string; // 'YYYY-MM-DD'
	day: number; // ngày trong tháng dương lịch (1..31)
	cycleDay: number; // ngày thứ mấy trong vòng (1..)
	limit: number;
	spent: number;
	income: number; // tổng khoản thu ngày đó (0 nếu không có)
	balance: number;
}

/**
 * Kiểu hàm tra cứu `default_limit` theo TỪNG ngày (từ lịch sử `limit_settings`). Đây là
 * phần cốt lõi của fix non-retroactive: thay hằng số `defaultLimit` bằng hàm này ở từng
 * bước lặp, để các ngày TRƯỚC ngày đổi giữ nguyên hạn mức cũ, từ ngày đổi trở đi dùng
 * giá trị mới.
 */
export type DefaultLimitLookup = (date: string) => number;

/**
 * Tính ledger đầy đủ cho 1 vòng, tuần tự từ start đến end (một lần).
 * Reset tại ngày start: limit = defaultLimitForDate(start);
 * các ngày sau = defaultLimitForDate(cur) + balance(trước).
 *
 * NON-RETROACTIVE: vì mỗi ngày tra cứu `default_limit` riêng theo ngày đó, nếu user đổi
 * `default_limit` giữa vòng thì: ngày trước ngày đổi &rarr; giá trị cũ; từ ngày đổi
 * trở đi &rarr; giá trị mới (do balance của các ngày sau mang theo phần lệch).
 */
export function computeCycleLedger(
	bound: CycleBound,
	defaultLimitForDate: DefaultLimitLookup,
	spentByDate: Record<string, number>,
	incomeByDate?: Record<string, number>
): CycleLedgerRow[] {
	const lookup =
		typeof defaultLimitForDate === 'number' ? () => defaultLimitForDate : defaultLimitForDate;
	const incomeMap = incomeByDate ?? {};
	const rows: CycleLedgerRow[] = [];
	let cur = bound.start;
	let cycleDay = 1;
	let previousBalance = 0;

	while (cur <= bound.end) {
		const [ty, tm, td] = cur.split('-').map(Number);
		const base = lookup(cur);
		const limit = cycleDay === 1 ? base : base + previousBalance;
		const spent = spentByDate[cur] ?? 0;
		const income = incomeMap[cur] ?? 0;
		const balance = limit - spent + income;
		rows.push({
			date: cur,
			day: td,
			cycleDay,
			limit,
			spent,
			income,
			balance
		});
		previousBalance = balance;
		cur = shiftDays(cur, 1);
		cycleDay++;
	}
	return rows;
}

/** Ngày hôm nay 'YYYY-MM-DD' theo giờ local. */
export function todayKey(): string {
	const d = new Date();
	return toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Vòng hiện tại (chứa hôm nay) theo giờ local. */
export function currentCycle(dayStartForDate: DayStartLookup): CycleBound {
	return cycleOf(todayKey(), dayStartForDate);
}

function currentDateKey(): string {
	return todayKey();
}

/** So sánh thứ tự 2 ngày 'YYYY-MM-DD'. */
export function dateIsAfter(a: string, b: string): boolean {
	return a > b;
}
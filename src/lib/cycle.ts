/**
 * Logic vòng chi tiêu (cycle) — tổng quát hoá luật hạn mức của spec mục 3.
 *
 * Mặc định (dayStart = 1) tương đương "mỗi chu kỳ = một tháng dương lịch", đúng như spec.
 * Khi user đặt dayStart = S (vd 21), mỗi vòng chạy từ ngày start (gọi là "ngày reset")
 * đến hết ngày trước ngày reset của vòng kế tiếp. Luật hạn mức giữ nguyên nhưng điểm
 * reset dịch chuyển tới ngày start của vòng.
 */

import { daysInMonth, toDateKey } from './ledger.ts';

export interface CycleBound {
	start: string; // 'YYYY-MM-DD' — ngày reset của vòng
	end: string; // 'YYYY-MM-DD' — ngày cuối của vòng (bao gồm)
}

/** Ngày reset của tháng (Y,M) theo dayStart: min(daysInMonth, S). */
export function cycleStartDayOfMonth(year: number, month: number, dayStart: number): number {
	return Math.min(daysInMonth(year, month), dayStart);
}

/**
 * Xác định vòng chứa ngày `date` (YYYY-MM-DD).
 * Vòng bắt đầu tại thời điểm "ngày reset" gần nhất (≤ date) trong chuỗi các tháng.
 */
export function cycleOf(date: string, dayStart: number): CycleBound {
	const [y, m, d] = date.split('-').map(Number);
	// Bước lùi dần sang các tháng trước để tìm ngày reset ≤ date.
	let cy = y;
	let cm = m;
	// Điểm reset tháng hiện tại (nếu ≤ date thì tháng này chứa reset của vòng dữ liệu)
	let start: string | null = null;
	let iterations = 0;
	while (iterations < 72) {
		// Nếu tháng cm trước đó
		const sd = cycleStartDayOfMonth(cy, cm, dayStart);
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
	const next = nextCycleStart(cycleStart, dayStart);
	const end = shiftDays(next, -1);
	return { start: cycleStart, end };
}

/** Tính ngày reset của vòng kế tiếp sau `cycleStart`. */
function nextCycleStart(cycleStart: string, dayStart: number): string {
	const [y, m, d] = cycleStart.split('-').map(Number);
	// vòng kế tiếp nằm ở tháng sau
	let ny = y;
	let nm = m + 1;
	if (nm > 12) {
		nm = 1;
		ny += 1;
	}
	const sd = cycleStartDayOfMonth(ny, nm, dayStart);
	return toDateKey(ny, nm, sd);
}

/** Dịch chuyển ngày 'YYYY-MM-DD' (local) đi n ngày (có thể âm). */
export function shiftDays(date: string, n: number): string {
	const [y, m, d] = date.split('-').map(Number);
	const dt = new Date(y, m - 1, d + n);
	return toDateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/** Vòng tiếp theo / vòng trước của một vòng. */
export function prevCycle(bound: CycleBound, dayStart: number): CycleBound {
	const [y, m, d] = bound.start.split('-').map(Number);
	// vòng trước = vòng chứa ngày trước ngày start hiện tại
	return cycleOf(shiftDays(bound.start, -1), dayStart);
}
export function nextCycle(bound: CycleBound, dayStart: number): CycleBound {
	return cycleOf(shiftDays(bound.end, 1), dayStart);
}

export interface CycleLedgerRow {
	date: string; // 'YYYY-MM-DD'
	day: number; // ngày trong tháng dương lịch (1..31)
	cycleDay: number; // ngày thứ mấy trong vòng (1..)
	limit: number;
	spent: number;
	balance: number;
}

/**
 * Tính ledger đầy đủ cho 1 vòng, tuần tự từ start đến end (một lần).
 * Reset tại ngày start: limit = defaultLimit; các ngày sau = defaultLimit + balance(trước).
 */
export function computeCycleLedger(
	bound: CycleBound,
	defaultLimit: number,
	spentByDate: Record<string, number>
): CycleLedgerRow[] {
	const rows: CycleLedgerRow[] = [];
	let cur = bound.start;
	let cycleDay = 1;
	let previousBalance = 0;

	while (cur <= bound.end) {
		const [ty, tm, td] = cur.split('-').map(Number);
		const limit = cycleDay === 1 ? defaultLimit : defaultLimit + previousBalance;
		const spent = spentByDate[cur] ?? 0;
		const balance = limit - spent;
		rows.push({
			date: cur,
			day: td,
			cycleDay,
			limit,
			spent,
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
export function currentCycle(dayStart: number): CycleBound {
	return cycleOf(todayKey(), dayStart);
}

function currentDateKey(): string {
	return todayKey();
}

/** So sánh thứ tự 2 ngày 'YYYY-MM-DD'. */
export function dateIsAfter(a: string, b: string): boolean {
	return a > b;
}
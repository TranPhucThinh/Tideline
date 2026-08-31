/**
 * Tra cứu cài đặt hạn mức / ngày bắt đầu vòng theo TỪNG NGÀY từ lịch sử trong bảng
 * `limit_settings`. Đây là phần cốt lõi của fix non-retroactive: thay vì dùng một giá
 * trị `defaultLimit` cố định cho mọi ngày trong vòng, mỗi ngày tự tra cứu giá trị có
 * `effective_from` <= ngày đó gần nhất. Do mỗi lần đổi cài đặt ta INSERT 1 row mới
 * (append-only), ngày trước ngày đổi sẽ tự khớp với row cũ -> hạn mức ngày đã qua không
 * bị tính lại theo giá trị mới.
 */

import type { LimitSetting } from './types.ts';

export const DEFAULT_LIMIT = 100000;
export const DEFAULT_DAY_START = 1;

/** Sắp xếp lịch sử tăng dần theo effective_from (và created_at để ổn định khi trùng ngày). */
function sortSettings(rows: LimitSetting[]): LimitSetting[] {
	return [...rows].sort((a, b) => {
		if (a.effective_from !== b.effective_from) {
			return a.effective_from < b.effective_from ? -1 : 1;
		}
		return a.created_at < b.created_at ? -1 : 1;
	});
}

/** Kết quả tra cứu: hàm trả về value có effective_from <= date gần nhất. */
function effectiveFor<T>(
	rows: LimitSetting[],
	pick: (row: LimitSetting) => T,
	fallback: T
): (date: string) => T {
	const sorted = sortSettings(rows);
	const byKey: Record<string, T> = {};
	for (const row of sorted) {
		// càng sau (effective_from càng lớn) càng đè giá trị cũ cho ngày >= effective_from đó
		byKey[row.effective_from] = pick(row);
	}
	// Danh sách keys đã sắp tăng dần
	const keys = Object.keys(byKey).sort();
	return (date: string) => {
		// tìm key lớn nhất <= date (binary search / scan)
		let value = fallback;
		for (let i = 0; i < keys.length && keys[i] <= date; i++) {
			value = byKey[keys[i]]!;
		}
		return value;
	};
}

export interface LimitLookups {
	/** default_limit có hiệu lực tại 1 ngày. */
	defaultLimitForDate: (date: string) => number;
	/** day_start có hiệu lực tại 1 ngày (dùng cho ranh giới vòng, xem note dưới). */
	dayStartForDate: (date: string) => number;
	/** default_limit mới nhất (giá trị hiện tại). */
	currentDefaultLimit: number;
	/** day_start mới nhất (giá trị hiện tại). */
	currentDayStart: number;
}

/**
 * Xây dựng các hàm tra cứu theo ngày từ lịch sử `limit_settings`.
 * Nếu không có row nào (vd migration chưa chạy / dữ liệu < migration), trả về mặc định.
 */
export function createLimitLookups(rows: LimitSetting[]): LimitLookups {
	const sorted = sortSettings(rows);
	const current = sorted[sorted.length - 1];
	return {
		defaultLimitForDate: effectiveFor(sorted, (r) => r.default_limit, DEFAULT_LIMIT),
		dayStartForDate: effectiveFor(sorted, (r) => r.day_start, DEFAULT_DAY_START),
		currentDefaultLimit: current?.default_limit ?? DEFAULT_LIMIT,
		currentDayStart: current?.day_start ?? DEFAULT_DAY_START
	};
}

/**
 * Tạo hàm default limit không đổi (bằng một số). Tiện cho test / fallback.
 */
export function constLimit(value: number): (date: string) => number {
	return () => value;
}
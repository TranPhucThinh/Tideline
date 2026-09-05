/** Types khớp với data model trong database (xem supabase/setup.sql). */

export interface Profile {
	id: string;
	default_limit: number;
	/** Ngày bắt đầu của vòng chi tiêu (1..31); 1 = mặc định (theo tháng dương lịch). */
	day_start: number;
	/** Đã xem hướng dẫn lần đầu chưa (true = không tự hiện lại nữa). */
	guide_seen: boolean;
	created_at: string;
}

export interface Expense {
	id: string;
	user_id: string;
	amount: number;
	note: string | null;
	date: string; // 'YYYY-MM-DD'
	created_at: string;
}

/** Khoản thu (income) — tiền user NHĀN (vd lương). Cộng vào số dư hằng ngày. Xem setup.sql / migration 004. */
export interface Income {
	id: string;
	user_id: string;
	amount: number;
	note: string | null;
	date: string; // 'YYYY-MM-DD'
	created_at: string;
}

/**
 * Một dòng trong bảng `limit_settings` — lịch sử thay đổi cài đặt hạn mức / ngày bắt
 * đầu vòng (append-only, xem migration 003). Giá trị `default_limit`/`day_start` được
 * áp dụng cho các ngày từ `effective_from` (bao gồm) cho đến trước `effective_from`
 * của dòng kế tiếp (hoặc mãi mãi nếu là dòng mới nhất).
 */
export interface LimitSetting {
	id: string;
	user_id: string;
	default_limit: number;
	/** Ngày bắt đầu vòng áp dụng từ effective_from (1..31). */
	day_start: number;
	/** Ngày giá trị bắt đầu có hiệu lực (YYYY-MM-DD). */
	effective_from: string;
	created_at: string;
}
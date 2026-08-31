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
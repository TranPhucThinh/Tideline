/** Types khớp với data model trong database (xem supabase/setup.sql). */

export interface Profile {
	id: string;
	default_limit: number;
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
import type { PageServerLoad } from './$types';
import { currentMonth, daysInMonth, toDateKey } from '$lib/ledger';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.supabase || !locals.supabaseReady) {
		return { monthExpenses: [] };
	}

	const { year, month } = currentMonth();
	const nDays = daysInMonth(year, month);
	const from = toDateKey(year, month, 1);
	const to = toDateKey(year, month, nDays);

	// Lấy toàn bộ chi tiêu trong tháng hiện tại để tính ledger đầy đủ (BAO gồm hôm nay).
	const { data, error } = await locals.supabase
		.from('expenses')
		.select('id, user_id, amount, note, date, created_at')
		.gte('date', from)
		.lte('date', to)
		.order('created_at', { ascending: false });

	if (error) {
		// eslint-disable-next-line no-console
		console.error('load month expenses:', error.message);
		return { monthExpenses: [] };
	}

	return {
		monthExpenses: (data ?? []) as Array<{
			id: string;
			user_id: string;
			amount: number;
			note: string | null;
			date: string;
			created_at: string;
		}>
	};
};
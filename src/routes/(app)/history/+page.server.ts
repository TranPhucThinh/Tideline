import type { PageServerLoad } from './$types';
import {
	daysInMonth,
	currentMonth,
	parseMonthKey,
	toDateKey
} from '$lib/ledger';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.supabase || !locals.supabaseReady) {
		return { monthExpenses: [], requestedMonth: currentMonth() };
	}

	// Đọc tháng từ query ?month=YYYY-MM, mặc định tháng hiện tại.
	const raw = url.searchParams.get('month');
	const parsed = raw ? parseMonthKey(raw) : null;
	const requested = parsed ?? currentMonth();
	const { year, month } = requested;

	const nDays = daysInMonth(year, month);
	const from = toDateKey(year, month, 1);
	const to = toDateKey(year, month, nDays);

	const { data, error } = await locals.supabase
		.from('expenses')
		.select('id, user_id, amount, note, date, created_at')
		.gte('date', from)
		.lte('date', to)
		.order('date', { ascending: true });

	if (error) {
		// eslint-disable-next-line no-console
		console.error('load history:', error.message);
		return { monthExpenses: [], requestedMonth: requested };
	}

	return {
		monthExpenses: (data ?? []) as Array<{
			id: string;
			user_id: string;
			amount: number;
			note: string | null;
			date: string;
			created_at: string;
		}>,
		requestedMonth: requested
	};
};
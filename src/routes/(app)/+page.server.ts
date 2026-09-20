import type { PageServerLoad } from './$types';
import { currentCycle } from '$lib/cycle';
import { createLimitLookups } from '$lib/settings';
import type { Income, LimitSetting } from '$lib/types';
import { todayKey } from '$lib/date';

type PageExpense = {
	id: string;
	user_id: string;
	amount: number;
	note: string | null;
	date: string;
	created_at: string;
};

export const load: PageServerLoad = async ({ locals, parent }) => {
	// limitSettings từ layout (profile + lịch sử bảng limit_settings, migration 003).
	const { limitSettings } = await parent();
	const { dayStartForDate } = createLimitLookups(limitSettings ?? []);

	if (!locals.supabase || !locals.supabaseReady) {
		return { cycleExpenses: [], cycleIncomes: [], limitSettings: limitSettings ?? [] };
	}

	// Vòng hiện tại (chứa hôm nay) — dùng day_start tra theo từng ngày (non-retroactive).
	const bound = currentCycle(dayStartForDate);

	const today = todayKey();
	// Load the user's entries through today so the date picker can safely show
	// and edit a backfilled date, even when it is outside the current cycle.
	const { data, error } = await locals.supabase
		.from('expenses')
		.select('id, user_id, amount, note, date, created_at')
		.lte('date', today)
		.order('created_at', { ascending: false });

	if (error) {
		// eslint-disable-next-line no-console
		console.error('load cycle expenses:', error.message);
		return { cycleExpenses: [], cycleIncomes: [], limitSettings: limitSettings ?? [] };
	}

	// Khoản thu trong cùng vòng (income cộng vào số dư).
	const { data: incData, error: incError } = await locals.supabase
		.from('incomes')
		.select('id, user_id, amount, note, date, created_at')
		.lte('date', today)
		.order('created_at', { ascending: false });

	if (incError) {
		// eslint-disable-next-line no-console
		console.error('load cycle incomes:', incError.message);
	}

	return {
		cycleExpenses: (data ?? []) as PageExpense[],
		cycleIncomes: (incData ?? []) as Income[],
		limitSettings: (limitSettings ?? []) as LimitSetting[]
	};
};

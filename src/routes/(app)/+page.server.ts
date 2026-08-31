import type { PageServerLoad } from './$types';
import { currentCycle } from '$lib/cycle';
import { createLimitLookups } from '$lib/settings';
import type { LimitSetting } from '$lib/types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	// limitSettings từ layout (profile + lịch sử bảng limit_settings, migration 003).
	const { limitSettings } = await parent();
	const { dayStartForDate } = createLimitLookups(limitSettings ?? []);

	if (!locals.supabase || !locals.supabaseReady) {
		return { cycleExpenses: [], limitSettings: limitSettings ?? [] };
	}

	// Vòng hiện tại (chứa hôm nay) — dùng day_start tra theo từng ngày (non-retroactive).
	const bound = currentCycle(dayStartForDate);

	const { data, error } = await locals.supabase
		.from('expenses')
		.select('id, user_id, amount, note, date, created_at')
		.gte('date', bound.start)
		.lte('date', bound.end)
		.order('created_at', { ascending: false });

	if (error) {
		// eslint-disable-next-line no-console
		console.error('load cycle expenses:', error.message);
		return { cycleExpenses: [], limitSettings: limitSettings ?? [] };
	}

	return {
		cycleExpenses: (data ?? []) as Array<{
			id: string;
			user_id: string;
			amount: number;
			note: string | null;
			date: string;
			created_at: string;
		}>,
		limitSettings: (limitSettings ?? []) as LimitSetting[]
	};
};
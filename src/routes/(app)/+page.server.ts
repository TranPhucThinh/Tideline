import type { PageServerLoad } from './$types';
import { currentCycle } from '$lib/cycle';

export const load: PageServerLoad = async ({ locals, parent }) => {
	// dayStart từ layout (profile). Layout tự chuyển về nếu profile chưa có.
	const { dayStart } = await parent();

	if (!locals.supabase || !locals.supabaseReady) {
		return { cycleExpenses: [], dayStart };
	}

	// Vòng hiện tại (chứa hôm nay)
	const bound = currentCycle(dayStart);

	const { data, error } = await locals.supabase
		.from('expenses')
		.select('id, user_id, amount, note, date, created_at')
		.gte('date', bound.start)
		.lte('date', bound.end)
		.order('created_at', { ascending: false });

	if (error) {
		// eslint-disable-next-line no-console
		console.error('load cycle expenses:', error.message);
		return { cycleExpenses: [], dayStart };
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
		dayStart
	};
};
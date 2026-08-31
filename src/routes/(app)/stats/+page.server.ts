import type { PageServerLoad } from './$types';
import { cycleOf, type CycleBound } from '$lib/cycle';

export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const { dayStart } = await parent();

	const todayKey = (d: Date) => {
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	};

	if (!locals.supabase || !locals.supabaseReady) {
		return { bound: cycleOf(todayKey(new Date()), dayStart), cycleExpenses: [], dayStart, isCurrent: false };
	}

	const cur = cycleOf(todayKey(new Date()), dayStart);
	const raw = url.searchParams.get('start');
	const start = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
	const bound: CycleBound = start ? cycleOf(start, dayStart) : cur;
	const isCurrent = bound.start === cur.start;

	const { data, error } = await locals.supabase
		.from('expenses')
		.select('id, user_id, amount, note, date, created_at')
		.gte('date', bound.start)
		.lte('date', bound.end)
		.order('date', { ascending: true });

	if (error) {
		// eslint-disable-next-line no-console
		console.error('load stats cycle:', error.message);
		return { bound, cycleExpenses: [], dayStart, isCurrent };
	}

	return {
		bound,
		cycleExpenses: (data ?? []) as Array<{
			id: string;
			user_id: string;
			amount: number;
			note: string | null;
			date: string;
			created_at: string;
		}>,
		dayStart,
		isCurrent
	};
};
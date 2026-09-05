import type { PageServerLoad } from './$types';
import { cycleOf, type CycleBound } from '$lib/cycle';
import { createLimitLookups } from '$lib/settings';
import type { Income, LimitSetting } from '$lib/types';

export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const { limitSettings } = await parent();
	const { dayStartForDate } = createLimitLookups(limitSettings ?? []);

	const todayKey = (d: Date) => {
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}-${mm}-${dd}`;
	};

	if (!locals.supabase || !locals.supabaseReady) {
		return {
			bound: cycleOf(todayKey(new Date()), dayStartForDate),
			cycleExpenses: [],
			cycleIncomes: [],
			limitSettings: limitSettings ?? [],
			isCurrent: false
		};
	}

	const cur = cycleOf(todayKey(new Date()), dayStartForDate);
	const raw = url.searchParams.get('start');
	const start = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
	const bound: CycleBound = start ? cycleOf(start, dayStartForDate) : cur;
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
		return { bound, cycleExpenses: [], cycleIncomes: [], limitSettings: limitSettings ?? [], isCurrent };
	}

	const { data: incData, error: incError } = await locals.supabase
		.from('incomes')
		.select('id, user_id, amount, note, date, created_at')
		.gte('date', bound.start)
		.lte('date', bound.end)
		.order('date', { ascending: true });

	if (incError) {
		// eslint-disable-next-line no-console
		console.error('load stats incomes:', incError.message);
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
		cycleIncomes: (incData ?? []) as Income[],
		limitSettings: (limitSettings ?? []) as LimitSetting[],
		isCurrent
	};
};
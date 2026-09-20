import type { PageServerLoad } from './$types';
import { cycleOf, type CycleBound } from '$lib/cycle';
import { createLimitLookups } from '$lib/settings';
import type { Income, LimitSetting } from '$lib/types';
import { isValidDateKey, todayKey } from '$lib/date';

export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const { limitSettings } = await parent();
	const { dayStartForDate } = createLimitLookups(limitSettings ?? []);

	if (!locals.supabase || !locals.supabaseReady) {
		return {
			bound: cycleOf(todayKey(), dayStartForDate),
			cycleExpenses: [],
			cycleIncomes: [],
			limitSettings: limitSettings ?? [],
			isCurrent: false
		};
	}

	const cur = cycleOf(todayKey(), dayStartForDate);
	const raw = url.searchParams.get('start');
	const start = raw && isValidDateKey(raw) ? raw : null;
	const requested = start ? cycleOf(start, dayStartForDate) : cur;
	const bound: CycleBound = requested.start > cur.start ? cur : requested;
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

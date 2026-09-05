import type { PageServerLoad } from './$types';
import { cycleOf, type CycleBound } from '$lib/cycle';
import { createLimitLookups } from '$lib/settings';
import type { Income, LimitSetting } from '$lib/types';

// Hỗ trợ ?start=YYYY-MM-DD (ngày bắt đầu vòng). Mặc định = vòng hiện tại.
function parseStart(raw: string | null): string | null {
	if (!raw) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
	return raw;
}

export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const { limitSettings } = await parent();
	const { dayStartForDate } = createLimitLookups(limitSettings ?? []);

	if (!locals.supabase || !locals.supabaseReady) {
		const today = toDateKey(new Date());
		return {
			bound: cycleOf(today, dayStartForDate),
			cycleExpenses: [],
			cycleIncomes: [],
			limitSettings: limitSettings ?? [],
			isCurrent: false
		};
	}

	const cur = cycleOf(toDateKey(new Date()), dayStartForDate);
	const raw = url.searchParams.get('start');
	const start = parseStart(raw);
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
		console.error('load history cycle:', error.message);
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
		console.error('load history incomes:', incError.message);
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

function toDateKey(d: Date): string {
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}
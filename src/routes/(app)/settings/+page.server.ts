import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseMoneyInput } from '$lib/money';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.supabase || !locals.supabaseReady) {
		return { default_limit: null, day_start: null };
	}

	const {
		data: { session }
	} = await locals.supabase.auth.getSession();
	if (!session) return { default_limit: null, day_start: null };

	const { data } = await locals.supabase
		.from('profiles')
		.select('default_limit, day_start')
		.eq('id', session.user.id)
		.single();

	return {
		default_limit: (data?.default_limit as number | undefined) ?? null,
		day_start: (data?.day_start as number | undefined) ?? null
	};
};

function clampDayStart(v: number): number | null {
	if (!Number.isInteger(v) || v < 1 || v > 31) return null;
	return v;
}

export const actions: Actions = {
	updateLimit: async ({ request, locals }) => {
		if (!locals.supabase || !locals.supabaseReady) {
			return fail(500, { message: 'Supabase chưa được cấu hình.', default_limit: null });
		}
		const {
			data: { session }
		} = await locals.supabase.auth.getSession();
		if (!session) return fail(401, { message: 'Chưa đăng nhập.', default_limit: null });

		const formData = await request.formData();
		const raw = formData.get('limit') ?? '';
		const value = parseMoneyInput(String(raw));
		if (value === null) {
			return fail(400, { message: 'Hạn mức không hợp lệ. Nhập số dương.', default_limit: null });
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ default_limit: value })
			.eq('id', session.user.id);
		if (error) return fail(500, { message: error.message, default_limit: null });

		return { success: true, default_limit: value };
	},

	updateDayStart: async ({ request, locals }) => {
		if (!locals.supabase || !locals.supabaseReady) {
			return fail(500, { message: 'Supabase chưa được cấu hình.', day_start: null });
		}
		const {
			data: { session }
		} = await locals.supabase.auth.getSession();
		if (!session) return fail(401, { message: 'Chưa đăng nhập.', day_start: null });

		const formData = await request.formData();
		const raw = formData.get('dayStart') ?? '';
		const value = clampDayStart(Number(String(raw)));
		if (value === null) {
			return fail(400, { message: 'Ngày bắt đầu vòng phải từ 1 đến 31.', day_start: null });
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ day_start: value })
			.eq('id', session.user.id);
		if (error) return fail(500, { message: error.message, day_start: null });

		return { success: true, day_start: value };
	}
};
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseMoneyInput } from '$lib/money';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.supabase || !locals.supabaseReady) return { default_limit: null };

	const {
		data: { session }
	} = await locals.supabase.auth.getSession();
	if (!session) return { default_limit: null };

	const { data } = await locals.supabase
		.from('profiles')
		.select('default_limit')
		.eq('id', session.user.id)
		.single();

	return { default_limit: (data?.default_limit as number | undefined) ?? null };
};

export const actions: Actions = {
	updateLimit: async ({ request, locals }) => {
		if (!locals.supabase || !locals.supabaseReady) {
			return fail(500, { message: 'Supabase chưa được cấu hình.', default_limit: null });
		}

		const {
			data: { session }
		} = await locals.supabase.auth.getSession();
		if (!session) {
			return fail(401, { message: 'Chưa đăng nhập.', default_limit: null });
		}

		const formData = await request.formData();
		const raw = formData.get('limit') ?? '';
		const value = parseMoneyInput(String(raw));

		if (value === null) {
			return fail(400, {
				message: 'Hạn mức không hợp lệ. Nhập số dương.',
				default_limit: null
			});
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ default_limit: value })
			.eq('id', session.user.id);

		if (error) {
			return fail(500, { message: error.message, default_limit: null });
		}

		return { success: true, default_limit: value };
	}
};
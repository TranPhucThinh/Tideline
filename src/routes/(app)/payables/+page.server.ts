import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { emptyPayables, readPayables } from '$lib/server/payables';
import { todayKey } from '$lib/date';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:payables');
	const { user } = await locals.safeGetSession();
	if (!user || !locals.supabase) redirect(303, '/auth/login');
	try {
		return { payables: await readPayables(locals.supabase, user.id), today: todayKey(), loadError: null };
	} catch (error) {
		return { payables: emptyPayables(), today: todayKey(), loadError: error instanceof Error ? error.message : 'Không tải được khoản phải trả. Vui lòng thử lại.' };
	}
};

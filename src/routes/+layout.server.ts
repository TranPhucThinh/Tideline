import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.supabaseReady) {
		return { session: null, user: null, supabaseReady: false };
	}
	const { session, user } = await locals.safeGetSession();
	return { session, user, supabaseReady: true };
};
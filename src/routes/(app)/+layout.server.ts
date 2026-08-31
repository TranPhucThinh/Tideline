import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { Profile } from '$lib/types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Chưa cấu hình Supabase -> đưa đến trang setup hướng dẫn
	if (!locals.supabaseReady || !locals.supabase) {
		throw redirect(303, '/setup');
	}

	const {
		data: { session }
	} = await locals.supabase.auth.getSession();

	// Chưa đăng nhập -> redirect về trang login
	if (!session) {
		throw redirect(303, '/auth/login');
	}

	// Lấy profile (default_limit, day_start). Tạo tự động bởi DB trigger khi đăng ký;
	// nếu chưa có (migration cũ), tự tạo với default 100000 / day_start 1.
	let profile: Profile | null = null;
	const { data: prof } = await locals.supabase
		.from('profiles')
		.select('id, default_limit, day_start, guide_seen, created_at')
		.eq('id', session.user.id)
		.single();

	if (prof) {
		profile = prof as Profile;
	} else {
		const insert = await locals.supabase
			.from('profiles')
			.insert({ id: session.user.id, default_limit: 100000, day_start: 1 })
			.select('id, default_limit, day_start, guide_seen, created_at')
			.single();
		if (insert.data) profile = insert.data as Profile;
	}

	const defaultLimit = profile?.default_limit ?? 100000;
	const dayStart = clampDayStart(profile?.day_start);
	const guideSeen = profile ? profile.guide_seen ?? false : false;

	return {
		session,
		supabaseReady: true,
		defaultLimit,
		dayStart,
		guideSeen
	};
};

function clampDayStart(v: number | undefined | null): number {
	if (typeof v !== 'number') return 1;
	if (v < 1) return 1;
	if (v > 31) return 31;
	return Math.round(v);
}
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { Profile, LimitSetting } from '$lib/types';
import { DEFAULT_LIMIT, DEFAULT_DAY_START } from '$lib/settings';

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
			.insert({ id: session.user.id, default_limit: DEFAULT_LIMIT, day_start: DEFAULT_DAY_START })
			.select('id, default_limit, day_start, guide_seen, created_at')
			.single();
		if (insert.data) profile = insert.data as Profile;
	}

	const defaultLimit = profile?.default_limit ?? DEFAULT_LIMIT;
	const dayStart = clampDayStart(profile?.day_start);
	const guideSeen = profile ? profile.guide_seen ?? false : false;

	// Lịch sử cài đặt hạn mức / ngày bắt đầu vòng (bảng limit_settings, migration 003).
	// Trang Hôm nay / Lịch sử / Thống kê dùng mảng này để tra cứu value theo TỪNG NGÀY
	// (non-retroactive). Nếu migration chưa chạy (không có row), dựng 1 row ảo từ
	// profile hiện tại với effective_from = ngày tạo tài khoản để vẫn hoạt động.
	let limitSettings: LimitSetting[] = [];
	const { data: setRows } = await locals.supabase
		.from('limit_settings')
		.select('id, user_id, default_limit, day_start, effective_from, created_at')
		.eq('user_id', session.user.id)
		.order('effective_from', { ascending: true });

	if (setRows && setRows.length > 0) {
		limitSettings = setRows as LimitSetting[];
	} else {
		// Fallback khi chưa có bảng / row (migration chưa chạy tay trên Supabase).
		const eff = profile?.created_at?.slice(0, 10) ?? todayKey();
		limitSettings = [
			{
				id: 'fallback',
				user_id: session.user.id,
				default_limit: defaultLimit,
				day_start: dayStart,
				effective_from: eff,
				created_at: new Date().toISOString()
			}
		];
	}

	return {
		session,
		supabaseReady: true,
		defaultLimit,
		dayStart,
		guideSeen,
		limitSettings
	};
};

function todayKey(): string {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

function clampDayStart(v: number | undefined | null): number {
	if (typeof v !== 'number') return DEFAULT_DAY_START;
	if (v < 1) return DEFAULT_DAY_START;
	if (v > 31) return 31;
	return Math.round(v);
}
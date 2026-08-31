import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
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

/** Ngày hôm nay 'YYYY-MM-DD' theo giờ local (dùng cho effective_from). */
function todayKey(): string {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Lấy giá trị hiện tại (default_limit, day_start) từ profiles của user. */
async function currentProfile(
	supabase: SupabaseClient,
	userId: string
): Promise<{ default_limit: number | null; day_start: number | null }> {
	const res = await supabase
		.from('profiles')
		.select('default_limit, day_start')
		.eq('id', userId)
		.single();
	return {
		default_limit: (res.data?.default_limit as number | undefined) ?? null,
		day_start: (res.data?.day_start as number | undefined) ?? null
	};
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

		const cur = await currentProfile(locals.supabase, session.user.id);
		const eff = todayKey();

		// UPDATE profiles để giữ giá trị "hiện tại" (dùng để hiển thị + lấy từ layout).
		const { error: upErr } = await locals.supabase
			.from('profiles')
			.update({ default_limit: value })
			.eq('id', session.user.id);
		if (upErr) return fail(500, { message: upErr.message, default_limit: null });

		// INSERT 1 row lịch sử (append-only) với effective_from = hôm nay. KHÔNG update
		// row cũ -> các ngày trước hôm nay giữ nguyên hạn mức cũ (non-retroactive).
		const { error: histErr } = await locals.supabase.from('limit_settings').insert({
			user_id: session.user.id,
			default_limit: value,
			day_start: cur.day_start ?? 1,
			effective_from: eff
		});
		if (histErr) return fail(500, { message: histErr.message, default_limit: null });

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

		const cur = await currentProfile(locals.supabase, session.user.id);
		const eff = todayKey();

		const { error: upErr } = await locals.supabase
			.from('profiles')
			.update({ day_start: value })
			.eq('id', session.user.id);
		if (upErr) return fail(500, { message: upErr.message, day_start: null });

		// Lưu lịch sử đổi day_start (append-only).
		const { error: histErr } = await locals.supabase.from('limit_settings').insert({
			user_id: session.user.id,
			default_limit: cur.default_limit ?? 100000,
			day_start: value,
			effective_from: eff
		});
		if (histErr) return fail(500, { message: histErr.message, day_start: null });

		return { success: true, day_start: value };
	}
};
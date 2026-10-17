import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateItem, type PayableItem } from '$lib/payables/domain';
import { payablesError } from '$lib/server/payables';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (request.headers.get('origin') !== url.origin) return json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
	const { user } = await locals.safeGetSession();
	if (!user || !locals.supabase) return json({ error: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' }, { status: 401 });
	try {
		const { action, payload } = await request.json();
		if (!['create','settings','income','edit','delete','stop','pay','undo','price','amount'].includes(action) || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
			return json({ error: 'Thao tác không hợp lệ.' }, { status: 400 });
		}
		for (const field of ['amount','income','day_start','count','sequence']) {
			if (payload[field] !== undefined && payload[field] !== null && (!Number.isSafeInteger(payload[field]) || Math.abs(payload[field]) > 1_000_000_000_000)) {
				return json({ error: 'Số tiền và số lần phải là số nguyên hợp lệ.' }, { status: 400 });
			}
		}
		if (action === 'create') {
			const message = validateItem(payload as PayableItem);
			if (message) return json({ error: message }, { status: 400 });
		}
		const { error } = await locals.supabase.rpc('mutate_payables', { p_action: action, p_payload: payload });
		if (error) {
			const message = ['23514','P0002','42501'].includes(error.code) && !error.message.includes('constraint') ? error.message :
				['42P01','42883','PGRST202'].includes(error.code) ? payablesError(error.code) : 'Không lưu được. Kiểm tra thông tin và thử lại.';
			return json({ error: message }, { status: 400 });
		}
		return json({ ok: true });
	} catch {
		return json({ error: 'Không lưu được. Kiểm tra kết nối và thông tin rồi thử lại.' }, { status: 400 });
	}
};

import type { Handle, HandleServerError } from '@sveltejs/kit';
import { createServerSupabase } from '$lib/server/supabase';
import { isSupabaseConfigured } from '$lib/env';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabaseReady = isSupabaseConfigured();

	if (!event.locals.supabaseReady) {
		// Chưa cấu hình Supabase -> không cần xử lý phiên nữa.
		return resolve(event);
	}

	event.locals.supabase = createServerSupabase(event.cookies);
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase!.auth.getSession();
		if (!session) return { session: null, user: null };
		const {
			data: { user }
		} = await event.locals.supabase!.auth.getUser();
		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

export const handleError: HandleServerError = ({ error }) => {
	// eslint-disable-next-line no-console
	console.error(error);
	return { message: 'Đã có lỗi xảy ra.' };
};
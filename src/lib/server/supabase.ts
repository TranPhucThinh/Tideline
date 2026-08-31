import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Cookies } from '@sveltejs/kit';

/**
 * Server-side Supabase client (SSR). Cần truyền `Cookies` để đọc/ghi cookie phiên.
 * Dùng trong hooks.server.ts và các load function server.
 */
export function createServerSupabase(cookies: Cookies) {
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return cookies.getAll();
			},
			setAll(cookiesToSet) {
				try {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookies.set(name, value, { ...options, path: '/' })
					);
				} catch {
					// Có thể xảy ra khi set cookie ngoài handler (vd trong Server Component).
					// Bỏ qua, cookie sẽ refresh ở request kế tiếp.
				}
			}
		}
	});
}
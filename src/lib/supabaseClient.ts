import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { isSupabaseConfigured } from './env';

/**
 * Browser Supabase client — khởi tạo lazy (chỉ tạo thật trên lần đầu truy cập thuộc tính).
 * Điều này cho phép các trang auth/setup render ngay cả khi chưa điền credentials
 * (khi đó chúng hiển thị thông báo "chưa cấu hình" thay vì crash).
 */
export function createClient() {
	let client: ReturnType<typeof createBrowserClient> | null = null;

	function materialize() {
		if (!client) {
			client = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				auth: {
					autoRefreshToken: isBrowser(),
					persistSession: true,
					detectSessionInUrl: true
				}
			});
		}
		return client;
	}

	return new Proxy(
		{},
		{
			get(_target, prop: string | symbol) {
				if (prop === 'then') {
					// Tránh bị coi là thenable
					return undefined;
				}
				const real = materialize();
				return (real as unknown as Record<string, unknown>)[prop as string];
			}
		}
	) as unknown as ReturnType<typeof createBrowserClient>;
}

export { isSupabaseConfigured };

export const supabaseConfigured = isSupabaseConfigured();
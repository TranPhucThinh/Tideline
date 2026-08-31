import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/** Kiểm tra xem Supabase đã được cấu hình chưa (dựa vào env placeholder). */
export function isSupabaseConfigured(): boolean {
	return Boolean(
		PUBLIC_SUPABASE_URL &&
			!PUBLIC_SUPABASE_URL.includes('YOUR-PROJECT') &&
			PUBLIC_SUPABASE_ANON_KEY &&
			!PUBLIC_SUPABASE_ANON_KEY.includes('YOUR-ANON')
	);
}

export { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY };
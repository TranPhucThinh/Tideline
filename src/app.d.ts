// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabaseReady: boolean;
			supabase?: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			supabaseReady: boolean;
			defaultLimit?: number;
			dayStart?: number;
		}
		// interface Error {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

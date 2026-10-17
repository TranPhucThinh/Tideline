import type { SupabaseClient } from '@supabase/supabase-js';
import type { IncomeOverride, PayableItem, PaymentOverride, PriceRevision, SalarySetting } from '$lib/payables/domain';

export const emptyPayables = () => ({ settings: [] as SalarySetting[], incomes: [] as IncomeOverride[], items: [] as PayableItem[], prices: [] as PriceRevision[], overrides: [] as PaymentOverride[] });
export function payablesError(code?: string): string {
	if (['42P01', '42883', 'PGRST205', 'PGRST202'].includes(code ?? '')) return 'Chức năng chưa được thiết lập trên máy chủ. Cần chạy migration 009_payables.sql trong Supabase.';
	return 'Không tải được khoản phải trả. Vui lòng thử lại; số liệu chưa được cập nhật.';
}
/** Supabase defaults to 1,000 rows. Paginate explicitly so old obligations are never silently omitted. */
async function readAll<T>(db: SupabaseClient, table: string, columns: string, userId: string, order: string[]): Promise<T[]> {
	const rows: T[] = [];
	for (let offset = 0; ; offset += 1000) {
		let query = db.from(table).select(columns).eq('user_id', userId);
		for (const column of order) query = query.order(column);
		const { data, error } = await query.range(offset, offset + 999);
		if (error) throw new Error(payablesError(error.code));
		rows.push(...((data ?? []) as unknown as T[]));
		if (!data || data.length < 1000) return rows;
	}
}
export async function readPayables(db: SupabaseClient, userId: string) {
	const [settings, incomes, items, prices, overrides] = await Promise.all([
		readAll<SalarySetting>(db, 'payable_settings', 'effective_from,day_start,default_income', userId, ['effective_from']),
		readAll<IncomeOverride>(db, 'payable_incomes', 'cycle_start,amount', userId, ['cycle_start']),
		readAll<PayableItem>(db, 'payable_items', 'id,name,provider,note,kind,amount,first_due,count,estimated,stop_from', userId, ['id']),
		readAll<PriceRevision>(db, 'payable_prices', 'item_id,from_sequence,amount', userId, ['item_id','from_sequence']),
		readAll<PaymentOverride>(db, 'payable_overrides', 'item_id,sequence,amount,paid_on', userId, ['item_id','sequence'])
	]);
	return { settings, incomes, items, prices, overrides };
}

<script lang="ts">
	import { untrack } from 'svelte';
	import MoneyInput from '$lib/MoneyInput.svelte';
	import type { SalarySetting } from './domain';
	let { settings, busy, onsave }: { settings: SalarySetting[]; busy: boolean; onsave: (action: string, payload: Record<string, unknown>) => Promise<boolean> } = $props();
	const initial = untrack(() => settings.at(-1));
	let day = $state(initial?.day_start ?? 25);
	let income = $state(initial?.default_income === null || initial?.default_income === undefined ? '' : String(initial.default_income));
</script>

<form class="space-y-4" onsubmit={(e) => { e.preventDefault(); void onsave('settings', { day_start: day, income: income.trim() ? Number(income.replace(/\D/g,'')) : null }); }}>
	<fieldset disabled={busy} class="space-y-4">
		<label class="block text-sm font-medium">Ngày bắt đầu kỳ lương<input type="number" min="1" max="31" required bind:value={day} class="ui-input mt-1 w-full border p-3" /></label>
		<MoneyInput id="payable-salary" label="Thu nhập dự kiến mặc định (VND)" value={income} onchange={(v) => income = v} />
		<p class="text-sm text-muted">Có thể để trống nếu chưa biết thu nhập. Số 0 có nghĩa kỳ này không có thu nhập.</p>
		<p class="text-sm leading-relaxed text-muted">{settings.length ? 'Thay đổi áp dụng từ kỳ tiếp theo. Kỳ hiện tại và lịch sử giữ nguyên; kỳ chuyển tiếp có thể ngắn hơn một tháng.' : 'Kỳ lương và thu nhập ở đây độc lập với vòng thu chi. Bạn có thể điều chỉnh thu nhập riêng cho từng kỳ.'}</p>
		<button class="ui-button ui-button-primary w-full" type="submit">{busy ? 'Đang lưu…' : settings.length ? 'Lưu cho kỳ tiếp theo' : 'Bắt đầu theo dõi'}</button>
	</fieldset>
</form>

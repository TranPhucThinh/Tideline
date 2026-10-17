<script lang="ts">
	import { untrack } from 'svelte';
	import MoneyInput from '$lib/MoneyInput.svelte';
	import { shiftDate, type Occurrence, type PayableItem, type SalaryCycle } from './domain';
	let { action, row, item, cycle, today, busy, onsave }: { action: string; row?: Occurrence; item?: PayableItem; cycle: SalaryCycle; today: string; busy: boolean; onsave: (action: string, payload: Record<string, unknown>) => Promise<boolean> } = $props();
	let amount = $state(untrack(() => String(action === 'income' ? cycle.income ?? '' : row?.amount ?? '')));
	let date = $state(untrack(() => action === 'stop' ? shiftDate(cycle.end, 1) > today ? shiftDate(cycle.end, 1) : shiftDate(today, 1) : today));
	let localError = $state('');
	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const payload: Record<string, unknown> = { id: item?.id ?? row?.item_id, sequence: row?.sequence };
		if (['amount','price','pay','income'].includes(action)) payload.amount = amount.trim() ? Number(amount.replace(/\D/g,'')) : null;
		if (['amount','price','pay'].includes(action) && (!Number.isSafeInteger(payload.amount) || Number(payload.amount) < 1 || Number(payload.amount) > 1_000_000_000_000)) {
			localError = 'Nhập số tiền nguyên VND từ 1 đến 1.000 tỷ.'; return;
		}
		if (action === 'pay') payload.paid_on = date;
		if (action === 'stop') payload.stop_from = date;
		if (action === 'income') payload.cycle_start = cycle.start;
		await onsave(action, payload);
	}
</script>

<form onsubmit={submit} class="space-y-4">
	{#if localError}<p role="alert" class="text-sm text-deficit">{localError}</p>{/if}
	<fieldset disabled={busy} class="space-y-4">
		{#if row || item}<p class="font-semibold">{item?.name ?? row?.name}</p>{/if}
		{#if row}<p class="text-sm text-muted">Đến hạn: {row.due.split('-').reverse().join('/')}</p>{/if}
		{#if ['amount','price','pay','income'].includes(action)}
			<MoneyInput id="payable-action-amount" label={action === 'income' ? 'Thu nhập dự kiến của kỳ (VND)' : action === 'pay' ? 'Số tiền thanh toán toàn bộ lần này (VND)' : 'Số tiền (VND)'} value={amount} onchange={(v) => amount = v} />
		{/if}
		{#if action === 'income'}<p class="text-sm font-medium">Kỳ {cycle.start.split('-').reverse().join('/')} – {cycle.end.split('-').reverse().join('/')}</p><p class="text-sm text-muted">Để trống để dùng lại thu nhập mặc định. Thay đổi này chỉ áp dụng cho kỳ trên.</p>{/if}
		{#if action === 'pay'}
			<label class="block text-sm font-medium">Ngày đã thanh toán<input type="date" required min="2000-01-01" max={today} bind:value={date} class="ui-input mt-1 w-full border p-3" /></label>
			<p class="text-sm text-muted">Đánh dấu toàn bộ lần này đã trả. Không tạo khoản chi trong mục thu chi.</p>
		{:else if action === 'price'}<p class="text-sm text-muted">Giá mới áp dụng từ lần này và các lần tiếp theo. Các lần đã trả và lần có số tiền chỉnh riêng vẫn được giữ nguyên.</p>
		{:else if action === 'stop'}
			<label class="block text-sm font-medium">Không gia hạn từ ngày<input type="date" required min={shiftDate(today, 1)} max="2100-12-31" bind:value={date} class="ui-input mt-1 w-full border p-3" /></label>
			<p class="text-sm leading-relaxed text-muted">Các lần từ ngày này trở đi sẽ ngừng xuất hiện, trừ lần đã trả. Khoản đã đến hạn vẫn phải xử lý. Hãy hủy dịch vụ tại nhà cung cấp; Tideline chỉ cập nhật lịch theo dõi.</p>
		{:else if action === 'delete'}<p class="text-sm text-deficit">Xóa khoản này cùng lịch chưa thanh toán? Không thể hoàn tác. Chỉ dùng để sửa dữ liệu nhập nhầm; xóa theo dõi không xóa nghĩa vụ thực tế.</p>
		{:else if action === 'undo'}<p class="text-sm text-muted">Chuyển lần này về chưa trả. Nếu đã qua ngày đến hạn, khoản sẽ được tính là quá hạn.</p>{/if}
		<button type="submit" class="ui-button w-full {action === 'delete' ? 'ui-button-danger' : 'ui-button-primary'}">{busy ? 'Đang lưu…' : action === 'delete' ? 'Xóa khoản' : action === 'stop' ? 'Xác nhận ngừng gia hạn' : action === 'pay' ? 'Xác nhận đã trả' : 'Lưu thay đổi'}</button>
	</fieldset>
</form>

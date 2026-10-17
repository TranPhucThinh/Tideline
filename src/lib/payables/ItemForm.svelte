<script module lang="ts">
	import type { PayableItem, PayableKind } from './domain';
	export interface ItemDraft {
		id: string; name: string; provider: string; note: string; kind: PayableKind;
		amount: string; firstDue: string; count: number; estimated: boolean;
	}
	export function createItemDraft(item: PayableItem | null, today: string): ItemDraft {
		return { id: item?.id ?? crypto.randomUUID(), name: item?.name ?? '', provider: item?.provider ?? '', note: item?.note ?? '', kind: item?.kind ?? 'once', amount: String(item?.amount ?? ''), firstDue: item?.first_due ?? today, count: item?.count ?? 6, estimated: item?.estimated ?? false };
	}
</script>

<script lang="ts">
	import MoneyInput from '$lib/MoneyInput.svelte';
	import { kindLabels, validateItem } from './domain';
	let { item = null, draft = $bindable(), busy, onsave, hasPayments = false }: { item?: PayableItem | null; draft: ItemDraft; busy: boolean; hasPayments?: boolean; onsave: (action: string, payload: Record<string, unknown>) => Promise<boolean> } = $props();
	let localError = $state('');
	const editableSchedule = $derived(!item || (item.kind === 'once' && !hasPayments));
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const { id, name, provider, note, kind, amount, firstDue, count, estimated } = draft;
		const payload = { id, name, provider, note, kind, amount: Number(amount.replace(/\D/g, '')), first_due: firstDue, count: kind === 'installment' ? count : null, estimated };
		localError = validateItem(payload) ?? '';
		if (localError) return;
		if (item && !editableSchedule) {
			await onsave('edit', { id, name, provider, note, estimated });
		} else await onsave(item ? 'edit' : 'create', payload);
	}
</script>

<form onsubmit={submit} class="space-y-4">
	{#if localError}<p role="alert" class="text-sm text-deficit">{localError}</p>{/if}
	<fieldset disabled={busy} class="space-y-4">
		{#if !item}<label class="block text-sm font-medium">Loại khoản<select bind:value={draft.kind} class="ui-input mt-1 w-full border p-3">{#each Object.entries(kindLabels) as [value, label]}<option {value}>{label}</option>{/each}</select></label>{/if}
		<label class="block text-sm font-medium">Tên khoản<input required maxlength="120" bind:value={draft.name} placeholder="Ví dụ: Điện thoại, ChatGPT Plus…" class="ui-input mt-1 w-full border p-3" /></label>
		{#if editableSchedule}
			<MoneyInput id="payable-amount" label={draft.kind === 'once' ? 'Số tiền phải trả (VND)' : 'Số tiền mỗi lần (VND)'} value={draft.amount} onchange={(v) => draft.amount = v} />
			<label class="block text-sm font-medium">{draft.kind === 'once' ? 'Ngày đến hạn' : 'Ngày đến hạn đầu tiên'}<input type="date" required min="2000-01-01" max="2100-12-31" bind:value={draft.firstDue} class="ui-input mt-1 w-full min-w-0 border p-3" /></label>
			{#if draft.kind === 'installment'}<label class="block text-sm font-medium">Số lần còn phải trả<input type="number" min="1" max="600" required bind:value={draft.count} class="ui-input mt-1 w-full border p-3" /></label>{/if}
			{#if draft.kind !== 'once'}<p class="text-sm text-muted">Lặp hàng tháng vào cùng ngày. Tháng ngắn dùng ngày cuối tháng, tháng sau trở lại ngày gốc.</p>{/if}
		{:else}<p class="text-sm text-muted">Đổi số tiền từng lần trong lịch thanh toán. Với khoản định kỳ, có thể đổi giá từ một lần chưa trả trở đi.</p>{/if}
		<details open={!!(draft.provider || draft.note || draft.estimated)}>
			<summary class="min-h-11 cursor-pointer py-3 text-sm font-medium">Thông tin bổ sung <span class="font-normal text-muted">(tùy chọn)</span></summary>
			<div class="space-y-4 pt-2">
				<label class="block text-sm font-medium">Nhà cung cấp<input maxlength="120" bind:value={draft.provider} placeholder="SPayLater, ngân hàng…" class="ui-input mt-1 w-full border p-3" /></label>
				<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={draft.estimated} /> Số tiền ước tính (ví dụ dịch vụ thu ngoại tệ)</label>
				<label class="block text-sm font-medium">Ghi chú<textarea maxlength="1000" rows="2" bind:value={draft.note} class="ui-input mt-1 w-full border p-3"></textarea></label>
			</div>
		</details>
		<p class="text-sm leading-relaxed text-muted">Nhập số tiền đã gồm phí/lãi nếu có. Nếu ghi từng giao dịch thẻ, đừng nhập thêm tổng sao kê để tránh tính trùng.</p>
		<button class="ui-button ui-button-primary w-full" type="submit">{busy ? 'Đang lưu…' : item ? 'Lưu thay đổi' : 'Thêm khoản phải trả'}</button>
	</fieldset>
</form>

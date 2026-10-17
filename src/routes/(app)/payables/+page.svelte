<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import { formatMoney } from '$lib/money';
	import { salaryCycle, monthlyDate, shiftDate, occurrences, summarize, simulateSavings, statusOf, kindLabels, type SalaryCycle, type PayableItem, type Occurrence } from '$lib/payables/domain';
	import Modal from '$lib/payables/Modal.svelte';
	import ItemForm, { createItemDraft, type ItemDraft } from '$lib/payables/ItemForm.svelte';
	import SettingsForm from '$lib/payables/SettingsForm.svelte';
	import ActionForm from '$lib/payables/ActionForm.svelte';
	import OccurrenceList from '$lib/payables/OccurrenceList.svelte';
	let { data }: { data: PageData } = $props();
	let selectedDate = $state(untrack(() => data.today));
	let tab = $state('overview');
	let filter = $state('all');
	let kindFilter = $state('all');
	let providerFilter = $state('all');
	let modal = $state('');
	let selectedId = $state('');
	let selectedRow = $state<Occurrence | undefined>();
	let busy = $state(false);
	let error = $state('');
	let success = $state('');
	let excluded = $state<string[]>([]);
	let filtersOpen = $state(false);
	let returnToDetail = $state(false);
	let drafts = $state<Record<string, ItemDraft>>({});
	let draftBases = $state<Record<string, ItemDraft>>({});
	let draftKey = $state('');
	let resumedDraft = $state(false);
	const hasFilters = $derived(filter !== 'all' || kindFilter !== 'all' || providerFilter !== 'all');
	const p = $derived(data.payables);
	const current = $derived(salaryCycle(data.today, p.settings));
	function withIncome(c: SalaryCycle): SalaryCycle { return { ...c, income: p.incomes.find(i => i.cycle_start === c.start)?.amount ?? c.income }; }
	const cycle = $derived(withIncome(salaryCycle(selectedDate, p.settings)));
	const next = $derived(withIncome(salaryCycle(shiftDate(current.end, 1), p.settings)));
	const horizon = $derived([monthlyDate(data.today, 7), cycle.end, ...p.items.filter(i => i.kind === 'installment').map(i => monthlyDate(i.first_due, (i.count ?? 1) - 1))].sort().at(-1)!);
	const rows = $derived(occurrences(p.items, p.prices, p.overrides, horizon));
	const summary = $derived(summarize(rows, cycle, data.today));
	const nextSummary = $derived(summarize(rows, next, data.today));
	const savings = $derived(simulateSavings(rows, next, excluded));
	const visible = $derived(summary.inCycle.filter(r => (kindFilter === 'all' || r.kind === kindFilter) && (providerFilter === 'all' || r.provider === providerFilter) && (filter === 'all' || (filter === 'unpaid' ? statusOf(r, summary.asOf) !== 'paid' : statusOf(r, summary.asOf) === filter))));
	const providers = $derived([...new Set(summary.inCycle.map(i => i.provider).filter(Boolean))].sort());
	const selectedItem = $derived(p.items.find(i => i.id === selectedId));
	const detailRows = $derived(selectedItem ? occurrences([selectedItem], p.prices, p.overrides, [horizon, monthlyDate(selectedItem.first_due, selectedItem.kind === 'subscription' ? 6 : (selectedItem.count ?? 1) - 1)].sort().at(-1)!) : []);
	const detailFocus = $derived(detailRows.find(row => !row.paid_on) ?? detailRows.at(-1));
	const otherDetailRows = $derived(detailRows.filter(row => row.id !== detailFocus?.id));
	const editableItem = $derived(selectedItem ? { ...selectedItem, amount: selectedItem.kind === 'once' ? p.overrides.find(o => o.item_id === selectedItem.id && o.sequence === 0)?.amount ?? selectedItem.amount : selectedItem.amount } : null);
	const nextSubscriptions = $derived(p.items.filter(i => i.kind === 'subscription' && nextSummary.inCycle.some(r => r.item_id === i.id && !r.paid_on)));
	const pendingSetting = $derived(p.settings.find(s => s.effective_from > data.today));
	const dateLabel = (date: string) => date.split('-').reverse().join('/');
	const cycleLabel = (c: SalaryCycle) => `${dateLabel(c.start)} – ${dateLabel(c.end)}`;
	const titles: Record<string, string> = { create: 'Thêm khoản phải trả', settings: 'Kỳ lương riêng', edit: 'Chỉnh sửa khoản', detail: 'Chi tiết khoản', pay: 'Ghi nhận thanh toán', undo: 'Hoàn tác thanh toán', amount: 'Chỉnh số tiền lần này', price: 'Đổi giá định kỳ', income: 'Thu nhập dự kiến của kỳ', stop: 'Ngừng gia hạn', delete: 'Xóa khoản nhập nhầm' };
	function resetFilters() { filter = 'all'; kindFilter = 'all'; providerFilter = 'all'; }
	function changeCycle(date: string) { selectedDate = date; resetFilters(); }
	function open(type: string, row?: Occurrence, item?: PayableItem) {
		returnToDetail = modal === 'detail' && type !== 'detail';
		error = ''; success = ''; selectedRow = row;
		if (item) selectedId = item.id;
		else if (row) selectedId = row.item_id;
		else if (['create', 'settings', 'income'].includes(type)) selectedId = '';
		if (type === 'create' || type === 'edit') {
			draftKey = type === 'create' ? 'create' : `edit:${selectedId}`;
			resumedDraft = !!drafts[draftKey];
			if (type === 'edit') {
				const latest = createItemDraft(editableItem, data.today);
				const previous = drafts[draftKey];
				const baseline = draftBases[draftKey];
				// Preserve deliberate draft edits; refresh untouched fields after another adjustment.
				const edits = previous && baseline ? Object.fromEntries(Object.entries(previous).filter(([key, value]) => value !== baseline[key as keyof ItemDraft])) : {};
				drafts[draftKey] = { ...latest, ...edits };
				draftBases[draftKey] = { ...latest };
			} else drafts[draftKey] ??= createItemDraft(null, data.today);
		}
		modal = type;
	}
	function backToDetail() { if (!busy) { modal = 'detail'; returnToDetail = false; error = ''; } }
	function showItem(id: string) { selectedId = id; open('detail'); }
	async function save(action: string, payload: Record<string, unknown>): Promise<boolean> {
		if (busy) return false;
		busy = true; error = ''; success = '';
		try {
			const response = await fetch('/payables/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) });
			const result = await response.json();
			if (!response.ok) { error = result.error ?? 'Không lưu được. Vui lòng thử lại.'; return false; }
			await invalidate('app:payables');
			if (action === 'create' || action === 'edit') { delete drafts[draftKey]; delete draftBases[draftKey]; }
			modal = '';
			const messages: Record<string, string> = { create: 'Đã thêm khoản phải trả.', edit: 'Đã cập nhật thông tin khoản.', pay: 'Đã ghi nhận thanh toán.', undo: 'Đã chuyển khoản về chưa trả.', income: 'Đã cập nhật thu nhập của kỳ.', stop: 'Đã cập nhật lịch ngừng gia hạn.', delete: 'Đã xóa khoản.', settings: 'Đã lưu cài đặt kỳ lương.', amount: 'Đã cập nhật số tiền lần này.', price: 'Đã cập nhật giá định kỳ.' };
			success = messages[action] ?? 'Đã lưu thay đổi.';
			return true;
		} catch { error = 'Không kết nối được máy chủ. Nội dung đang nhập được giữ lại; bạn có thể thử lại.'; return false; }
		finally { busy = false; }
	}
</script>

<svelte:head><title>Khoản phải trả — Tideline</title></svelte:head>

<div class="space-y-4 md:space-y-5">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div><h1 class="page-title">Khoản phải trả</h1><p class="mt-2 max-w-lg text-sm leading-relaxed text-muted">Biết trước tiền cần dành ra cho mỗi kỳ lương.</p></div>
		{#if !data.loadError && p.settings.length}<div class="flex flex-wrap gap-2"><button class="ui-button ui-button-primary" onclick={() => open('create')}>+ Thêm khoản</button><button onclick={() => open('settings')} class="ui-button ui-button-secondary">Kỳ lương</button></div>{/if}
	</div>
	{#if data.loadError}
		<div role="alert" class="rounded-panel border border-deficit/30 bg-deficit-bg p-5"><p class="text-deficit">{data.loadError}</p><button class="ui-button ui-button-secondary mt-4" onclick={() => invalidate('app:payables')}>Thử tải lại</button></div>
	{:else if !p.settings.length}
		<section class="ui-panel max-w-xl rounded-panel border border-line bg-white p-6">
			<h2 class="section-title">Bắt đầu từ kỳ lương của bạn</h2>
			<p class="my-4 text-sm leading-relaxed text-muted">Thêm các khoản trả góp, trả sau và dịch vụ định kỳ để thấy tiền cần dành ra. Dữ liệu ở đây độc lập với thu chi hằng ngày.</p>
			{#if error}<p role="alert" class="mb-4 text-sm text-deficit">{error}</p>{/if}
			<SettingsForm settings={p.settings} {busy} onsave={save} />
		</section>
	{:else}
		{#if success}<p role="status" class="rounded-control bg-surplus-bg px-4 py-3 text-sm text-surplus">{success}</p>{/if}
		<div class="ui-segment payables-views" role="group" aria-label="Các phần khoản phải trả">
			{#each [['overview','Theo kỳ lương'],['items','Tất cả khoản'],['savings','Cắt giảm']] as [value,label]}<button onclick={() => tab = value} aria-label={label} aria-pressed={tab === value} class="min-w-0 rounded-control px-2 py-2 text-sm font-medium {tab === value ? 'bg-ink text-white' : 'text-muted hover:bg-surplus-bg'}">{value === 'overview' ? 'Theo kỳ' : label}</button>{/each}
		</div>
		{#if tab === 'overview'}
			<div class="flex items-center justify-between gap-2">
				<button aria-label="Kỳ trước" disabled={cycle.start <= '2000-02-01'} onclick={() => changeCycle(shiftDate(cycle.start, -1))} class="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6" /></svg></button>
				<div class="min-w-0 text-center"><p class="font-display text-sm font-semibold md:text-base">{cycleLabel(cycle)}</p>{#if cycle.start === current.start}<p class="text-xs text-muted">Kỳ hiện tại</p>{:else}<button onclick={() => changeCycle(data.today)} class="text-sm text-muted underline">Về kỳ hiện tại</button>{/if}</div>
				<button aria-label="Kỳ tiếp theo" disabled={cycle.end >= '2100-11-30'} onclick={() => changeCycle(shiftDate(cycle.end, 1))} class="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m10 6 6 6-6 6" /></svg></button>
			</div>
			<div class="payables-overview">
			<section class="balance-surface min-w-0 rounded-panel bg-surplus-bg p-4 md:p-5" aria-label="Dự tính của kỳ">
				<p class="text-sm font-medium">Còn lại sau các khoản của kỳ này</p>
				<p class="mt-2 break-words font-display text-3xl font-semibold tabular-nums {summary.remaining !== null && summary.remaining < 0 ? 'text-deficit' : 'text-ink'}">{summary.remaining === null ? 'Chưa có thu nhập dự kiến' : formatMoney(summary.remaining)}</p>
				{#if summary.remaining !== null && summary.remaining < 0}<p class="mt-2 text-sm text-deficit">Thiếu {formatMoney(-summary.remaining)} để đáp ứng các khoản của kỳ.</p>{/if}
				<p class="mt-2 text-sm leading-relaxed text-muted">Chưa trừ sinh hoạt và các chi phí khác.</p>
				{#if summary.arrears > 0}
					<div class="mt-3 border-t border-ink/15 pt-3">
						<p class="text-sm text-deficit">Còn {formatMoney(summary.arrears)} quá hạn từ kỳ trước</p>
						<p class="mt-1 text-sm font-medium">Sau cả khoản quá hạn: <strong class="font-display tabular-nums {summary.afterArrears !== null && summary.afterArrears < 0 ? 'text-deficit' : ''}">{summary.afterArrears === null ? 'Chưa có thu nhập dự kiến' : formatMoney(summary.afterArrears)}</strong></p>
						<details class="mt-2"><summary class="min-h-11 cursor-pointer py-3 text-sm underline underline-offset-4">Xem các khoản quá hạn</summary><div class="pt-3"><OccurrenceList rows={summary.arrearsRows} today={summary.asOf} {busy} historical={cycle.end < data.today} onaction={open} onitem={showItem} /></div></details>
						{#if cycle.start > data.today}<p class="text-sm text-muted">Chỉ gồm khoản đã quá hạn tính đến hôm nay.</p>{/if}
					</div>
				{/if}
				<details class="mt-3 border-t border-ink/15">
					<summary class="min-h-11 cursor-pointer py-3 text-sm font-medium">Chi tiết dự tính</summary>
					<div class="grid grid-cols-2 gap-4 pb-2">
						{#each [['Thu nhập dự kiến',cycle.income],['Tổng nghĩa vụ',summary.total],['Đã trả',summary.paid],['Chưa trả',summary.unpaid]] as [label,value]}
							<div class="min-w-0"><p class="text-sm text-muted">{label}</p><p class="mt-1 break-words font-display font-semibold tabular-nums">{value === null ? 'Chưa nhập' : formatMoney(Number(value))}</p></div>
						{/each}
					</div>
					<p class="mt-2 text-sm leading-relaxed text-muted">Thu nhập dự kiến trừ toàn bộ nghĩa vụ của kỳ, kể cả phần đã trả.</p>
					{#if cycle.income !== null}<button onclick={() => open('income')} class="mt-2 text-sm underline underline-offset-4">Sửa thu nhập kỳ này</button>{/if}
				</details>
				{#if cycle.income === null}<button onclick={() => open('income')} class="text-sm underline underline-offset-4">Nhập thu nhập kỳ này</button>{/if}
			</section>
			<section class="min-w-0 rounded-panel border border-line bg-white p-4 md:p-5" aria-labelledby="payment-schedule-title">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-x-3"><div><h2 id="payment-schedule-title" class="section-title">Lịch thanh toán</h2><p class="mt-1 text-sm text-muted">{visible.length} lần · Chưa trả {formatMoney(summary.unpaid)}</p></div><button aria-expanded={filtersOpen} aria-controls="payables-filters" onclick={() => filtersOpen = !filtersOpen} class="text-sm text-muted underline underline-offset-4">Bộ lọc{hasFilters ? ' · Đang lọc' : ''}</button></div>
				<div id="payables-filters" hidden={!filtersOpen}>
				<div class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
					<select aria-label="Lọc trạng thái" bind:value={filter} class="ui-input min-w-0 border p-2 text-sm"><option value="all">Mọi trạng thái</option><option value="unpaid">Chưa trả</option><option value="paid">Đã trả</option><option value="overdue">Quá hạn</option><option value="today">Đến hạn hôm nay</option><option value="soon">Sắp đến hạn</option></select>
					<select aria-label="Lọc loại khoản" bind:value={kindFilter} class="ui-input min-w-0 border p-2 text-sm"><option value="all">Mọi loại khoản</option>{#each Object.entries(kindLabels) as [value,label]}<option {value}>{label}</option>{/each}</select>
					<select aria-label="Lọc nhà cung cấp" bind:value={providerFilter} class="ui-input min-w-0 border p-2 text-sm"><option value="all">Mọi nhà cung cấp</option>{#each providers as value}<option {value}>{value}</option>{/each}</select>
				</div>
				</div>
				{#if hasFilters}<button onclick={resetFilters} class="mb-3 text-sm underline underline-offset-4">Xóa bộ lọc</button>{/if}
				{#if visible.length}<OccurrenceList rows={visible} today={summary.asOf} {busy} historical={cycle.end < data.today} onaction={open} onitem={showItem} />{:else}<p class="py-5 text-center text-sm text-muted">{summary.inCycle.length ? 'Không có khoản khớp bộ lọc.' : 'Chưa có khoản đến hạn trong kỳ này.'}</p>{/if}
			</section>
			</div>
			{#if cycle.end < data.today}<p class="text-sm text-muted">Tổng kết tại cuối kỳ {dateLabel(cycle.end)}. Thanh toán sau ngày này không làm thay đổi số đã trả tại thời điểm tổng kết; xem chi tiết khoản để biết trạng thái hiện tại.</p>{/if}
		{:else if tab === 'items'}
			<div class="grid gap-4 md:grid-cols-2">
				{#each p.items as item (item.id)}
					{@const paidCount = p.overrides.filter(o => o.item_id === item.id && o.paid_on).length}
					<button onclick={() => showItem(item.id)} class="rounded-panel border border-line bg-white p-5 text-left transition-colors hover:border-input-line">
						<div class="flex items-start justify-between gap-3"><h2 class="break-words font-semibold">{item.name}</h2><span class="shrink-0 text-xs text-muted">{kindLabels[item.kind]}</span></div>
						<p class="mt-2 text-sm text-muted">{item.provider || 'Chưa ghi nhà cung cấp'}</p>
						<p class="mt-4 font-display text-lg font-semibold">{formatMoney(item.kind === 'once' ? p.overrides.find(o => o.item_id === item.id && o.sequence === 0)?.amount ?? item.amount : rows.find(r => r.item_id === item.id && r.due >= data.today)?.amount ?? item.amount)}{item.kind !== 'once' ? ' / lần' : ''}</p>
						<p class="mt-2 text-xs text-muted">{item.kind === 'subscription' ? item.stop_from ? `Ngừng từ ${dateLabel(item.stop_from)}` : 'Gia hạn hàng tháng' : `Đã trả ${paidCount}/${item.kind === 'once' ? 1 : item.count} lần`}</p>
					</button>
				{:else}<p class="py-8 text-sm text-muted">Chưa có khoản nào. Thêm khoản đầu tiên để bắt đầu theo dõi.</p>{/each}
			</div>
		{:else}
			<section class="rounded-panel border border-line bg-white p-5">
				<h2 class="section-title">Thử điều chỉnh kỳ tới</h2><p class="mt-2 text-sm text-muted">Kỳ {cycleLabel(next)}. Chọn khoản định kỳ để xem dự tính nếu không tính các khoản đó.</p>
				<div class="my-5 divide-y divide-line">{#each nextSubscriptions as item}<label class="flex cursor-pointer items-center justify-between gap-3 py-4"><span class="flex items-center gap-3"><input type="checkbox" value={item.id} bind:group={excluded} /><span class="text-sm font-medium">{item.name}</span></span><span class="font-display text-sm font-semibold">{formatMoney(simulateSavings(rows, next, [item.id]))}</span></label>{:else}<p class="py-4 text-sm text-muted">Chưa có khoản định kỳ chưa trả trong kỳ tới để mô phỏng.</p>{/each}</div>
				<div class="rounded-control bg-surplus-bg p-4" role="status"><p class="text-sm">Tạm loại {formatMoney(savings)} khỏi dự tính kỳ tới</p><p class="mt-2 font-display text-xl font-semibold">{nextSummary.remaining === null ? 'Chưa có thu nhập dự kiến' : `Còn lại trong mô phỏng: ${formatMoney(nextSummary.remaining + savings)}`}</p></div>
				<p class="mt-4 text-sm leading-relaxed text-muted">Đây chỉ là mô phỏng. Khoản định kỳ có thể là cam kết thiết yếu; việc chọn ở đây không có nghĩa là khoản đó có thể bỏ. Lịch theo dõi và dịch vụ thực tế không thay đổi. Phần còn lại chưa trừ sinh hoạt và khoản quá hạn.</p>
			</section>
		{/if}
		{#if pendingSetting}<p class="text-xs text-muted">Cài đặt kỳ lương mới có hiệu lực từ {dateLabel(pendingSetting.effective_from)}, ngày bắt đầu định kỳ là {pendingSetting.day_start}.</p>{/if}
		<p class="text-xs leading-relaxed text-muted">Theo dõi độc lập với thu chi hằng ngày. Cảnh báo đến hạn hiển thị khi bạn mở ứng dụng.</p>
	{/if}
</div>

{#if modal}
	<Modal title={titles[modal] ?? ''} {busy} {error} onclose={() => { if (!busy) modal = ''; }} onback={returnToDetail ? backToDetail : undefined}>
		{#if modal === 'create' || modal === 'edit'}
			<p class="mb-4 text-sm text-muted">{resumedDraft ? 'Đã khôi phục nội dung bạn đang nhập. ' : ''}Nội dung được giữ khi đóng hộp thoại, cho đến khi tải lại hoặc rời trang.</p>
			{#key draftKey}<ItemForm item={modal === 'edit' ? editableItem : null} bind:draft={drafts[draftKey]} {busy} onsave={save} hasPayments={p.overrides.some(o => o.item_id === selectedId && !!o.paid_on)} />{/key}
		{:else if modal === 'settings'}<SettingsForm settings={p.settings} {busy} onsave={save} />
		{:else if modal === 'detail' && selectedItem}
			<div class="mb-5 space-y-3"><h3 class="font-display text-lg font-semibold">{selectedItem.name}</h3><p class="text-sm text-muted">{kindLabels[selectedItem.kind]}{selectedItem.provider ? ` · ${selectedItem.provider}` : ''}</p>{#if selectedItem.note}<p class="whitespace-pre-wrap text-sm">{selectedItem.note}</p>{/if}
				<div class="flex flex-wrap gap-2"><button class="ui-button ui-button-secondary text-sm" onclick={() => open('edit')}>Sửa thông tin</button>{#if selectedItem.kind === 'subscription' && !selectedItem.stop_from}<button class="ui-button ui-button-secondary text-sm" onclick={() => open('stop')}>Ngừng gia hạn</button>{/if}{#if !p.overrides.some(o => o.item_id === selectedId && !!o.paid_on)}<button class="ui-button ui-button-secondary text-sm text-deficit" onclick={() => open('delete')}>Xóa khoản</button>{/if}</div>
				{#if selectedItem.stop_from}<p class="text-sm text-muted">Ngừng từ {dateLabel(selectedItem.stop_from)}.</p>{/if}
				{#if selectedItem.kind === 'subscription'}<p class="text-xs text-muted">Lịch dự kiến đến {dateLabel(detailRows.at(-1)?.due ?? horizon)}. Các kỳ tiếp tục tự xuất hiện khi thời gian trôi qua.</p>{/if}
			</div>
			{#if detailFocus}
				<h3 class="mb-3 text-sm font-semibold text-muted">{detailFocus.paid_on ? 'Lần thanh toán gần nhất' : 'Lần chưa thanh toán gần nhất'}</h3>
				<OccurrenceList rows={[detailFocus]} today={data.today} {busy} onaction={open} />
			{/if}
			{#if otherDetailRows.length}
				<details class="mt-5 border-t border-line pt-2"><summary class="min-h-11 cursor-pointer py-3 text-sm font-medium">Xem {otherDetailRows.length} lần thanh toán khác</summary><div class="pt-3"><OccurrenceList rows={otherDetailRows} today={data.today} {busy} onaction={open} /></div></details>
			{/if}
			{#if !detailRows.length}<p class="text-sm text-muted">Không còn lần thanh toán nào trong lịch dự kiến.</p>{/if}
		{:else}
			{#key `${modal}:${selectedRow?.id ?? selectedId}`}<ActionForm action={modal} row={selectedRow} item={selectedItem} {cycle} today={data.today} {busy} onsave={save} />{/key}
		{/if}
	</Modal>
{/if}

<style>
	.payables-views { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.payables-overview { display: grid; align-items: start; gap: 1rem; }
	@media (min-width: 48rem) {
		.payables-overview { grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.35fr); gap: 1.5rem; }
	}
</style>

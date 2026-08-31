<script lang="ts">
	import { createClient } from '$lib/supabaseClient';
	import { todayKey } from '$lib/ledger';
	import { currentCycle, computeCycleLedger, type CycleBound } from '$lib/cycle';
	import { createLimitLookups } from '$lib/settings';
	import type { LimitSetting } from '$lib/types';
	import { formatMoney, parseMoneyInput } from '$lib/money';
	import DateField from '$lib/DateField.svelte';
	import Spinner from '$lib/Spinner.svelte';
	import ConfirmDialog from '$lib/ConfirmDialog.svelte';

	let { data } = $props();

	const supabase = createClient();

	type ExpenseItem = {
		id: string;
		user_id: string;
		amount: number;
		note: string | null;
		date: string;
		created_at: string;
	};

	// Tra cứu cài đặt theo TỪNG NGÀY từ lịch sử limit_settings (non-retroactive).
	const lookups = $derived(createLimitLookups((data.limitSettings as LimitSetting[] | undefined) ?? []));
	const dayStartForDate = $derived(lookups.dayStartForDate);
	const defaultLimitForDate = $derived(lookups.defaultLimitForDate);

	// Toàn bộ chi tiêu trong vòng hiện tại — nguồn sự thật duy nhất để tính ledger.
	let cycleExpenses = $state<ExpenseItem[]>(data.cycleExpenses);
	// (gán snapshot ban đầu; về sau chỉ đổi bằng thao tác thêm/xoá ở client)

	// Form state
	let amountInput = $state('');
	let noteInput = $state('');
	let dateInput = $state(todayKey());
	let submitting = $state(false);
	let formError = $state('');

	// Vòng hiện tại + tính ledger cả vòng (một lần) mỗi khi dữ liệu/cài đặt đổi.
	// day_start tra theo ngày → vòng đang chạy giữ nguyên ranh giới cũ (option a).
	const bound = $derived(currentCycle(dayStartForDate));
	const rows = $derived.by(() => {
		const spentByDate: Record<string, number> = {};
		for (const e of cycleExpenses) {
			spentByDate[e.date] = (spentByDate[e.date] ?? 0) + e.amount;
		}
		return computeCycleLedger(bound, defaultLimitForDate, spentByDate);
	});

	const today = $derived(todayKey());
	const todayRow = $derived(rows.find((r) => r.date === today) ?? null);
	const balance = $derived(todayRow?.balance ?? 0);
	const limitToday = $derived(todayRow?.limit ?? defaultLimitForDate(today));
	const spentToday = $derived(todayRow?.spent ?? 0);
	const isSurplus = $derived(balance >= 0);

	// Nhãn vòng, ví dụ "Vòng 21/07 – 20/08"
	const boundLabel = $derived.by(() => formatRange(bound));

	function formatRange(b: CycleBound): string {
		const { start, end } = b;
		const lbl = (s: string) => {
			const [y, m, d] = s.split('-').map(Number);
			return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
		};
		return `${lbl(start)} – ${lbl(end)}`;
	}

	// Chi tiêu theo ngày đang chọn trong form (mới nhất lên đầu)
	const selectedExpenses = $derived(
		cycleExpenses
			.filter((e) => e.date === dateInput)
			.sort((a, b) => a.created_at.localeCompare(b.created_at))
			.reverse()
	);
	// Nhãn ngày cho phần danh sách
	const selectedDateLabel = $derived.by(() => {
		const d = new Date(dateInput.length === 10 ? dateInput + 'T00:00:00' : dateInput);
		if (Number.isNaN(d.getTime())) return dateInput === today ? 'hôm nay' : dateInput;
		return d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' });
	});

	async function addExpense(e: SubmitEvent) {
		e.preventDefault();
		formError = '';
		const userId = data.user?.id;
		if (!userId) {
			formError = 'Phiên đăng nhập không hợp lệ.';
			return;
		}
		// Không cho nhập ngày trong tương lai
		if (dateInput > today) {
			formError = 'Không thể nhập chi tiêu cho ngày trong tương lai.';
			return;
		}
		const amount = parseMoneyInput(amountInput);
		if (amount === null) {
			formError = 'Nhập số tiền hợp lệ (số dương).';
			return;
		}
		submitting = true;
		try {
			const { data: inserted, error } = await supabase
				.from('expenses')
				.insert({
					user_id: userId,
					amount,
					note: noteInput.trim() ? noteInput.trim() : null,
					date: dateInput
				})
				.select('id, user_id, amount, note, date, created_at');

			if (error) {
				formError = error.message;
				return;
			}
			const row = inserted?.[0];
			if (row) {
				// Cập nhật danh sách để ledger/hiển thị phản ánh ngày đã chọn
				cycleExpenses = [...cycleExpenses, row as ExpenseItem];
				amountInput = '';
				noteInput = '';
			}
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Không thể lưu khoản chi.';
		} finally {
			submitting = false;
		}
	}

	let deletingId = $state<string | null>(null);
	let savingId = $state<string | null>(null);

	// --- Xoá: dùng hộp thoại xác nhận ---
	let confirmTarget = $state<ExpenseItem | null>(null);

	function requestRemove(exp: ExpenseItem) {
		confirmTarget = exp;
	}

	async function removeExpense() {
		const id = confirmTarget?.id ?? null;
		if (!id || deletingId) return;
		deletingId = id;
		const { error } = await supabase.from('expenses').delete().eq('id', id);
		if (!error) {
			cycleExpenses = cycleExpenses.filter((e) => e.id !== id);
			confirmTarget = null;
		}
		deletingId = null;
	}

	// --- Sửa khoản chi (amount + note, giữ nguyên ngày) ---
	let editingId = $state<string | null>(null);
	let editAmount = $state('');
	let editNote = $state('');
	let editError = $state('');

	function startEdit(exp: ExpenseItem) {
		editingId = exp.id;
		editAmount = String(exp.amount);
		editNote = exp.note ?? '';
		editError = '';
	}

	function cancelEdit() {
		editingId = null;
		editAmount = '';
		editNote = '';
		editError = '';
	}

	async function saveEdit(exp: ExpenseItem) {
		editError = '';
		const amount = parseMoneyInput(editAmount);
		if (amount === null) {
			editError = 'Nhập số tiền hợp lệ (số dương).';
			return;
		}
		savingId = exp.id;
		const { error } = await supabase
			.from('expenses')
			.update({ amount, note: editNote.trim() ? editNote.trim() : null })
			.eq('id', exp.id);
		if (error) {
			editError = error.message;
		} else {
			cycleExpenses = cycleExpenses.map((e) =>
				e.id === exp.id ? { ...e, amount, note: editNote.trim() ? editNote.trim() : null } : e
			);
			cancelEdit();
		}
		savingId = null;
	}
</script>

<svelte:head>
	<title>Hôm nay — chi tiêu</title>
</svelte:head>

<p class="mb-3 text-xs font-medium text-muted">Vòng {boundLabel}</p>

<!-- Hero -->
<section
	class="rounded-2xl px-6 py-7 {isSurplus ? 'bg-surplus-bg' : 'bg-deficit-bg'}"
	aria-live="polite"
>
	<p class="text-sm font-medium {isSurplus ? 'text-surplus' : 'text-deficit'}">
		{isSurplus ? 'Còn lại hôm nay' : 'Đã vượt hạn mức'}
	</p>
	<p
		class="font-display mt-2 text-4xl font-bold tabular-nums {isSurplus ? 'text-surplus' : 'text-deficit'}"
	>
		{formatMoney(Math.abs(balance))}
	</p>

	{#if !isSurplus}
		<p class="mt-1 text-sm opacity-80 {isSurplus ? '' : 'text-deficit'}">
			Vượt {formatMoney(Math.abs(balance))} so với hạn mức hôm nay
		</p>
	{/if}

	<div
		class="mt-4 flex items-center justify-between border-t pt-3 text-sm {isSurplus ? 'border-surplus/20 text-surplus' : 'border-deficit/25 text-deficit'}"
	>
		<span>
			Hạn mức
			<span class="font-semibold">{formatMoney(limitToday)}</span>
		</span>
		<span>
			Đã chi
			<span class="font-semibold">{formatMoney(spentToday)}</span>
		</span>
	</div>
</section>

<!-- Form thêm khoản chi -->
<form onsubmit={addExpense} class="mt-5 rounded-2xl border border-line bg-white p-4 shadow-sm">
	<h2 class="font-display text-base font-semibold">Thêm khoản chi</h2>

	{#if formError}
		<p class="mt-2 rounded-lg bg-deficit-bg px-3 py-2 text-sm text-deficit">{formError}</p>
	{/if}

	<div class="mt-3 space-y-3">
		<DateField
			label="Ngày"
			value={dateInput}
			max={today}
			onchange={(d) => (dateInput = d)}
		/>
		<div>
			<label for="amount" class="text-sm font-medium text-muted">Số tiền (đ)</label>
			<input
				id="amount"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				placeholder="0"
				bind:value={amountInput}
				class="font-display mt-1 w-full rounded-xl border border-line bg-cream px-4 py-3 text-lg font-semibold tabular-nums outline-none focus:border-ink"
			/>
		</div>
		<div>
			<label for="note" class="text-sm font-medium text-muted">Ghi chú</label>
			<input
				id="note"
				type="text"
				placeholder="Ví dụ: cà phê sáng"
				bind:value={noteInput}
				class="mt-1 w-full rounded-xl border border-line bg-cream px-4 py-3 text-base outline-none focus:border-ink"
			/>
		</div>
		<button
			type="submit"
			disabled={submitting}
			class="w-full rounded-xl bg-ink py-3 text-base font-semibold text-white transition-opacity disabled:opacity-50"
		>
			{submitting ? 'Đang lưu…' : 'Thêm khoản chi'}
		</button>
	</div>
</form>

<!-- Danh sách khoản chi cho ngày đang chọn -->
<section class="mt-6">
	<h2 class="font-display text-base font-semibold">Chi tiêu {selectedDateLabel}</h2>

	{#if selectedExpenses.length === 0}
		<p class="mt-3 rounded-xl border border-dashed border-line bg-white/60 px-4 py-6 text-center text-sm text-muted">
			Ngày này chưa có khoản chi nào.
		</p>
	{:else}
		<ul class="mt-3 space-y-2">
			{#each selectedExpenses as exp (exp.id)}
				{@const isEditing = editingId === exp.id}
				<li
					class="rounded-xl border border-line bg-white px-4 py-3 {isEditing ? 'ring-2 ring-ink/20' : ''}"
				>
					{#if isEditing}
						<!-- Form sửa khoản chi -->
						{#if editError}
							<p class="mb-2 rounded-lg bg-deficit-bg px-3 py-2 text-sm text-deficit">{editError}</p>
						{/if}
						<div>
							<label for="edit-amount" class="text-sm font-medium text-muted">Số tiền (đ)</label>
							<input
								id="edit-amount"
								type="text"
								inputmode="numeric"
								autocomplete="off"
								placeholder="0"
								bind:value={editAmount}
								class="font-display mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-lg font-semibold tabular-nums outline-none focus:border-ink"
							/>
						</div>
						<div class="mt-2">
							<label for="edit-note" class="text-sm font-medium text-muted">Ghi chú</label>
							<input
								id="edit-note"
								type="text"
								placeholder="Ví dụ: cà phê sáng"
								bind:value={editNote}
								class="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2 text-base outline-none focus:border-ink"
							/>
						</div>
						<div class="mt-3 flex gap-2">
							<button
								type="button"
								onclick={() => saveEdit(exp)}
								disabled={savingId === exp.id}
								class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-base font-semibold text-white disabled:opacity-50"
							>
								{#if savingId === exp.id}
									<Spinner color="white" size={16} />
									Đang lưu…
								{:else}
									Lưu
								{/if}
							</button>
							<button
								type="button"
								onclick={cancelEdit}
								disabled={savingId === exp.id}
								class="flex-1 rounded-xl border border-line bg-cream py-2.5 text-base font-semibold text-ink disabled:opacity-50"
							>
								Huỷ
							</button>
						</div>
					{:else}
						<!-- Điều khiển: thông tin + nút sửa & xoá -->
						<div class="flex items-center justify-between gap-3">
							<button
								type="button"
								onclick={() => startEdit(exp)}
								class="min-w-0 flex-1 text-left"
								aria-label="Sửa khoản chi"
							>
								<p class="truncate text-sm">
									{#if exp.note}
										{exp.note}
									{:else}
										<span class="text-muted">Không ghi chú</span>
									{/if}
								</p>
								<p class="font-display text-base font-semibold tabular-nums">
									{formatMoney(exp.amount)}
								</p>
							</button>
							<div class="flex shrink-0 items-center gap-1">
								<button
									type="button"
									onclick={() => startEdit(exp)}
									aria-label="Sửa khoản chi"
									class="rounded-lg px-2 py-1 text-muted transition-colors hover:bg-cream hover:text-ink"
								>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
										<path d="m15 5 4 4" />
									</svg>
								</button>
								<button
									type="button"
									onclick={() => requestRemove(exp)}
									aria-label="Xoá khoản chi"
									disabled={deletingId === exp.id}
									class="rounded-lg px-2 py-1 transition-colors {deletingId === exp.id ? 'cursor-wait opacity-60' : 'text-muted hover:bg-deficit-bg hover:text-deficit'}"
								>
									{#if deletingId === exp.id}
										<Spinner color="deficit" size={18} />
									{:else}
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M3 6h18" />
											<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
											<path d="M10 11v6" />
											<path d="M14 11v6" />
										</svg>
									{/if}
								</button>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<!-- Hộp thoại xác nhận xoá -->
<ConfirmDialog
	open={confirmTarget !== null}
	title="Xoá khoản chi?"
	message={confirmTarget
		? `Bạn có chắc muốn xoá khoản ${formatMoney(confirmTarget.amount)}${confirmTarget.note ? ` “${confirmTarget.note}”` : ''}? Thao tác này không thể hoàn tác.`
		: ''}
	confirmLabel="Xoá"
	cancelLabel="Huỷ"
	danger
	busy={deletingId !== null}
	onconfirm={removeExpense}
	oncancel={() => (confirmTarget = null)}
/>
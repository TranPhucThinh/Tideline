<script lang="ts">
	import { createClient } from '$lib/supabaseClient';
	import { computeMonthLedger, currentMonth, todayKey } from '$lib/ledger';
	import { formatMoney, parseMoneyInput } from '$lib/money';

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

	// Toàn bộ chi tiêu trong tháng hiện tại — nguồn sự thật duy nhất để tính ledger.
	let monthExpenses = $state<ExpenseItem[]>(data.monthExpenses);
	// (gán snapshot ban đầu; về sau chỉ đổi bằng thao tác thêm/xoá ở client)

	// Form state
	let amountInput = $state('');
	let noteInput = $state('');
	let dateInput = $state(todayKey());
	let submitting = $state(false);
	let formError = $state('');

	// Tính ledger cả tháng (một lần) mỗi khi dữ liệu/defaultLimit đổi.
	let rows = $derived.by(() => {
		const defaultLimit = data.defaultLimit ?? 100000;
		const mdl = currentMonth();
		const spentByDate: Record<string, number> = {};
		for (const e of monthExpenses) {
			spentByDate[e.date] = (spentByDate[e.date] ?? 0) + e.amount;
		}
		return computeMonthLedger({
			year: mdl.year,
			month: mdl.month,
			defaultLimit,
			spentByDate
		});
	});

	const today = $derived(todayKey());
	const todayRow = $derived(rows.find((r) => r.date === today) ?? null);
	const balance = $derived(todayRow?.balance ?? 0);
	const limitToday = $derived(todayRow?.limit ?? data.defaultLimit ?? 100000);
	const spentToday = $derived(todayRow?.spent ?? 0);
	const isSurplus = $derived(balance >= 0);

	// Chi tiêu theo ngày đang chọn trong form (mới nhất lên đầu)
	const selectedExpenses = $derived(
		monthExpenses
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
				// Cập nhật lại toàn bộ tháng để ledger/hiển thị phản ánh đúng ngày đã chọn
				monthExpenses = [...monthExpenses, row as ExpenseItem];
				amountInput = '';
				noteInput = '';
			}
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Không thể lưu khoản chi.';
		} finally {
			submitting = false;
		}
	}

	async function removeExpense(id: string) {
		const { error } = await supabase.from('expenses').delete().eq('id', id);
		if (!error) {
			monthExpenses = monthExpenses.filter((e) => e.id !== id);
		}
	}
</script>

<svelte:head>
	<title>Hôm nay — chi tiêu</title>
</svelte:head>

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
		<div>
			<label for="date" class="text-sm font-medium text-muted">Ngày</label>
			<input
				id="date"
				type="date"
				bind:value={dateInput}
				max={today}
				class="mt-1 w-full rounded-xl border border-line bg-cream px-4 py-3 text-base outline-none focus:border-ink"
			/>
		</div>
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
				<li
					class="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"
				>
					<div class="min-w-0">
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
					</div>
					<button
						onclick={() => removeExpense(exp.id)}
						aria-label="Xoá khoản chi"
						class="rounded-lg px-2 py-1 text-muted transition-colors hover:bg-deficit-bg hover:text-deficit"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M3 6h18" />
							<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
							<path d="M10 11v6" />
							<path d="M14 11v6" />
						</svg>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
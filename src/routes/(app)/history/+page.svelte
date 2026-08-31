<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		addMonths,
		computeMonthLedger,
		currentMonth,
		monthIsAfter,
		monthKeyToString,
		todayKey
	} from '$lib/ledger';
	import { formatMoney, formatSignedMoney } from '$lib/money';

	let { data } = $props();

	const defaultLimit = $derived(data.defaultLimit ?? 100000);
	const requested = $derived(data.requestedMonth ?? currentMonth());
	const cur = $derived(currentMonth());
	const isCurrentMonth = $derived(
		requested.year === cur.year && requested.month === cur.month
	);

	// Không cho xem tháng tương lai xa hơn tháng hiện tại
	const nextAllowed = $derived(monthIsAfter(addMonths(requested, 1), cur));

	const canGoNext = $derived(!nextAllowed);

	const rows = $derived.by(() => {
		const spentByDate: Record<string, number> = {};
		for (const e of data.monthExpenses) {
			spentByDate[e.date] = (spentByDate[e.date] ?? 0) + e.amount;
		}
		return computeMonthLedger({
			year: requested.year,
			month: requested.month,
			defaultLimit,
			spentByDate
		});
	});

	// Nếu là tháng hiện tại, chỉ hiển thị tới ngày hôm nay
	const today = $derived(todayKey());
	const visibleRows = $derived(
		isCurrentMonth ? rows.filter((r) => r.date <= today) : rows
	);

	const totalSpent = $derived(visibleRows.reduce((s, r) => s + r.spent, 0));

	function goMonth(delta: number) {
		const target = addMonths(requested, delta);
		goto(`/history?month=${monthKeyToString(target)}`, {
			replaceState: false,
			invalidateAll: true
		});
	}

	const monthLabel = $derived.by(() => {
		const d = new Date();
		d.setFullYear(requested.year, requested.month - 1, 1);
		return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
	});
</script>

<svelte:head>
	<title>Lịch sử — chi tiêu</title>
</svelte:head>

<!-- Tiêu đề + chuyển tháng -->
<div class="mb-5">
	<div class="flex items-center justify-between">
		<h1 class="font-display text-xl font-bold capitalize">{monthLabel}</h1>
	</div>
	<div class="mt-3 flex items-center justify-between">
		<button
			onclick={() => goMonth(-1)}
			class="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium"
		>
			&larr; Tháng trước
		</button>
		<span class="text-sm text-muted">{formatMoney(totalSpent)} đã chi</span>
		<button
			onclick={() => goMonth(1)}
			disabled={!canGoNext}
			class="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
		>
			Tháng sau &rarr;
		</button>
	</div>
</div>

<!-- Bảng chi tiết từng ngày -->
<section>
	<div class="rounded-2xl border border-line bg-white">
		<div
			class="grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted"
		>
			<span>Ngày</span>
			<span class="text-right">Hạn mức</span>
			<span class="text-right">Đã chi</span>
			<span class="text-right">Số dư</span>
		</div>

		<ul>
			{#each visibleRows as row (row.date)}
				<li
					class="grid grid-cols-[3rem_1fr_1fr_1fr] items-center gap-2 border-b border-line px-4 py-2.5 last:border-0 text-sm"
				>
					<span class="font-display font-semibold">{row.day}</span>
					<span class="font-display tabular-nums text-right text-muted">{formatMoney(row.limit)}</span>
					<span class="tabular-nums text-right">{formatMoney(row.spent)}</span>
					<span
						class="font-display tabular-nums text-right font-semibold
							{row.balance > 0 ? 'text-surplus' : row.balance < 0 ? 'text-deficit' : 'text-muted'}"
					>
						{formatSignedMoney(row.balance)}
					</span>
				</li>
			{/each}
		</ul>
	</div>

	{#if visibleRows.length === 0}
		<p class="mt-4 rounded-xl border border-dashed border-line bg-white/60 px-4 py-6 text-center text-sm text-muted">
			Tháng này chưa có dữ liệu.
		</p>
	{/if}
</section>

{#if isCurrentMonth}
	<p class="mt-4 text-xs text-muted">Đang hiển thị đến ngày hôm nay.</p>
{/if}
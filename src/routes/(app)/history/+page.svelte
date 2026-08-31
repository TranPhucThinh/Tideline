<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		computeCycleLedger,
		prevCycle,
		nextCycle,
		todayKey,
		type CycleBound
	} from '$lib/cycle';
	import { formatMoney, formatSignedMoney } from '$lib/money';

	let { data } = $props();

	const defaultLimit = $derived((data.defaultLimit as number | undefined) ?? 100000);
	const dayStart = $derived((data.dayStart as number | undefined) ?? 1);
	const bound: CycleBound = $derived(data.bound);
	const isCurrent = $derived(data.isCurrent);

	const rows = $derived.by(() => {
		const spentByDate: Record<string, number> = {};
		for (const e of data.cycleExpenses) {
			spentByDate[e.date] = (spentByDate[e.date] ?? 0) + e.amount;
		}
		return computeCycleLedger(bound, defaultLimit, spentByDate);
	});

	// Nếu là vòng hiện tại, chỉ hiển thị tới ngày hôm nay
	const today = $derived(todayKey());
	const visibleRows = $derived(isCurrent ? rows.filter((r) => r.date <= today) : rows);

	const totalSpent = $derived(visibleRows.reduce((s, r) => s + r.spent, 0));

	function goCycle(delta: number) {
		const target = delta < 0 ? prevCycle(bound, dayStart) : nextCycle(bound, dayStart);
		goto(`/history?start=${target.start}`, {
			replaceState: false,
			invalidateAll: true
		});
	}

	function fmt(s: string): string {
		const [y, m, d] = s.split('-').map(Number);
		return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
	}

	const header = $derived.by(() => {
		return isCurrent ? `${fmt(bound.start)} – hôm nay` : `${fmt(bound.start)} – ${fmt(bound.end)}`;
	});
</script>

<svelte:head>
	<title>Lịch sử — chi tiêu</title>
</svelte:head>

<!-- Tiêu đề + chuyển vòng -->
<div class="mb-5">
	<h1 class="font-display text-xl font-bold">Lịch sử</h1>
	<div class="mt-3 flex items-center justify-between">
		<button
			onclick={() => goCycle(-1)}
			class="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium"
		>
			&larr; Vòng trước
		</button>
		<span class="text-xs text-muted">{header}<br />{formatMoney(totalSpent)} đã chi</span>
		<button
			onclick={() => goCycle(1)}
			disabled={isCurrent}
			class="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
		>
			Vòng sau &rarr;
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
			Vòng này chưa có dữ liệu.
		</p>
	{/if}
</section>
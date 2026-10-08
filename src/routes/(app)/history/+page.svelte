<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		computeCycleLedger,
		prevCycle,
		nextCycle,
		todayKey,
		type CycleBound
	} from '$lib/cycle';
	import { formatMoney } from '$lib/money';
	import LedgerTable from '$lib/LedgerTable.svelte';
	import { createLimitLookups } from '$lib/settings';
	import type { LimitSetting } from '$lib/types';

	let { data } = $props();

	const lookups = $derived(createLimitLookups((data.limitSettings as LimitSetting[] | undefined) ?? []));
	const dayStartForDate = $derived(lookups.dayStartForDate);
	const defaultLimitForDate = $derived(lookups.defaultLimitForDate);
	const bound: CycleBound = $derived(data.bound);
	const isCurrent = $derived(data.isCurrent);

	const rows = $derived.by(() => {
		const spentByDate: Record<string, number> = {};
		for (const e of data.cycleExpenses) {
			spentByDate[e.date] = (spentByDate[e.date] ?? 0) + e.amount;
		}
		const incomeByDate: Record<string, number> = {};
		for (const inc of data.cycleIncomes ?? []) {
			incomeByDate[inc.date] = (incomeByDate[inc.date] ?? 0) + inc.amount;
		}
		return computeCycleLedger(bound, defaultLimitForDate, spentByDate, incomeByDate);
	});

	// Nếu là vòng hiện tại, chỉ hiển thị tới ngày hôm nay
	const today = $derived(todayKey());
	const visibleRows = $derived(isCurrent ? rows.filter((r) => r.date <= today) : rows);

	const totalSpent = $derived(visibleRows.reduce((s, r) => s + r.spent, 0));
	const totalIncome = $derived(visibleRows.reduce((s, r) => s + r.income, 0));

	function goCycle(delta: number) {
		const target = delta < 0 ? prevCycle(bound, dayStartForDate) : nextCycle(bound, dayStartForDate);
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
<div class="mb-6">
	<h1 class="page-title">Lịch sử</h1>
	<p class="page-context mt-2">{header}</p>
	<p class="page-context mt-1"><span class="money">{formatMoney(totalSpent)}</span> chi · <span class="money">+{formatMoney(totalIncome)}</span> thu</p>
	<div class="cycle-controls">
		<button
			onclick={() => goCycle(-1)}
			class="ui-button ui-button-secondary text-sm"
		>
			&larr; Vòng trước
		</button>
		<button
			onclick={() => goCycle(1)}
			disabled={isCurrent}
			class="ui-button ui-button-secondary text-sm"
		>
			Vòng sau &rarr;
		</button>
	</div>
</div>

<!-- Bảng chi tiết từng ngày -->
<section>
	<LedgerTable rows={visibleRows} compactRows label="Lịch sử chi tiêu" />

	{#if visibleRows.length === 0}
		<p class="mt-4 rounded-xl border border-dashed border-line bg-white/60 px-4 py-6 text-center text-sm text-muted">
			Vòng này chưa có dữ liệu.
		</p>
	{/if}
</section>

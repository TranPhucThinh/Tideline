<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		computeCycleLedger,
		prevCycle,
		nextCycle,
		todayKey,
		type CycleBound
	} from '$lib/cycle';
	import { formatMoney, formatSignedMoney } from '$lib/money';
	import Chart from 'chart.js/auto';

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

	const today = $derived(todayKey());
	const visibleRows = $derived(isCurrent ? rows.filter((r) => r.date <= today) : rows);

	// ---- View toggle ----
	type View = 'summary' | 'chart' | 'list';
	let view = $state<View>('summary');
	let chartMetric = $state<'balance' | 'spent'>('balance');
	const chartMetrics = [
		{ id: 'balance', label: 'Số dư' },
		{ id: 'spent', label: 'Đã chi' }
	] as const;

	// ---- Summary metrics ----
	const summary = $derived.by(() => {
		const rs = visibleRows;
		const totalSpent = rs.reduce((s, r) => s + r.spent, 0);
		const endBalance = rs.length ? rs[rs.length - 1].balance : 0;
		const nDays = rs.length;
		const avgSpend = nDays ? totalSpent / nDays : 0;
		const daysOver = rs.filter((r) => r.balance < 0).length;
		const daysSurplus = rs.filter((r) => r.balance > 0).length;

		let maxSpentDay: { cycleDay: number; value: number } | null = null;
		let bestSaveDay: { cycleDay: number; value: number } | null = null;
		for (const r of rs) {
			if (!maxSpentDay || r.spent > maxSpentDay.value) maxSpentDay = { cycleDay: r.cycleDay, value: r.spent };
			if (!bestSaveDay || r.balance > bestSaveDay.value) bestSaveDay = { cycleDay: r.cycleDay, value: r.balance };
		}
		const saved = endBalance >= 0 ? endBalance : 0;
		const deficit = endBalance < 0 ? -endBalance : 0;

		return {
			totalSpent,
			endBalance,
			nDays,
			avgSpend,
			daysOver,
			daysSurplus,
			maxSpentDay,
			bestSaveDay,
			saved,
			deficit
		};
	});

	function fmt(s: string): string {
		const [y, m, d] = s.split('-').map(Number);
		return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
	}
	const header = $derived.by(() =>
		isCurrent ? `${fmt(bound.start)} – hôm nay` : `${fmt(bound.start)} – ${fmt(bound.end)}`
	);

	function goCycle(delta: number) {
		const target = delta < 0 ? prevCycle(bound, dayStart) : nextCycle(bound, dayStart);
		goto(`/stats?start=${target.start}`, {
			replaceState: false,
			invalidateAll: true
		});
	}

	// ---- Chart.js ----
	let canvas: HTMLCanvasElement | undefined = $state();
	let chart: Chart | null = null;

	$effect(() => {
		if (view !== 'chart' || !canvas) return;
		const labels = visibleRows.map((r) => `N${r.cycleDay}`);
		const dateLabels = visibleRows.map((r) => r.date);
		const metric = chartMetric;
		const values = visibleRows.map((r) => (metric === 'balance' ? r.balance : r.spent));

		if (chart) chart.destroy();

		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label: metric === 'balance' ? 'Số dư (đ)' : 'Đã chi (đ)',
						data: values,
						backgroundColor: (context) => {
							if (metric !== 'balance') return '#16302B';
							const v = context.raw as number;
							return v < 0 ? '#C1553D' : v > 0 ? '#2F7A5E' : '#E2DDD5';
						},
						borderRadius: 4
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							title: (items) => {
								const i = items[0]?.dataIndex;
								return dateLabels[i] ? fmt(dateLabels[i]) : '';
							},
							label: (ctx) => {
								const v = ctx.raw as number;
								return formatSignedMoney(v);
							}
						}
					}
				},
				scales: {
					y: {
						ticks: { callback: (value) => formatMoney(Number(value)) }
					}
				}
			}
		});

		return () => {
			if (chart) {
				chart.destroy();
				chart = null;
			}
		};
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});
</script>

<svelte:head>
	<title>Thống kê — chi tiêu</title>
</svelte:head>

<!-- Tiêu đề + chuyển vòng -->
<div class="mb-5">
	<h1 class="font-display text-xl font-bold">Thống kê</h1>
	<p class="mt-0.5 text-xs text-muted">Vòng {header}</p>
	<div class="mt-3 flex items-center justify-between gap-3">
		<button onclick={() => goCycle(-1)} class="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium">
			&larr; Vòng trước
		</button>
		<button
			onclick={() => goCycle(1)}
			disabled={isCurrent}
			class="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
		>
			Vòng sau &rarr;
		</button>
	</div>
</div>

<!-- Bộ chọn view -->
<div class="mb-4 grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-white p-1" role="tablist">
	{#each (['summary', 'chart', 'list'] as const) as v}
		<button
			role="tab"
			aria-selected={view === v}
			onclick={() => (view = v)}
			class="rounded-lg py-2 text-sm font-medium transition-colors {view === v ? 'bg-ink text-white' : 'text-muted hover:text-ink'}"
		>
			{v === 'summary' ? 'Tóm tắt' : v === 'chart' ? 'Biểu đồ' : 'Danh sách'}
		</button>
	{/each}
</div>

{#if view === 'summary'}
	{#if visibleRows.length === 0}
		<p class="rounded-xl border border-dashed border-line bg-white/60 px-4 py-6 text-center text-sm text-muted">
			Vòng này chưa có dữ liệu.
		</p>
	{:else}
		<div class="grid grid-cols-2 gap-3">
			{@render StatCard({ label: 'Tổng đã chi', value: formatMoney(summary.totalSpent) })}
			{@render StatCard({ label: 'Trung bình / ngày', value: formatMoney(summary.avgSpend) })}
			{@render StatCard({ label: 'Ngày vượt hạn mức', value: `${summary.daysOver}/${summary.nDays}`, accent: summary.daysOver > 0 ? 'deficit' : 'normal' })}
			{@render StatCard({ label: 'Ngày tiết kiệm', value: `${summary.daysSurplus}/${summary.nDays}`, accent: 'surplus' })}
			{@render StatCard({ label: summary.deficit > 0 ? 'Còn thiếu cuối kỳ' : 'Tiết kiệm cuối kỳ', value: formatMoney(summary.deficit > 0 ? summary.deficit : summary.saved), accent: summary.deficit > 0 ? 'deficit' : 'surplus' })}
			{@render StatCard({ label: 'Số dư cuối kỳ', value: formatSignedMoney(summary.endBalance), accent: summary.endBalance < 0 ? 'deficit' : summary.endBalance > 0 ? 'surplus' : 'normal' })}
		</div>

		<div class="mt-3 rounded-2xl border border-line bg-white p-4">
			<h2 class="font-display text-base font-semibold">Cao điểm</h2>
			<ul class="mt-2 space-y-1.5 text-sm text-muted">
				<li>
					Ngày chi nhiều nhất:
					<span class="text-ink">N{summary.maxSpentDay?.cycleDay}</span>
					<span class="font-display ml-1 font-semibold text-ink">{formatMoney(summary.maxSpentDay?.value ?? 0)}</span>
				</li>
				<li>
					Ngày tiết kiệm nhiều nhất:
					<span class="text-ink">N{summary.bestSaveDay?.cycleDay}</span>
					<span class="font-display ml-1 font-semibold text-surplus">{formatSignedMoney(summary.bestSaveDay?.value ?? 0)}</span>
				</li>
			</ul>
		</div>
	{/if}
{:else if view === 'chart'}
	<div class="rounded-2xl border border-line bg-white p-4">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="font-display text-base font-semibold">Biểu đồ hàng ngày</h2>
			<div class="flex overflow-hidden rounded-lg border border-line">
				{#each chartMetrics as m}
					<button
						onclick={() => (chartMetric = m.id)}
						class="px-3 py-1.5 text-xs font-medium transition-colors {chartMetric === m.id ? 'bg-ink text-white' : 'bg-white text-muted'}"
					>
						{m.label}
					</button>
				{/each}
			</div>
		</div>
		<div class="relative h-72">
			<canvas bind:this={canvas}></canvas>
		</div>
	</div>
{:else}
	<div class="rounded-2xl border border-line bg-white">
		<div class="grid grid-cols-[3.5rem_1fr_1fr_1fr] gap-2 border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
			<span>Ngày</span>
			<span class="text-right">Hạn mức</span>
			<span class="text-right">Đã chi</span>
			<span class="text-right">Số dư</span>
		</div>
		<ul>
			{#each visibleRows as row (row.date)}
				<li class="grid grid-cols-[3.5rem_1fr_1fr_1fr] items-center gap-2 border-b border-line px-4 py-2.5 text-sm last:border-0">
					<span class="font-display font-semibold">N{row.cycleDay}</span>
					<span class="font-display tabular-nums text-right text-muted">{formatMoney(row.limit)}</span>
					<span class="tabular-nums text-right">{formatMoney(row.spent)}</span>
					<span class="font-display tabular-nums text-right font-semibold {row.balance > 0 ? 'text-surplus' : row.balance < 0 ? 'text-deficit' : 'text-muted'}">
						{formatSignedMoney(row.balance)}
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}

{#if isCurrent}
	<p class="mt-4 text-xs text-muted">Đang hiển thị đến ngày hôm nay.</p>
{/if}

{#snippet StatCard(opts: { label: string; value: string; accent?: 'normal' | 'surplus' | 'deficit' })}
	{@const { label, value, accent = 'normal' } = opts}
	<div class="rounded-2xl border border-line bg-white p-4">
		<p class="text-xs font-medium text-muted">{label}</p>
		<p class="font-display mt-1 text-xl font-bold tabular-nums {accent === 'surplus' ? 'text-surplus' : accent === 'deficit' ? 'text-deficit' : 'text-ink'}">
			{value}
		</p>
	</div>
{/snippet}
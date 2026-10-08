<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		computeCycleLedger,
		prevCycle,
		nextCycle,
		todayKey,
		type CycleBound,
		type CycleLedgerRow
	} from '$lib/cycle';
	import { formatMoney, formatSignedMoney } from '$lib/money';
	import { createLimitLookups } from '$lib/settings';
	import type { LimitSetting } from '$lib/types';
	import Chart from 'chart.js/auto';
	import LedgerTable from '$lib/LedgerTable.svelte';

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

	// ---- Granularity cho biểu đồ: ngày / tuần / tháng ----
	type Granularity = 'day' | 'week' | 'month';
	let granularity = $state<Granularity>('day');
	const granularities: { id: Granularity; label: string }[] = [
		{ id: 'day', label: 'Theo ngày' },
		{ id: 'week', label: 'Theo tuần' },
		{ id: 'month', label: 'Theo tháng' }
	];

	/**
	 * Gom các dòng ngày thành các nhóm (tuần/tháng) để vẽ biểu đồ.
	 * Trả về labels (nhãn trục X), dateLabels (khoảng ngày cho tooltip) và các điểm dữ liệu.
	 * - balance tại một nhóm = số dư của ngày cuối nhóm (trạng thái "cuối tuần/tháng").
	 * - spent tại một nhóm = TỔNG các ngày trong nhóm.
	 */
	function aggregateForChart(
		rs: CycleLedgerRow[],
		gran: Granularity
	): { labels: string[]; dateLabels: string[]; balance: number[]; spent: number[] } {
		if (gran === 'day' || rs.length === 0) {
			return {
				labels: rs.map((r) => `N${r.cycleDay}`),
				dateLabels: rs.map((r) => r.date),
				balance: rs.map((r) => r.balance),
				spent: rs.map((r) => r.spent)
			};
		}

		const labels: string[] = [];
		const dateLabels: string[] = [];
		const balance: number[] = [];
		const spent: number[] = [];

		// chia theo tuần (7 ngày liên tiếp tính từ đầu vòng)
		if (gran === 'week') {
			const weekIndex = (cycleDay: number) => Math.floor((cycleDay - 1) / 7);
			const totalWeeks = Math.max(1, Math.ceil(rs[rs.length - 1].cycleDay / 7));
			for (let w = 0; w < totalWeeks; w++) {
				const inWeek = rs.filter((r) => weekIndex(r.cycleDay) === w);
				if (inWeek.length === 0) continue;
				const sum = inWeek.reduce((s, r) => s + r.spent, 0);
				labels.push(`Tuần ${w + 1}`);
				dateLabels.push(inWeek[0].date);
				balance.push(inWeek[inWeek.length - 1].balance);
				spent.push(sum);
			}
		} else {
			// gran === 'month': nhóm theo tháng dương lịch (YYYY-MM)
			const byMonth = new Map<string, CycleLedgerRow[]>();
			for (const r of rs) {
				const key = r.date.slice(0, 7); // 'YYYY-MM'
				if (!byMonth.has(key)) byMonth.set(key, []);
				byMonth.get(key)!.push(r);
			}
			for (const [key, rows] of byMonth) {
				const [, m] = key.split('-').map(Number);
				labels.push(`Th ${m}`);
				dateLabels.push(rows[0].date);
				balance.push(rows[rows.length - 1].balance);
				spent.push(rows.reduce((s, r) => s + r.spent, 0));
			}
		}

		return { labels, dateLabels, balance, spent };
	}

	// ---- Summary metrics ----
	const summary = $derived.by(() => {
		const rs = visibleRows;
		const totalSpent = rs.reduce((s, r) => s + r.spent, 0);
		const totalIncome = rs.reduce((s, r) => s + r.income, 0);
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
			totalIncome,
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
		const target = delta < 0 ? prevCycle(bound, dayStartForDate) : nextCycle(bound, dayStartForDate);
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
		const { labels, dateLabels, balance, spent } = aggregateForChart(visibleRows, granularity);
		const metric = chartMetric;
		const values = metric === 'balance' ? balance : spent;

		const theme = getComputedStyle(document.documentElement);
		const ink = theme.getPropertyValue('--color-ink').trim();
		const surplus = theme.getPropertyValue('--color-surplus').trim();
		const deficit = theme.getPropertyValue('--color-deficit').trim();
		const muted = theme.getPropertyValue('--color-muted').trim();
		const line = theme.getPropertyValue('--color-line').trim();
		const chartFont = { family: theme.getPropertyValue('--font-sans').trim(), size: 12 };

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
							if (metric !== 'balance') return ink;
							const v = context.raw as number;
							return v < 0 ? deficit : v > 0 ? surplus : line;
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
						backgroundColor: ink,
						bodyFont: chartFont,
						titleFont: chartFont,
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
					x: { ticks: { font: chartFont, color: muted }, grid: { display: false } },
					y: {
						grid: { color: line },
						ticks: { font: chartFont, color: muted, callback: (value) => formatMoney(Number(value)) }
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
<div class="mb-6">
	<h1 class="page-title">Thống kê</h1>
	<p class="page-context mt-2">Vòng {header}</p>
	<div class="cycle-controls">
		<button onclick={() => goCycle(-1)} class="ui-button ui-button-secondary text-sm">
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

<!-- Bộ chọn view -->
<div class="ui-segment mb-6 max-w-md grid-cols-3" role="tablist">
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
		<div class="grid gap-4 md:grid-cols-2">
			<div class="min-w-0 rounded-panel p-5 {summary.endBalance < 0 ? 'bg-deficit-bg text-deficit' : 'bg-surplus-bg text-surplus'}">
				<p class="text-sm font-medium">Số dư cuối kỳ</p>
				<p class="money mt-2 text-[clamp(1.75rem,6vw,2.25rem)] font-semibold leading-[1.2] tracking-[-0.025em] [overflow-wrap:anywhere]">{formatSignedMoney(summary.endBalance)}</p>
			</div>
			<div class="min-w-0 rounded-panel border border-line bg-white p-5">
				<p class="text-sm font-medium text-muted">Tổng đã chi</p>
				<p class="money mt-2 text-[clamp(1.75rem,6vw,2.25rem)] font-semibold leading-[1.2] tracking-[-0.025em] [overflow-wrap:anywhere]">{formatMoney(summary.totalSpent)}</p>
			</div>
		</div>
		<dl class="mt-6 border-t border-line">
			{@render StatDetail({ label: 'Tổng thu', value: '+' + formatMoney(summary.totalIncome), accent: 'surplus' })}
			{@render StatDetail({ label: 'Trung bình / ngày', value: formatMoney(summary.avgSpend) })}
			{@render StatDetail({ label: 'Ngày vượt hạn mức', value: `${summary.daysOver}/${summary.nDays}`, accent: summary.daysOver > 0 ? 'deficit' : 'normal' })}
			{@render StatDetail({ label: 'Ngày tiết kiệm', value: `${summary.daysSurplus}/${summary.nDays}`, accent: 'surplus' })}
			{@render StatDetail({ label: summary.deficit > 0 ? 'Còn thiếu cuối kỳ' : 'Tiết kiệm cuối kỳ', value: formatMoney(summary.deficit > 0 ? summary.deficit : summary.saved), accent: summary.deficit > 0 ? 'deficit' : 'surplus' })}
		</dl>

		<div class="mt-6 border-t border-line pt-6">
			<h2 class="section-title">Cao điểm</h2>
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
	<div class="rounded-2xl border border-line bg-white p-5 md:p-6">
		<div class="mb-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="section-title">
					Biểu đồ {granularity === 'day' ? 'hàng ngày' : granularity === 'week' ? 'theo tuần' : 'theo tháng'}
				</h2>
				<div class="ui-segment grid-cols-2">
					{#each chartMetrics as m}
						<button
							onclick={() => (chartMetric = m.id)}
							aria-pressed={chartMetric === m.id}
							class="transition-colors {chartMetric === m.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}"
						>
							{m.label}
						</button>
					{/each}
				</div>
			</div>
			<!-- Bộ chọn mức gom (ngày / tuần / tháng) -->
			<div class="ui-segment mt-4 grid-cols-3">
				{#each granularities as g}
					<button
						onclick={() => (granularity = g.id)}
						aria-pressed={granularity === g.id}
						class="rounded-lg py-2 text-sm font-medium transition-colors {granularity === g.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}"
					>
						{g.label}
					</button>
				{/each}
			</div>
		</div>
		<div class="relative h-72">
			<canvas bind:this={canvas}></canvas>
		</div>
	</div>
{:else}
	<LedgerTable rows={visibleRows} cycleDays label="Thống kê chi tiêu" />
{/if}

{#if isCurrent}
	<p class="page-context mt-6">Đang hiển thị đến ngày hôm nay.</p>
{/if}

{#snippet StatDetail(opts: { label: string; value: string; accent?: 'normal' | 'surplus' | 'deficit' })}
	{@const { label, value, accent = 'normal' } = opts}
	<div class="flex items-baseline justify-between gap-4 border-b border-line py-4">
		<dt class="text-sm text-muted">{label}</dt>
		<dd class="money min-w-0 text-right font-semibold [overflow-wrap:anywhere] {accent === 'surplus' ? 'text-surplus' : accent === 'deficit' ? 'text-deficit' : 'text-ink'}">{value}</dd>
	</div>
{/snippet}

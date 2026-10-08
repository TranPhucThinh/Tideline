<script lang="ts">
	import type { CycleLedgerRow } from '$lib/cycle';
	import { formatMoney, formatSignedMoney } from '$lib/money';

	let { rows, cycleDays = false, compactRows = false, label }: {
		rows: CycleLedgerRow[];
		cycleDays?: boolean;
		compactRows?: boolean;
		label: string;
	} = $props();

	function compactMoney(amount: number, signed = false): string {
		const sign = amount < 0 ? '−' : signed && amount > 0 ? '+' : '';
		const value = Math.abs(amount);
		if (value >= 1_000_000 && value % 1_000 === 0) {
			return `${sign}${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}tr`;
		}
		if (value >= 1_000 && value % 1_000 === 0) {
			return `${sign}${(value / 1_000).toLocaleString('vi-VN')}k`;
		}
		return signed ? formatSignedMoney(amount) : formatMoney(amount);
	}
</script>

<div class="ledger-surface" class:compact-rows={compactRows}>
	<table class="ledger-table" aria-label={label}>
		<thead>
			<tr>
				<th scope="col">Ngày</th>
				<th scope="col">Hạn mức</th>
				<th scope="col">Đã chi</th>
				<th scope="col">Thu</th>
				<th scope="col">Số dư</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.date)}
				<tr>
					<th scope="row"><span class="mobile-label" aria-hidden="true">Ngày </span>{cycleDays ? `N${row.cycleDay}` : row.day}</th>
					<td><span class="mobile-label" aria-hidden="true">Hạn mức</span><span class="money text-muted"><span class="full-value">{formatMoney(row.limit)}</span><span class="compact-value" aria-hidden="true" title={formatMoney(row.limit)}>{compactMoney(row.limit)}</span></span></td>
					<td><span class="mobile-label" aria-hidden="true">Đã chi</span><span class="money"><span class="full-value">{formatMoney(row.spent)}</span><span class="compact-value" aria-hidden="true" title={formatMoney(row.spent)}>{compactMoney(row.spent)}</span></span></td>
					<td><span class="mobile-label" aria-hidden="true">Thu</span><span class="money {row.income > 0 ? 'text-surplus' : 'text-muted'}"><span class="full-value">{row.income > 0 ? '+' + formatMoney(row.income) : '—'}</span><span class="compact-value" aria-hidden="true" title={row.income > 0 ? '+' + formatMoney(row.income) : '—'}>{row.income > 0 ? compactMoney(row.income, true) : '—'}</span></span></td>
					<td><span class="mobile-label" aria-hidden="true">Số dư</span><span class="money font-semibold {row.balance > 0 ? 'text-surplus' : row.balance < 0 ? 'text-deficit' : 'text-muted'}"><span class="full-value">{formatSignedMoney(row.balance)}</span><span class="compact-value" aria-hidden="true" title={formatSignedMoney(row.balance)}>{compactMoney(row.balance)}</span></span></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.ledger-surface {
		border: 1px solid var(--color-line);
		border-radius: var(--radius-panel);
		background: var(--color-white);
	}
	.ledger-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
	/* Keep column headers available to assistive technology in the stacked view. */
	thead {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	tbody { display: block; }
	tbody tr {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		padding: 1.25rem;
		border-bottom: 1px solid var(--color-line);
	}
	tbody tr:last-child { border-bottom: 0; }
	tbody th { grid-column: 1 / -1; text-align: left; font-weight: 600; }
	tbody th .mobile-label { margin-inline-end: 0.375rem; }
	td { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
	.mobile-label { color: var(--color-muted); font-size: 0.875rem; font-weight: 400; }
	.money { overflow-wrap: anywhere; }
	.compact-value { display: none; }
	@media (max-width: 47.999rem) {
		.compact-rows .ledger-table { table-layout: fixed; font-size: 0.75rem; line-height: 1.35; }
		.compact-rows thead {
			position: static;
			width: auto;
			height: auto;
			overflow: visible;
			clip-path: none;
			white-space: normal;
			background: var(--color-canvas);
		}
		.compact-rows tbody { display: table-row-group; }
		.compact-rows tbody tr { display: table-row; }
		.compact-rows th, .compact-rows td {
			padding: 0.625rem 0.25rem;
			text-align: right;
			white-space: normal;
			overflow-wrap: anywhere;
			border-bottom: 1px solid var(--color-line);
		}
		.compact-rows thead th { color: var(--color-muted); font-weight: 500; }
		.compact-rows th:first-child { width: 3rem; padding-left: 0.75rem; text-align: left; }
		.compact-rows th:last-child, .compact-rows td:last-child { padding-right: 0.5rem; }
		.compact-rows td { display: table-cell; }
		.compact-rows .mobile-label { display: none; }
		.compact-rows .full-value {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		.compact-rows .compact-value { display: inline; }
	}
	@media (min-width: 48rem) {
		thead {
			position: static;
			width: auto;
			height: auto;
			overflow: visible;
			clip-path: none;
			white-space: normal;
		}
		tbody { display: table-row-group; }
		tbody tr { display: table-row; }
		th, td { padding: 1rem; text-align: right; }
		thead { background: var(--color-canvas); }
		thead th:first-child { border-top-left-radius: var(--radius-panel); }
		thead th:last-child { border-top-right-radius: var(--radius-panel); }
		thead th { color: var(--color-muted); font-weight: 500; border-bottom: 1px solid var(--color-line); }
		th:first-child { text-align: left; }
		td { display: table-cell; white-space: nowrap; }
		.mobile-label { display: none; }
	}
</style>

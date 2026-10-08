<script lang="ts">
	import type { CycleLedgerRow } from '$lib/cycle';
	import { formatMoney, formatSignedMoney } from '$lib/money';

	let { rows, cycleDays = false, label }: {
		rows: CycleLedgerRow[];
		cycleDays?: boolean;
		label: string;
	} = $props();
</script>

<div class="ledger-surface">
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
					<td><span class="mobile-label" aria-hidden="true">Hạn mức</span><span class="money text-muted">{formatMoney(row.limit)}</span></td>
					<td><span class="mobile-label" aria-hidden="true">Đã chi</span><span class="money">{formatMoney(row.spent)}</span></td>
					<td><span class="mobile-label" aria-hidden="true">Thu</span><span class="money {row.income > 0 ? 'text-surplus' : 'text-muted'}">{row.income > 0 ? '+' + formatMoney(row.income) : '—'}</span></td>
					<td><span class="mobile-label" aria-hidden="true">Số dư</span><span class="money font-semibold {row.balance > 0 ? 'text-surplus' : row.balance < 0 ? 'text-deficit' : 'text-muted'}">{formatSignedMoney(row.balance)}</span></td>
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

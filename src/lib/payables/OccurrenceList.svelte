<script lang="ts">
	import { formatMoney } from '$lib/money';
	import { statusOf, statusLabels, kindLabels, type Occurrence } from './domain';
	let { rows, today, onaction, onitem, busy = false, historical = false }: { rows: Occurrence[]; today: string; onaction: (action: string, row: Occurrence) => void; onitem?: (id: string) => void; busy?: boolean; historical?: boolean } = $props();
</script>

<ul class="divide-y divide-line">
	{#each rows as row (row.id)}
		{@const status = statusOf(row, today)}
		<li class="py-4 first:pt-0 last:pb-0">
			<div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
				<div class="min-w-0">
					{#if onitem}<button class="break-words text-left font-semibold underline-offset-4 hover:underline" onclick={() => onitem?.(row.item_id)}>{row.name}</button>{:else}<p class="break-words font-semibold">{row.name}</p>{/if}
					<p class="mt-1 text-sm text-muted">{row.provider ? `${row.provider} · ` : ''}{kindLabels[row.kind]}{row.kind === 'installment' ? ` · Lần ${row.sequence + 1}/${row.count}` : ''}</p>
				</div>
				<div class="shrink-0 text-right"><p class="font-display font-semibold tabular-nums">{formatMoney(row.amount)}</p>{#if row.estimated && !row.paid_on}<span class="text-xs text-muted">Ước tính</span>{/if}</div>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
				<span class="text-muted">Hạn {row.due.split('-').reverse().join('/')}</span>
				<span class="rounded-full px-2 py-1 {status === 'overdue' || status === 'today' ? 'bg-deficit-bg text-deficit' : status === 'paid' ? 'bg-surplus-bg text-surplus' : 'bg-canvas text-muted'}">{statusLabels[status]}</span>
				{#if row.paid_on}<span class="text-muted">Đã trả ngày {row.paid_on.split('-').reverse().join('/')}</span>{/if}
			</div>
			{#if !historical}
				<div class="mt-3 flex flex-wrap items-start gap-2 text-sm">
					{#if row.paid_on}<button disabled={busy} onclick={() => onaction('undo', row)} class="ui-button ui-button-secondary text-sm">Hoàn tác đã trả</button>
					{:else}
						<button disabled={busy} onclick={() => onaction('pay', row)} class="ui-button ui-button-primary text-sm">Đánh dấu đã trả</button>
						<details class="min-w-0">
							<summary class="flex min-h-12 cursor-pointer items-center gap-2 rounded-control px-3 text-muted underline underline-offset-4">Điều chỉnh<span class="sr-only"> {row.name}, hạn {row.due.split('-').reverse().join('/')}</span></summary>
							<div class="mt-2 flex flex-wrap gap-2">
								<button disabled={busy} onclick={() => onaction('amount', row)} class="ui-button ui-button-secondary text-sm">Sửa số tiền</button>
								{#if row.kind === 'subscription' && row.due >= today}<button disabled={busy} onclick={() => onaction('price', row)} class="ui-button ui-button-secondary text-sm">Đổi giá từ lần này</button>{/if}
							</div>
						</details>
					{/if}
				</div>
			{/if}
		</li>
	{/each}
</ul>

<script lang="ts">
	// Hộp thoại xác nhận chung. Dùng cho thao tác nguy hiểm như xoá khoản chi.

	let {
		open = false,
		title = 'Xác nhận',
		message = '',
		confirmLabel = 'Xác nhận',
		cancelLabel = 'Huỷ',
		danger = false,
		busy = false,
		onconfirm,
		oncancel
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		busy?: boolean;
		onconfirm?: () => void;
		oncancel?: () => void;
	} = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-5 backdrop-blur-sm"
		role="alertdialog"
		aria-modal="true"
		aria-label={title}
	>
		<div class="w-full max-w-[340px] rounded-2xl border border-line bg-white p-5 shadow-xl">
			<h2 class="font-display text-lg font-bold">{title}</h2>
			{#if message}
				<p class="mt-2 text-sm leading-relaxed text-muted">{message}</p>
			{/if}
			<div class="mt-5 flex gap-3">
				<button
					type="button"
					onclick={oncancel}
					disabled={busy}
					class="flex-1 rounded-xl border border-line bg-cream py-3 text-base font-semibold text-ink disabled:opacity-50"
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onclick={onconfirm}
					disabled={busy}
					class="flex-1 rounded-xl py-3 text-base font-semibold text-white disabled:opacity-50 {danger ? 'bg-deficit' : 'bg-ink'}"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
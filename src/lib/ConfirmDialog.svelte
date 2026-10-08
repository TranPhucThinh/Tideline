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
		class="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-5"
		role="alertdialog"
		aria-modal="true"
		aria-label={title}
	>
		<div class="ui-dialog w-full max-w-[360px] p-6">
			<h2 class="section-title">{title}</h2>
			{#if message}
				<p class="mt-2 text-sm leading-relaxed text-muted">{message}</p>
			{/if}
			<div class="mt-5 flex gap-3">
				<button
					type="button"
					onclick={oncancel}
					disabled={busy}
					class="ui-button ui-button-secondary flex-1"
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onclick={onconfirm}
					disabled={busy}
					class="ui-button flex-1 {danger ? 'ui-button-danger' : 'ui-button-primary'}"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
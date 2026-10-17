<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, children, onclose, onback, busy = false, error = '' }: { title: string; children: Snippet; onclose: () => void; onback?: () => void; busy?: boolean; error?: string } = $props();
	const titleId = $props.id();
	let dialog: HTMLDialogElement;
	let heading: HTMLHeadingElement;
	$effect(() => {
		// Announce the new context when a detail dialog changes to an action form.
		void title;
		if (dialog && !dialog.open) dialog.showModal();
		heading?.focus();
	});
	function close() { if (!busy) { dialog.close(); onclose(); } }
</script>

<dialog bind:this={dialog} aria-labelledby={titleId} oncancel={(event) => { event.preventDefault(); close(); }} class="payables-dialog ui-dialog w-[calc(100%-2rem)] max-w-xl max-h-[90dvh] overflow-y-auto p-5 text-ink md:p-6">
	{#if onback}<button type="button" onclick={onback} disabled={busy} class="mb-2 flex items-center gap-2 text-sm text-muted underline underline-offset-4">Quay lại chi tiết khoản</button>{/if}
	<div class="mb-5 flex items-start justify-between gap-4">
		<h2 bind:this={heading} id={titleId} tabindex="-1" class="section-title">{title}</h2>
		<button type="button" onclick={close} disabled={busy} aria-label="Đóng" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-control hover:bg-surplus-bg"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
	</div>
	{#if error}<p role="alert" class="mb-4 rounded-control bg-deficit-bg p-3 text-sm text-deficit">{error}</p>{/if}
	{@render children()}
</dialog>

<style>
	dialog { margin: auto; border: 1px solid var(--color-line); background: var(--color-white); }
	dialog::backdrop { background: rgb(20 35 50 / 45%); backdrop-filter: blur(3px); }
</style>

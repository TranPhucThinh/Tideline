<script lang="ts">
	import { navigating } from '$app/state';

	// Theo svelte 5: `navigating` là reactive state. Non-null khi đang chuyển trang.
	const isLoading = $derived(navigating !== null);
	let show = $state(false);

	// Hiện thanh khi bắt đầu navigate, ẩn (có chút delay) sau khi xong.
	$effect(() => {
		if (isLoading) {
			show = true;
		} else {
			const t = setTimeout(() => (show = false), 250);
			return () => clearTimeout(t);
		}
	});
</script>

{#if show}
	<div class="progress-bar" aria-hidden="true">
		<div class="progress-bar-inner"></div>
	</div>
{/if}

<style>
/* Thanh loading khi chuyển trang (ProgressBar.svelte) */
.progress-bar {
	position: fixed;
	inset-inline: 0;
	top: 0;
	height: 3px;
	z-index: 60;
	overflow: hidden;
	background: transparent;
}
.progress-bar-inner {
	height: 100%;
	width: 35%;
	border-radius: 0 999px 999px 0;
	background: var(--color-surplus);
	animation: dsh-progress 1.1s ease-in-out infinite;
}
@keyframes dsh-progress {
	0% {
		transform: translateX(-100%);
		opacity: 1;
	}
	100% {
		transform: translateX(400%);
		opacity: 0.85;
	}
}

</style>

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
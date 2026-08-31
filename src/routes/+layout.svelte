<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Titline — chi tiêu hằng ngày</title>
	<meta name="description" content="Quản lý chi tiêu hằng ngày với hạn mức" />
</svelte:head>

{@render children()}
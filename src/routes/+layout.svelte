<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icon.svg" />
	<title>Tideline — chi tiêu hằng ngày</title>
	<meta name="description" content="Quản lý chi tiêu hằng ngày với hạn mức" />
	<meta name="theme-color" content="#203A56" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
</svelte:head>

{@render children()}

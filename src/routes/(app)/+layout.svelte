<script lang="ts">
	import { page } from '$app/state';
	import { createClient } from '$lib/supabaseClient';
	import type { Snippet } from 'svelte';
	import StepGuide from '$lib/StepGuide.svelte';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { todayKey } from '$lib/date';
	import { isVisualStyle, themeName } from '$lib/appearance';

	let { children, data }: { children: Snippet; data: Record<string, unknown> } = $props();

	const supabase = createClient();

	const navItems = [
		{ href: '/', label: 'Hôm nay', icon: 'today' },
		{ href: '/history', label: 'Lịch sử', icon: 'history' },
		{ href: '/stats', label: 'Thống kê', icon: 'stats' },
		{ href: '/settings', label: 'Cài đặt', icon: 'settings' }
	];

	const guideSeen = $derived((data.guideSeen as boolean | undefined) ?? false);
	const visualStyle = $derived(isVisualStyle(data.visualStyle) ? data.visualStyle : 'modern');
	const themeIndex = $derived(typeof data.themeIndex === 'number' ? data.themeIndex : 0);
	const activeTheme = $derived(themeName(visualStyle, themeIndex));

	onMount(() => {
		let lastDay = todayKey();
		const refreshOnNewDay = () => {
			const now = todayKey();
			if (now !== lastDay) {
				lastDay = now;
				void invalidateAll();
			}
		};
		const timer = window.setInterval(refreshOnNewDay, 60_000);
		document.addEventListener('visibilitychange', refreshOnNewDay);
		return () => {
			window.clearInterval(timer);
			document.removeEventListener('visibilitychange', refreshOnNewDay);
		};
	});

	let helpOpen = $state(false);
	// Cờ cho biết hướng dẫn đã được tự hiện trong phiên này — đảm bảo chỉ hiện đúng một lần,
	// kể cả khi data.guideSeen chưa kịp cập nhật từ DB sau khi đóng.
	let autoShown = $state(false);
	// Chỉ lưu guide_seen=true khi hướng dẫn tự hiện (lần đầu), không lưu khi mở lại thủ công.
	let persistOnClose = $state(false);
	let saving = $state(false);

	// Lần truy cập đầu: tự hiện hướng dẫn một lần.
	$effect(() => {
		if (!guideSeen && !autoShown) {
			autoShown = true;
			persistOnClose = true;
			helpOpen = true;
		}
	});

	function isActive(href: string): boolean {
		const url = page.url.pathname;
		if (href === '/') return url === '/';
		return url.startsWith(href);
	}

	async function closeGuide() {
		if (persistOnClose) {
			persistOnClose = false;
			saving = true;
			const userId = (data.session as { user?: { id?: string } } | undefined)?.user?.id;
			if (userId) {
					const { error } = await supabase.rpc('mark_guide_seen');
				// Lỗi mạng không chặn việc đóng hướng dẫn; profile sẽ tự lưu lại ở phiên sau nếu cần.
				void error;
			}
			saving = false;
		}
		helpOpen = false;
	}
</script>

<div
	class="app-appearance relative mx-auto min-h-dvh w-full max-w-[30rem] md:max-w-5xl"
	data-ui-style={visualStyle}
	data-ui-theme={`${visualStyle}-${themeIndex}`}
>
	<header class="flex items-center justify-between gap-4 px-5 pt-4 md:border-b md:border-line md:px-8 md:py-6">
		<div>
			<span class="font-display text-lg font-semibold">Tideline</span>
			<span class="sr-only">Giao diện {visualStyle === 'modern' ? 'hiện tại' : 'nổi mềm'}, theme {activeTheme}</span>
		</div>
		<nav class="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] md:static md:ml-auto md:border-0 md:bg-transparent md:p-0" aria-label="Điều hướng chính">
			<div class="mx-auto grid max-w-[30rem] grid-cols-4 gap-1 p-2 md:flex md:max-w-none md:p-0">
				{#each navItems as item (item.href)}
					<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} class="flex flex-col items-center justify-center gap-1 rounded-control p-2 text-xs text-muted transition-colors aria-[current=page]:bg-surplus-bg aria-[current=page]:font-semibold aria-[current=page]:text-ink hover:not-aria-[current=page]:bg-surplus-bg hover:not-aria-[current=page]:text-ink md:flex-row md:gap-2 md:p-3 md:text-sm">
						{@render NavGlyph({ name: item.icon, active: isActive(item.href) })}
						{item.label}
					</a>
				{/each}
			</div>
		</nav>
		<button
			type="button"
			onclick={() => {
				persistOnClose = false;
				helpOpen = true;
			}}
			aria-label="Mở hướng dẫn sử dụng"
			disabled={saving}
			class="app-help flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line bg-white font-semibold transition-colors hover:enabled:bg-surplus-bg"
		>?</button>
	</header>
	<main class="px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-12">
		{@render children()}
	</main>
	<StepGuide open={helpOpen} onclose={closeGuide} />
</div>

{#snippet NavGlyph(opts: { name: string; active: boolean })}
	{@const { name, active } = opts}
	<svg
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={active ? 'text-ink' : 'text-muted'}
	>
		{#if name === 'today'}
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		{:else if name === 'history'}
			<path d="M3 12a9 9 0 1 0 3-6.7" />
			<path d="M3 5v4h4" />
			<path d="M12 8v4l2.5 2.5" />
		{:else if name === 'stats'}
			<path d="M4 20V10" />
			<path d="M9 20V4" />
			<path d="M14 20v-7" />
			<path d="M19 20V8" />
		{:else}
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
		{/if}
	</svg>
{/snippet}

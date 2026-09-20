<script lang="ts">
	import { page } from '$app/state';
	import { createClient } from '$lib/supabaseClient';
	import type { Snippet } from 'svelte';
	import StepGuide from '$lib/StepGuide.svelte';

	let { children, data }: { children: Snippet; data: Record<string, unknown> } = $props();

	const supabase = createClient();

	const navItems = [
		{ href: '/', label: 'Hôm nay', icon: 'today' },
		{ href: '/history', label: 'Lịch sử', icon: 'history' },
		{ href: '/stats', label: 'Thống kê', icon: 'stats' },
		{ href: '/settings', label: 'Cài đặt', icon: 'settings' }
	];

	const guideSeen = $derived((data.guideSeen as boolean | undefined) ?? false);

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

<div class="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
	<main class="flex-1 px-5 pb-28 pt-6">
		{@render children()}
	</main>

	<!-- Bottom navigation (mobile app style, fixed) -->
	<nav
		class="fixed inset-x-0 bottom-0 z-10"
		aria-label="Điều hướng chính"
	>
		<div class="mx-auto w-full max-w-[430px] border-t border-line bg-cream/95 px-4 pb-[env(safe-area-inset-bottom)] backdrop-blur">
			<div class="grid grid-cols-4">
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						aria-current={isActive(item.href) ? 'page' : undefined}
						class="flex flex-col items-center gap-0.5 py-3 text-xs transition-colors {isActive(item.href) ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}"
					>
						{@render NavGlyph({ name: item.icon, active: isActive(item.href) })}
						{item.label}
					</a>
				{/each}
			</div>
		</div>
	</nav>

	<!-- Nút trợ giúp (?) — mở lại hướng dẫn bất cứ lúc nào -->
	<button
		type="button"
		onclick={() => {
			persistOnClose = false;
			helpOpen = true;
		}}
		aria-label="Mở hướng dẫn sử dụng"
		disabled={saving}
		class="fixed right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/90 text-sm font-bold text-ink shadow-sm backdrop-blur transition-transform active:scale-90 disabled:opacity-50"
	>
		?
	</button>

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

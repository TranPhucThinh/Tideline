<script lang="ts">
	import { isSupabaseConfigured } from '$lib/env';
	import sql from '../../../supabase/setup.sql?raw';

	const configured = isSupabaseConfigured();
</script>

<svelte:head>
	<title>Thiết lập — chi tiêu</title>
</svelte:head>

<div class="mx-auto w-full max-w-[430px] px-5 py-8">
	<h1 class="page-title">{configured ? 'Đã sẵn sàng' : 'Thiết lập ứng dụng'}</h1>

	{#if configured}
		<p class="mt-3 rounded-xl bg-surplus-bg px-4 py-3 text-sm text-surplus">
			Supabase đã được cấu hình. <a href="/auth/login" class="underline">Đăng nhập</a> để bắt đầu.
		</p>
	{:else}
		<p class="mt-3 text-sm text-muted leading-relaxed">
			Ứng dụng chưa được cấu hình Supabase. Thực hiện vài bước dưới đây để bắt đầu.
		</p>
	{/if}

	{#if !configured}
		<ol class="mt-6 space-y-5">
			<li class="rounded-2xl border border-line bg-white p-4">
				<h2 class="section-title">1. Tạo project Supabase</h2>
				<p class="mt-1 text-sm text-muted">
					Tạo project miễn phí tại supabase.com và mở <span class="font-medium text-ink">Project Settings → API</span>.
				</p>
			</li>
			<li class="rounded-2xl border border-line bg-white p-4">
				<h2 class="section-title">2. Điền thông tin vào file <code class="rounded bg-canvas px-1.5 py-0.5">app/.env</code></h2>
				<p class="mt-1 text-sm text-muted">
					Sao chép giá trị <span class="font-medium text-ink">Project URL</span> và <span class="font-medium text-ink">anon public key</span> vào
					<code class="rounded bg-canvas px-1.5 py-0.5">PUBLIC_SUPABASE_URL</code> và
					<code class="rounded bg-canvas px-1.5 py-0.5">PUBLIC_SUPABASE_ANON_KEY</code>, rồi khởi động lại server.
				</p>
			</li>
			<li class="rounded-2xl border border-line bg-white p-4">
				<h2 class="section-title">3. Chạy SQL tạo bảng &amp; RLS</h2>
				<p class="mt-1 text-sm text-muted">
					Mở <span class="font-medium text-ink">SQL Editor</span> trong Supabase và chạy đoạn script dưới đây.
				</p>
			</li>
		</ol>

		<div class="mt-5 rounded-2xl border border-line bg-ink text-canvas">
			<div class="flex items-center justify-between border-b border-white/10 px-4 py-2">
				<span class="text-sm font-medium">setup.sql</span>
			</div>
			<pre class="max-h-80 overflow-auto whitespace-pre p-4 font-mono text-xs leading-relaxed">{sql}</pre>
		</div>

		<div class="mt-5 rounded-2xl border border-line bg-white p-4 text-sm text-muted">
			File SQL này cũng được lưu ở <code class="rounded bg-canvas px-1.5 py-0.5">app/supabase/setup.sql</code> trong dự án.
		</div>

		<a
			href="/auth/login"
			class="mt-6 block w-full rounded-xl bg-ink py-3 text-center text-base font-semibold text-white"
		>
			Đăng nhập
		</a>
	{/if}
</div>

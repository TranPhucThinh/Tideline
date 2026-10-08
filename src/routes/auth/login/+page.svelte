<script lang="ts">
	import { goto } from '$app/navigation';
	import { createClient } from '$lib/supabaseClient';
	import { isSupabaseConfigured } from '$lib/env';
	import Spinner from '$lib/Spinner.svelte';

	const supabase = createClient();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
</script>

<svelte:head>
	<title>Đăng nhập — chi tiêu</title>
</svelte:head>

<div class="auth-layout">
	<div class="mb-8">
		<h1 class="page-title">Đăng nhập</h1>
		<p class="mt-1 text-sm text-muted">Tiếp tục quản lý chi tiêu hằng ngày của bạn.</p>
	</div>

	{#if !isSupabaseConfigured()}
		<div class="rounded-xl bg-deficit-bg px-4 py-3 text-sm text-deficit">
			Chưa cấu hình Supabase. Xem hướng dẫn tại trang <a href="/setup" class="underline">thiết lập</a>.
		</div>
	{/if}

	{#if error}
		<p class="rounded-xl bg-deficit-bg px-4 py-3 text-sm text-deficit">{error}</p>
	{/if}

	<form
		onsubmit={async (e) => {
			e.preventDefault();
			error = '';
			if (!isSupabaseConfigured()) {
				error = 'Chưa cấu hình Supabase.';
				return;
			}
			loading = true;
			try {
				const { error: authErr } = await supabase.auth.signInWithPassword({
					email,
					password
				});
				if (authErr) {
					error = authErr.message;
					return;
				}
				await goto('/', { invalidateAll: true });
			} finally {
				loading = false;
			}
		}}
		class="mt-4 space-y-4"
	>
		<div>
			<label for="email" class="text-sm font-medium text-muted">Email</label>
			<input
				id="email"
				type="email"
				required
				bind:value={email}
				autocomplete="email"
				class="mt-1 w-full border px-4 py-3 text-base ui-input"
				placeholder="example@gmail.com"
			/>
		</div>
		<div>
			<label for="password" class="text-sm font-medium text-muted">Mật khẩu</label>
			<input
				id="password"
				type="password"
				required
				bind:value={password}
				autocomplete="current-password"
				class="mt-1 w-full border px-4 py-3 text-base ui-input"
				placeholder="*******"
			/>
		</div>
		<button
			type="submit"
			disabled={loading}
			class="ui-button ui-button-primary w-full"
		>
			{#if loading}
				<Spinner color="white" size={18} />
				Đang đăng nhập…
			{:else}
				Đăng nhập
			{/if}
		</button>
	</form>

	<p class="mt-6 text-center text-sm text-muted">
		Chưa có tài khoản?
		<a href="/auth/signup" class="font-medium text-ink underline">Đăng ký</a>
	</p>
</div>
<script lang="ts">
	import { goto } from '$app/navigation';
	import { createClient } from '$lib/supabaseClient';
	import { isSupabaseConfigured } from '$lib/env';
	import Spinner from '$lib/Spinner.svelte';

	const supabase = createClient();

	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let loading = $state(false);
	let error = $state('');
	let confirmationSent = $state(false);

	async function signUp(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		confirmationSent = false;
		if (!isSupabaseConfigured()) {
			error = 'Chưa cấu hình Supabase.';
			return;
		}
		if (password.length < 6) {
			error = 'Mật khẩu phải có ít nhất 6 ký tự.';
			return;
		}
		if (password !== confirm) {
			error = 'Mật khẩu xác nhận không khớp.';
			return;
		}
		loading = true;
		try {
			const { data, error: authErr } = await supabase.auth.signUp({
				email,
				password
			});

			if (authErr) {
				error = authErr.message;
				return;
			}

			if (!data.session) {
				// Email confirmation được bật trong Supabase Auth -> cần xác nhận trước
				confirmationSent = true;
				error =
					'Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư và xác nhận tài khoản, rồi đăng nhập lại.';
				return;
			}

			await goto('/', { invalidateAll: true });
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Đăng ký — chi tiêu</title>
</svelte:head>

<div class="auth-layout">
	<div class="mb-8">
		<h1 class="page-title">Tạo tài khoản</h1>
		<p class="mt-1 text-sm text-muted">Bắt đầu kiểm soát chi tiêu hằng ngày ngay hôm nay.</p>
	</div>

	{#if !isSupabaseConfigured()}
		<div class="rounded-xl bg-deficit-bg px-4 py-3 text-sm text-deficit">
			Chưa cấu hình Supabase. Xem hướng dẫn tại trang <a href="/setup" class="underline">thiết lập</a>.
		</div>
	{/if}

	{#if error}
		<p role="status" class="mt-3 rounded-xl px-4 py-3 text-sm {confirmationSent ? 'bg-surplus-bg text-surplus' : 'bg-deficit-bg text-deficit'}">{error}</p>
	{/if}

	<form onsubmit={signUp} class="mt-4 space-y-4">
		<div>
			<label for="email" class="text-sm font-medium text-muted">Email</label>
			<input
				id="email"
				type="email"
				required
				bind:value={email}
				autocomplete="email"
				class="mt-1 w-full border px-4 py-3 text-base ui-input"
			/>
		</div>
		<div>
			<label for="password" class="text-sm font-medium text-muted">Mật khẩu</label>
			<input
				id="password"
				type="password"
				required
				minlength="6"
				bind:value={password}
				autocomplete="new-password"
				class="mt-1 w-full border px-4 py-3 text-base ui-input"
			/>
		</div>
		<div>
			<label for="confirm" class="text-sm font-medium text-muted">Xác nhận mật khẩu</label>
			<input
				id="confirm"
				type="password"
				required
				minlength="6"
				bind:value={confirm}
				autocomplete="new-password"
				class="mt-1 w-full border px-4 py-3 text-base ui-input"
			/>
		</div>
		<button
			type="submit"
			disabled={loading}
			class="ui-button ui-button-primary w-full"
		>
			{#if loading}
				<Spinner color="white" size={18} />
				Đang tạo…
			{:else}
				Đăng ký
			{/if}
		</button>
	</form>

	<p class="mt-6 text-center text-sm text-muted">
		Đã có tài khoản?
		<a href="/auth/login" class="font-medium text-ink underline">Đăng nhập</a>
	</p>
</div>
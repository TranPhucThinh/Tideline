<script lang="ts">
	import { enhance } from '$app/forms';
	import { createClient } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { formatMoney, parseMoneyInput } from '$lib/money';

	let { data, form } = $props();
	const supabase = createClient();

	// Giá trị hạn mức hiện tại để hiển thị; cập nhật từ form action khi lưu.
	const displayedLimit = $derived((form?.default_limit as number | undefined) ?? (data.defaultLimit as number | undefined) ?? 0);

	let input = $state('');
	let saveMsg = $state('');

	async function logout() {
		await supabase.auth.signOut();
		await goto('/auth/login', { invalidateAll: true });
	}
</script>

<svelte:head>
	<title>Cài đặt — chi tiêu</title>
</svelte:head>

<h1 class="font-display text-xl font-bold">Cài đặt</h1>

<section class="mt-5 rounded-2xl border border-line bg-white p-4">
	<h2 class="font-display text-base font-semibold">Hạn mức mặc định mỗi ngày</h2>
	<p class="mt-1 text-sm text-muted">
		Áp dụng từ hôm nay cho mọi tính toán tiếp theo. Hiện tại: <span class="font-semibold text-ink">{formatMoney(displayedLimit)}</span>
	</p>

	{#if saveMsg}
		<p class="mt-3 rounded-lg bg-surplus-bg px-3 py-2 text-sm text-surplus">{saveMsg}</p>
	{/if}

	<form
		method="POST"
		action="?/updateLimit"
		use:enhance={() => {
			return async ({ result }) => {
				saveMsg = result.type === 'success' ? 'Đã cập nhật hạn mức.' : 'Không thể cập nhật.';
			};
		}}
		class="mt-4 space-y-3"
		onsubmit={(e) => {
			const n = parseMoneyInput(input);
			if (n === null) {
				e.preventDefault();
			}
		}}
	>
		<input type="hidden" name="id" value="__profile__" />
		<div>
			<label for="limit" class="text-sm font-medium text-muted">Hạn mức mặc định (đ)</label>
			<input
				id="limit"
				name="limit"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				bind:value={input}
				placeholder={String(displayedLimit)}
				class="font-display mt-1 w-full rounded-xl border border-line bg-cream px-4 py-3 text-lg font-semibold tabular-nums outline-none focus:border-ink"
			/>
		</div>
		<button
			type="submit"
			class="w-full rounded-xl bg-ink py-3 text-base font-semibold text-white"
		>
			Lưu hạn mức
		</button>
	</form>
</section>

<section class="mt-5">
	<button
		onclick={logout}
		class="w-full rounded-xl border border-deficit/40 bg-deficit-bg py-3 text-base font-semibold text-deficit"
	>
		Đăng xuất
	</button>
</section>
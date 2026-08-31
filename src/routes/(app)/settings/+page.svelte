<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { createClient } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { formatMoney, parseMoneyInput } from '$lib/money';
	import Spinner from '$lib/Spinner.svelte';

	let { data } = $props();
	const supabase = createClient();

	// Giá trị hiển thị ban đầu từ page data (layout đọc từ DB).
	// Sau khi lưu thành công, cập nhật local state + invalidateAll để server tải lại sạch.
	let displayedLimit = $state((data.defaultLimit as number | undefined) ?? 0);
	let displayedDayStart = $state((data.dayStart as number | undefined) ?? 1);

	let input = $state('');
	let dayStartInput = $state(String(displayedDayStart));
	let limitMsg = $state('');
	let dayStartMsg = $state('');
	let savingLimit = $state(false);
	let savingDayStart = $state(false);
	let loggingOut = $state(false);

	// Đồng bộ lại nếu page data đổi (vd sau invalidateAll khi quay lại trang)
	$effect(() => {
		const l = data.defaultLimit as number | undefined;
		const d = data.dayStart as number | undefined;
		if (typeof l === 'number') displayedLimit = l;
		if (typeof d === 'number') displayedDayStart = d;
	});

	function onLimitSubmit(result: { type: string; data?: Record<string, unknown> }) {
		savingLimit = false;
		limitMsg = result.type === 'success' ? 'Đã cập nhật hạn mức.' : 'Không thể cập nhật.';
		if (result.type === 'success') {
			const v = (result.data?.default_limit as number | undefined) ?? input;
			const parsed = typeof v === 'number' ? v : parseMoneyInput(input);
			if (parsed && parsed > 0) displayedLimit = parsed;
			invalidateAll();
		}
	}

	function onDayStartSubmit(result: { type: string; data?: Record<string, unknown> }) {
		savingDayStart = false;
		dayStartMsg = result.type === 'success' ? 'Đã cập nhật vòng chi tiêu.' : 'Không thể cập nhật.';
		if (result.type === 'success') {
			const v = (result.data?.day_start as number | undefined) ?? Number(dayStartInput);
			if (typeof v === 'number' && v >= 1 && v <= 31) {
				displayedDayStart = v;
				dayStartInput = String(v);
			}
			invalidateAll();
		}
	}

	async function logout() {
		loggingOut = true;
		try {
			await supabase.auth.signOut();
			await goto('/auth/login', { invalidateAll: true });
		} finally {
			loggingOut = false;
		}
	}
</script>

<svelte:head>
	<title>Cài đặt — chi tiêu</title>
</svelte:head>

<h1 class="font-display text-xl font-bold">Cài đặt</h1>

<section class="mt-5 rounded-2xl border border-line bg-white p-4">
	<h2 class="font-display text-base font-semibold">Hạn mức mặc định mỗi ngày</h2>
	<p class="mt-1 text-sm text-muted">
		Áp dụng cho mọi tính toán tiếp theo. Hiện tại: <span class="font-semibold text-ink">{formatMoney(displayedLimit)}</span>
	</p>

	<form
		method="POST"
		action="?/updateLimit"
		onsubmit={() => (savingLimit = true)}
		use:enhance={() => {
			return async ({ result }) => {
				onLimitSubmit(result);
			};
		}}
		class="mt-4 space-y-3"
	>
		{#if limitMsg}
			<p class="rounded-lg bg-surplus-bg px-3 py-2 text-sm text-surplus">{limitMsg}</p>
		{/if}
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
			disabled={savingLimit}
			class="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-base font-semibold text-white disabled:opacity-60"
		>
			{#if savingLimit}
				<Spinner />
				Đang lưu…
			{:else}
				Lưu hạn mức
			{/if}
		</button>
	</form>
</section>

<section class="mt-5 rounded-2xl border border-line bg-white p-4">
	<h2 class="font-display text-base font-semibold">Vòng chi tiêu (chu kỳ)</h2>
	<p class="mt-1 text-sm text-muted">
		Mỗi vòng cộng dồn số dư/thiếu sang ngày kế tiếp, rồi reset về hạn mức mặc định ở ngày bắt đầu vòng.
		Mặc định là <span class="font-semibold text-ink">1</span> (theo tháng dương lịch).
		Đặt, ví dụ, <span class="font-semibold text-ink">21</span> để vòng chạy từ mùng 21 tháng này đến 20 tháng sau (theo ngày nhận lương).
	</p>
	<p class="mt-2 text-sm text-muted">Hiện tại: <span class="font-semibold text-ink">{displayedDayStart}</span></p>

	<form
		method="POST"
		action="?/updateDayStart"
		onsubmit={() => (savingDayStart = true)}
		use:enhance={() => {
			return async ({ result }) => {
				onDayStartSubmit(result);
			};
		}}
		class="mt-4 space-y-3"
	>
		{#if dayStartMsg}
			<p class="rounded-lg bg-surplus-bg px-3 py-2 text-sm text-surplus">{dayStartMsg}</p>
		{/if}
		<input type="hidden" name="dayStart" value={dayStartInput} />
		<div>
			<label for="dayStart" class="text-sm font-medium text-muted">Ngày bắt đầu vòng (1–31)</label>
			<input
				id="dayStart"
				name="dayStart"
				type="number"
				inputmode="numeric"
				min="1"
				max="31"
				bind:value={dayStartInput}
				class="font-display mt-1 w-full rounded-xl border border-line bg-cream px-4 py-3 text-lg font-semibold tabular-nums outline-none focus:border-ink"
			/>
		</div>
		<button
			type="submit"
			disabled={savingDayStart}
			class="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-base font-semibold text-white disabled:opacity-60"
		>
			{#if savingDayStart}
				<Spinner />
				Đang lưu…
			{:else}
				Lưu ngày bắt đầu
			{/if}
		</button>
	</form>
</section>

<section class="mt-5">
	<button
		onclick={logout}
		disabled={loggingOut}
		class="flex w-full items-center justify-center gap-2 rounded-xl border border-deficit/40 bg-deficit-bg py-3 text-base font-semibold text-deficit disabled:opacity-60"
	>
		{#if loggingOut}
			<Spinner color="deficit" />
			Đang đăng xuất…
		{:else}
			Đăng xuất
		{/if}
	</button>
</section>
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { createClient } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { formatMoney, parseMoneyInput } from '$lib/money';
	import Spinner from '$lib/Spinner.svelte';
	import MoneyInput from '$lib/MoneyInput.svelte';
	import { isVisualStyle, themeName, type VisualStyle } from '$lib/appearance';
	import { untrack } from 'svelte';

	let { data } = $props();
	const supabase = createClient();

	// Giá trị hiển thị ban đầu từ page data (layout đọc từ DB).
	// Sau khi lưu thành công, cập nhật local state + invalidateAll để server tải lại sạch.
	let displayedLimit = $state((data.defaultLimit as number | undefined) ?? 0);
	let displayedDayStart = $state((data.dayStart as number | undefined) ?? 1);
	let displayedStyle = $state<VisualStyle>(untrack(() => isVisualStyle(data.visualStyle) ? data.visualStyle : 'modern'));
	let selectedStyle = $state<VisualStyle>(untrack(() => displayedStyle));
	const currentTheme = $derived(themeName(displayedStyle, (data.themeIndex as number | undefined) ?? 0));

	let input = $state('');
	let dayStartInput = $state(String(displayedDayStart));
	let limitMsg = $state('');
	let dayStartMsg = $state('');
	let limitSuccess = $state(false);
	let dayStartSuccess = $state(false);
	let savingLimit = $state(false);
	let savingDayStart = $state(false);
	let loggingOut = $state(false);
	let savingStyle = $state(false);
	let styleMsg = $state('');
	let styleSuccess = $state(false);

	// Đồng bộ lại nếu page data đổi (vd sau invalidateAll khi quay lại trang)
	$effect(() => {
		const l = data.defaultLimit as number | undefined;
		const d = data.dayStart as number | undefined;
		if (typeof l === 'number') displayedLimit = l;
		if (typeof d === 'number') displayedDayStart = d;
		if (isVisualStyle(data.visualStyle)) {
			displayedStyle = data.visualStyle;
			selectedStyle = data.visualStyle;
		}
	});

	function onStyleSubmit(result: { type: string; data?: Record<string, unknown> }) {
		savingStyle = false;
		styleSuccess = result.type === 'success';
		styleMsg = result.type === 'success'
			? 'Đã lưu kiểu giao diện.'
			: String(result.data?.styleMessage ?? 'Không thể lưu giao diện. Hãy thử lại.');
		if (result.type === 'success') {
			displayedStyle = selectedStyle;
			void invalidateAll();
		}
	}

	function onLimitSubmit(result: { type: string; data?: Record<string, unknown> }) {
		savingLimit = false;
		limitSuccess = result.type === 'success';
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
		dayStartSuccess = result.type === 'success';
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

<h1 class="page-title mb-6">Cài đặt</h1>

<div class="md:grid md:grid-cols-2 md:items-start md:gap-6">

<section class="appearance-settings rounded-2xl border border-line bg-white p-5 md:col-span-2 md:p-6">
	<h2 class="section-title">Giao diện</h2>
	<p class="mt-1 text-sm text-muted">Chọn kiểu bạn thích. Trong mỗi kiểu, một trong 4 theme sẽ tự đổi khi bắt đầu vòng chi tiêu mới.</p>
	<p class="mt-2 text-sm text-muted">Vòng này: <span class="font-semibold text-ink">{currentTheme}</span></p>
	<form
		method="POST"
		action="?/updateVisualStyle"
		use:enhance={() => {
			// enhance đã đọc FormData trước callback này; khóa lựa chọn sau đó.
			savingStyle = true;
			return async ({ result }) => onStyleSubmit(result);
		}}
		class="mt-4"
	>
		{#if styleMsg}
			<p role="status" class="mb-4 rounded-lg px-3 py-2 text-sm {styleSuccess ? 'bg-surplus-bg text-surplus' : 'bg-deficit-bg text-deficit'}">{styleMsg}</p>
		{/if}
		<fieldset disabled={savingStyle}>
			<legend class="sr-only">Kiểu giao diện</legend>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="appearance-choice" class:appearance-choice-selected={selectedStyle === 'modern'}>
					<input type="radio" name="visualStyle" value="modern" bind:group={selectedStyle} />
					<span class="appearance-choice-content">
						<span class="appearance-choice-title">Hiện tại</span>
						<span class="appearance-choice-desc">Thoáng, phẳng, dễ tập trung vào số liệu.</span>
						<span class="appearance-sample appearance-sample-modern" aria-hidden="true"><span>Còn lại hôm nay</span><strong>100.000 đ</strong></span>
						<span class="appearance-swatches" aria-hidden="true"><i class="swatch-modern-0"></i><i class="swatch-modern-1"></i><i class="swatch-modern-2"></i><i class="swatch-modern-3"></i></span>
						<span class="appearance-choice-names">Tide · Dawn · Slate · Bloom</span>
					</span>
				</label>
				<label class="appearance-choice" class:appearance-choice-selected={selectedStyle === 'skeuomorphic'}>
					<input type="radio" name="visualStyle" value="skeuomorphic" bind:group={selectedStyle} />
					<span class="appearance-choice-content">
						<span class="appearance-choice-title">Nổi mềm</span>
						<span class="appearance-choice-desc">Bề mặt pastel, bóng nổi mềm và nút bấm lõm nhẹ.</span>
						<span class="appearance-sample appearance-sample-skeuo" aria-hidden="true"><span>Còn lại hôm nay</span><strong>100.000 đ</strong></span>
						<span class="appearance-swatches" aria-hidden="true"><i class="swatch-skeuo-0"></i><i class="swatch-skeuo-1"></i><i class="swatch-skeuo-2"></i><i class="swatch-skeuo-3"></i></span>
						<span class="appearance-choice-names">Sương xanh · Cát ấm · Ngọc dịu · Hồng phấn</span>
					</span>
				</label>
			</div>
		</fieldset>
		<button type="submit" disabled={savingStyle || selectedStyle === displayedStyle} class="ui-button ui-button-primary mt-4 w-full sm:w-auto">
			{#if savingStyle}<Spinner color="white" /> Đang lưu…{:else}Lưu giao diện{/if}
		</button>
	</form>
</section>

<section class="mt-6 md:mt-0 rounded-2xl border border-line bg-white p-5 md:p-6">
	<h2 class="section-title">Hạn mức mặc định mỗi ngày</h2>
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
			<p role="status" class="rounded-lg px-3 py-2 text-sm {limitSuccess ? 'bg-surplus-bg text-surplus' : 'bg-deficit-bg text-deficit'}">{limitMsg}</p>
		{/if}
		<div>
			<MoneyInput
				id="limit"
				name="limit"
				label="Hạn mức mặc định (đ)"
				value={input}
				onchange={(v) => (input = v)}
				placeholder={displayedLimit ? String(displayedLimit).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '0'}
			/>
		</div>
		<button
			type="submit"
			disabled={savingLimit}
			class="ui-button ui-button-primary w-full"
		>
			{#if savingLimit}
				<Spinner color="white" />
				Đang lưu…
			{:else}
				Lưu hạn mức
			{/if}
		</button>
	</form>
</section>

<section class="mt-6 md:mt-0 rounded-2xl border border-line bg-white p-5 md:p-6">
	<h2 class="section-title">Vòng chi tiêu (chu kỳ)</h2>
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
			<p role="status" class="rounded-lg px-3 py-2 text-sm {dayStartSuccess ? 'bg-surplus-bg text-surplus' : 'bg-deficit-bg text-deficit'}">{dayStartMsg}</p>
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
				class="font-display mt-1 w-full border px-4 py-3 text-lg font-semibold tabular-nums ui-input"
			/>
		</div>
		<button
			type="submit"
			disabled={savingDayStart}
			class="ui-button ui-button-primary w-full"
		>
			{#if savingDayStart}
				<Spinner color="white" />
				Đang lưu…
			{:else}
				Lưu ngày bắt đầu
			{/if}
		</button>
	</form>
</section>

<section class="mt-5 md:col-span-2 md:mt-0">
	<button
		onclick={logout}
		disabled={loggingOut}
		class="ui-button w-full border border-deficit/40 bg-deficit-bg text-deficit"
	>
		{#if loggingOut}
			<Spinner color="deficit" />
			Đang đăng xuất…
		{:else}
			Đăng xuất
		{/if}
	</button>
</section>
</div>

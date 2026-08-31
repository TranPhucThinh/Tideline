<script lang="ts">
	/**
	 * Trường chọn ngày tùy chỉnh, hiển thị theo định dạng Việt Nam.
	 * Dùng một <input type="date"> ẩn để mở picker gốc của trình duyệt/iPhone
	 * (iOS render native date input kém, đè format, không hiện icon, tràn chiều rộng).
	 *
	 * Props:
	 *  - value: chuỗi 'YYYY-MM-DD'
	 *  - max: chuỗi 'YYYY-MM-DD' hoặc undefined
	 *  - label: nhãn phía trên
	 *  - onchange: (date: string) => void
	 */

	let {
		label,
		value,
		max = undefined,
		onchange
	}: {
		label: string;
		value: string;
		max?: string | undefined;
		onchange?: (date: string) => void;
	} = $props();

	let nativeInput: HTMLInputElement | undefined = $state();

	let display = $derived.by(() => formatDisplayDate(value));

	function openPicker() {
		const el = nativeInput;
		if (!el) return;
		try {
			// Phương thức hiện đại: mở picker ngày trực tiếp mà không cần focus
			el.showPicker?.();
		} catch {
			el.showPicker();
		}
	}

	function onNativeChange() {
		if (nativeInput?.value) {
			onchange?.(nativeInput.value);
		}
	}

	// Format 'YYYY-MM-DD' (local) -> 'Thứ Tư, 31/08/2026'
	function formatDisplayDate(key: string): string {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
		const [y, m, d] = key.split('-').map(Number);
		const date = new Date(y, m - 1, d);
		if (Number.isNaN(date.getTime())) return key;
		const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' });
		const mm = String(m).padStart(2, '0');
		const dd = String(d).padStart(2, '0');
		return `${weekday}, ${dd}/${mm}/${y}`;
	}
</script>

<div class="relative">
	{#if label}
		<label for="date-field-input" class="text-sm font-medium text-muted">{label}</label>
	{/if}

	<!-- Input date ẩn, phủ lên toàn bộ vùng để click mở picker gốc -->
	<div class="relative mt-1">
		<input
			id="date-field-input"
			bind:this={nativeInput}
			type="date"
			value={value}
			max={max}
			onchange={onNativeChange}
			aria-label={label || 'Chọn ngày'}
			class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
		/>
		<!-- Hiển thị tùy chỉnh -->
		<button
			type="button"
			onclick={openPicker}
			class="pointer-events-none flex w-full items-center justify-between rounded-xl border border-line bg-cream px-4 py-3 text-left text-base"
			tabindex="-1"
			aria-hidden="true"
		>
			<span>{display}</span>
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="text-muted"
			>
				<rect x="3" y="4" width="18" height="18" rx="2" />
				<path d="M16 2v4" />
				<path d="M8 2v4" />
				<path d="M3 10h18" />
			</svg>
		</button>
	</div>
</div>
<script lang="ts">
	/**
	 * Trường nhập số tiền, tự chèn dấu chấm phân cách hàng nghìn (1.234.000) khi gõ.
	 *
	 * Chỉ nhận/dấu giữ chữ số (0–9), bỏ mọi ký tự khác. Giá trị output (gọi qua `onchange`)
	 * là chuỗi đã định dạng (vd "1.234.000") — `parseMoneyInput` đã xử lý dấu chấm nên vẫn
	 * parse đúng. Vị trí con trỏ được giữ nguyên sau lần chèn dấu phân cách.
	 *
	 * Props:
	 *  - value:      chuỗi giá trị đang giữ ở component cha
	 *  - onchange:   (value: string) => void — gọi với chuỗi đã định dạng
	 *  - id:         id của input (để <label for> dùng)
	 *  - label:      nhãn phía trên (optional)
	 *  - placeholder: placeholder text (optional)
	 */

	let {
		value,
		onchange,
		id,
		label = '',
		placeholder = '0',
		compact = false,
		name = undefined
	}: {
		value: string;
		onchange?: (value: string) => void;
		id: string;
		label?: string;
		placeholder?: string;
		compact?: boolean;
		name?: string | undefined;
	} = $props();

	let inputEl: HTMLInputElement | undefined = $state();

	// Padding: compact (trong form sửa inline) dùng px-3 py-2, còn lại px-4 py-3.
	let padClass = $derived(compact ? 'px-3 py-2 text-base' : 'px-4 py-3 text-lg');

	// Chuỗi hiển thị: lấy chữ số từ `value`, thêm phân cách hàng nghìn.
	let display = $derived.by(() => {
		const digits = (value ?? '').replace(/[^0-9]/g, '');
		return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
	});

	function onInput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const caret = el.selectionStart ?? el.value.length;
		const raw = el.value;

		// Số chữ số nằm trước con trỏ để tái lập vị trí đúng sau khi định dạng lại.
		const digitsBefore = raw.slice(0, caret).replace(/[^0-9]/g, '').length;

		// Giữ lại chữ số, bỏ số 0 đứng đầu (trừ khi chỉ có mỗi số 0).
		const digits = raw.replace(/[^0-9]/g, '').replace(/^(0+)(?=\d)/, '');

		const formatted = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
		el.value = formatted;
		onchange?.(formatted);

		// Đặt con trỏ ngay sau đúng số chữ số đã gõ (bỏ qua dấu phân cách, số 0 đầu đã bỏ).
		let pos = 0;
		let count = 0;
		while (pos < formatted.length && count < digitsBefore) {
			if (/\d/.test(formatted[pos])) count++;
			pos++;
		}
		el.setSelectionRange(pos, pos);
	}

	function focusAll() {
		inputEl?.select();
	}
</script>

<div>
	{#if label}
		<label for={id} class="text-sm font-medium text-muted">{label}</label>
	{/if}
	<input
		bind:this={inputEl}
		id={id}
		{name}
		type="text"
		inputmode="numeric"
		autocomplete="off"
		value={display}
		placeholder={placeholder}
		oninput={onInput}
		onfocus={focusAll}
		class="font-display mt-1 w-full rounded-xl border border-line bg-cream {padClass} font-semibold tabular-nums outline-none focus:border-ink"
	/>
</div>
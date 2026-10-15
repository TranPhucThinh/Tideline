<script lang="ts">
	import { tick } from 'svelte';
	import { formatMoney, parseMoneyExpression } from './money';
	/**
	 * Trường nhập số tiền, tự chèn dấu chấm phân cách hàng nghìn (1.234.000) khi gõ.
	 *
	 * Mặc định chỉ giữ chữ số (0–9). `allowExpression` giữ nguyên chuỗi cộng/trừ,
	 * hiển thị kết quả và kiểm tra tính hợp lệ; chỉ bật cho khoản thu/chi.
	 * Giá trị output mặc định (gọi qua `onchange`)
	 * là chuỗi đã định dạng (vd "1.234.000") — `parseMoneyInput` đã xử lý dấu chấm nên vẫn
	 * parse đúng. Vị trí con trỏ được giữ nguyên sau lần chèn dấu phân cách.
	 *
	 * Props:
	 *  - value:      chuỗi giá trị đang giữ ở component cha
	 *  - onchange:   (value: string) => void — gọi với chuỗi đã định dạng
	 *  - id:         id của input (để <label for> dùng)
	 *  - label:      nhãn phía trên (optional)
	 *  - placeholder: placeholder text (optional)
	 *  - allowExpression: bật nhập cộng/trừ số tiền nguyên (mặc định false)
	 */

	let {
		value,
		onchange,
		id,
		label = '',
		placeholder = '0',
		compact = false,
		name = undefined,
		allowExpression = false
	}: {
		value: string;
		onchange?: (value: string) => void;
		id: string;
		label?: string;
		placeholder?: string;
		compact?: boolean;
		name?: string | undefined;
		allowExpression?: boolean;
	} = $props();

	let inputEl: HTMLInputElement | undefined = $state();
	let checkedValue = $state<string | null>(null);
	let composing = $state(false);
	let selectionStart = 0;
	let selectionEnd = 0;
	let result = $derived(parseMoneyExpression(value ?? ''));
	let expressionMessage = $derived(
		result.status === 'invalid' ? result.message :
		result.status === 'incomplete' ? 'Nhập tiếp số tiền sau dấu + hoặc −.' :
		result.status === 'empty' ? 'Nhập số tiền hoặc phép cộng/trừ.' : ''
	);
	let showError = $derived(allowExpression && !composing && (
		result.status === 'invalid' || (checkedValue === value && result.status !== 'valid')
	));

	$effect(() => {
		inputEl?.setCustomValidity(allowExpression && result.status !== 'valid' ? expressionMessage : '');
	});

	// Padding: compact (trong form sửa inline) dùng px-3 py-2, còn lại px-4 py-3.
	let padClass = $derived(compact ? 'px-3 py-2 text-base' : 'px-4 py-3 text-lg');

	// Chuỗi hiển thị: lấy chữ số từ `value`, thêm phân cách hàng nghìn.
	let display = $derived.by(() => {
		if (allowExpression) return value ?? '';
		const digits = (value ?? '').replace(/[^0-9]/g, '');
		return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
	});

	function onInput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		if (allowExpression) {
			checkedValue = null;
			rememberSelection();
			onchange?.(el.value);
			return;
		}
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
		if (!allowExpression) inputEl?.select();
	}

	function rememberSelection() {
		selectionStart = inputEl?.selectionStart ?? 0;
		selectionEnd = inputEl?.selectionEnd ?? selectionStart;
	}

	function onPaste(event: ClipboardEvent) {
		if (!allowExpression) return;
		const pasted = event.clipboardData?.getData('text/plain');
		if (!pasted || !/[\r\n]/.test(pasted)) return;
		// A text input silently removes line breaks during native paste. Preserve the
		// invalid source in parent state so preview and save both reject that paste.
		event.preventDefault();
		const el = event.currentTarget as HTMLInputElement;
		const start = el.selectionStart ?? el.value.length;
		const end = el.selectionEnd ?? start;
		checkedValue = null;
		onchange?.(el.value.slice(0, start) + pasted + el.value.slice(end));
	}

	async function insertOperator(operator: '+' | '-') {
		const el = inputEl;
		if (!el || composing) return;
		const raw = el.value;
		const candidate = raw.slice(0, selectionStart) + operator + raw.slice(selectionEnd);
		const parsed = parseMoneyExpression(candidate);
		// Buttons never insert a leading/repeated operator or break a number's grouping.
		if (parsed.status !== 'valid' && parsed.status !== 'incomplete' &&
			!(parsed.status === 'invalid' && parsed.value !== undefined)) return;
		const caret = selectionStart + 1;
		checkedValue = null;
		el.focus({ preventScroll: true });
		el.setSelectionRange(selectionStart, selectionEnd);
		// Native insertion retains the input's undo/redo history, unlike setRangeText.
		if (!document.execCommand('insertText', false, operator)) {
			el.setRangeText(operator, selectionStart, selectionEnd, 'end');
		}
		onchange?.(candidate);
		await tick();
		el.setSelectionRange(caret, caret);
		rememberSelection();
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
		required={allowExpression}
		aria-describedby={allowExpression ? `${id}-hint` : undefined}
		aria-invalid={showError || undefined}
		placeholder={placeholder}
		oninput={onInput}
		onpaste={onPaste}
		onfocus={focusAll}
		onselect={rememberSelection}
		onkeyup={rememberSelection}
		onclick={rememberSelection}
		onblur={() => { rememberSelection(); checkedValue = value; }}
		oninvalid={() => (checkedValue = value)}
		oncompositionstart={() => (composing = true)}
		oncompositionend={() => (composing = false)}
		class="font-display mt-1 w-full border {padClass} font-semibold tabular-nums ui-input"
	/>
	{#if allowExpression}
		<div class="mt-2 flex items-start gap-3">
			<p id={`${id}-hint`} aria-live="polite" class="min-w-0 flex-1 text-sm [overflow-wrap:anywhere] {showError ? 'text-deficit' : 'text-muted'}">
				{#if !composing && (result.status === 'valid' || (result.status === 'invalid' && result.value !== undefined))}
					<span class="font-display block font-semibold tabular-nums text-ink">= {formatMoney(result.value ?? 0)}</span>
				{/if}
				{composing ? 'Đang nhập số tiền…' : expressionMessage}
			</p>
			<div class="flex shrink-0 gap-2">
				{#each ['+', '-'] as const as operator}
					<button
						type="button"
						aria-label={operator === '+' ? 'Thêm phép cộng' : 'Thêm phép trừ'}
						disabled={composing}
						onpointerdown={(event) => event.preventDefault()}
						onclick={() => insertOperator(operator)}
						class="ui-button ui-button-secondary flex h-11 w-11 items-center justify-center text-xl font-semibold"
					>{operator === '+' ? '+' : '−'}</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

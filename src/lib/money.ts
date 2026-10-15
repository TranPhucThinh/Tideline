/**
 * Định dạng tiền kiểu Việt Nam: 1.234.000 đ
 */
export function formatMoney(value: number): string {
	const rounded = Math.round(value);
	const formatted = rounded
		.toString()
		.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	return `${formatted} đ`;
}

/**
 * Hiển thị số dư kèm dấu cộng/trừ, ví dụ: +10.000 đ / -50.000 đ / 0 đ
 */
export function formatSignedMoney(value: number): string {
	const rounded = Math.round(value);
	if (rounded === 0) return '0 đ';
	const sign = rounded > 0 ? '+' : '-';
	return `${sign}${formatMoney(Math.abs(rounded))}`;
}

/**
 * Chuyển chuỗi nhập từ input (có thể có dấu chấm, phẩy, khoảng trắng) thành số nguyên.
 * Nếu không parse được hoặc không phải số dương > 0 -> trả về null.
 */
export function parseMoneyInput(raw: string): number | null {
	const cleaned = raw.replace(/[.\s]/g, '').replace(',', '.');
	if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
	const value = Number(cleaned);
	if (!Number.isFinite(value) || value <= 0) return null;
	return Math.round(value);
}

export type MoneyExpressionResult =
	| { status: 'empty' | 'incomplete' }
	| { status: 'invalid'; message: string; value?: number }
	| { status: 'valid'; value: number };

/** Evaluate integer VND additions/subtractions without changing or executing the input. */
export function parseMoneyExpression(raw: string): MoneyExpressionResult {
	const invalid = (message: string): MoneyExpressionResult => ({ status: 'invalid', message });
	if (raw.length > 200) return invalid('Phép tính quá dài. Nhập tối đa 200 ký tự.');
	if (/[\r\n]/.test(raw)) return invalid('Nhập phép tính trên một dòng.');
	const expression = raw.replace(/−/g, '-').trim();
	if (!expression) return { status: 'empty' };
	const tokens = expression.split(/([+-])/);
	let total = 0;
	for (let i = 0; i < tokens.length; i += 2) {
		const token = tokens[i].trim();
		if (!token && i > 0 && i === tokens.length - 1) return { status: 'incomplete' };
		// Dots are accepted only as correctly grouped thousands, never as decimals.
		if (!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+)$/.test(token)) {
			return invalid('Nhập số tiền nguyên và dấu + hoặc −. Dùng dấu chấm để ngăn cách hàng nghìn.');
		}
		const amount = Number(token.replace(/\./g, ''));
		if (!Number.isSafeInteger(amount)) return invalid('Số tiền quá lớn. Hãy giảm số tiền.');
		total += tokens[i - 1] === '-' ? -amount : amount;
		if (!Number.isSafeInteger(total)) return invalid('Kết quả quá lớn. Hãy giảm số tiền.');
	}
	if (total <= 0) {
		return { status: 'invalid', message: 'Số tiền cuối cùng phải lớn hơn 0.', value: total };
	}
	return { status: 'valid', value: total };
}

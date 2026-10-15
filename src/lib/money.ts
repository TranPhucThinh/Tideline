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

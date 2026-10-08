/**
 * Application date in the configured business timezone.
 * Tideline is a Vietnamese product, so the business timezone is explicit
 * instead of inheriting the machine timezone on SSR or in tests.
 */
export const APP_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function toDateKey(year: number, month: number, day: number): string {
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayKey(): string {
	return dateKeyInAppTimezone(new Date());
}

export function dateKeyInAppTimezone(date: Date): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: APP_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);
	const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
	return `${values.year}-${values.month}-${values.day}`;
}

export function isValidDateKey(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	const parsed = new Date(year, month - 1, day);
	return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

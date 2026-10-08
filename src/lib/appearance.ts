export type VisualStyle = 'modern' | 'skeuomorphic';

export const THEME_NAMES: Record<VisualStyle, readonly string[]> = {
	modern: ['Tide', 'Dawn', 'Slate', 'Bloom'],
	skeuomorphic: ['Sổ thu chi', 'Đồng thau', 'Men biển', 'Đất nung']
};

export function isVisualStyle(value: unknown): value is VisualStyle {
	return value === 'modern' || value === 'skeuomorphic';
}

/** A cycle's start month is its stable identity, even when day_start changes. */
export function themeIndexForCycle(cycleStart: string, firstCycleStart: string): number {
	const [year, month] = cycleStart.split('-').map(Number);
	const [firstYear, firstMonth] = firstCycleStart.split('-').map(Number);
	if (![year, month, firstYear, firstMonth].every(Number.isFinite)) return 0;
	const elapsedMonths = (year - firstYear) * 12 + month - firstMonth;
	return ((elapsedMonths % 4) + 4) % 4;
}

export function themeName(style: VisualStyle, index: number): string {
	return THEME_NAMES[style][index] ?? THEME_NAMES[style][0];
}

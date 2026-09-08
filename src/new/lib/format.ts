/** Strips the "Shadow" marker and any empty "()" the game-master leaves behind. */
export const cleanName = (name: string): string =>
	name
		.replace(/\(Shadow\)/gi, '')
		.replace(/Shadow/g, '')
		.replace(/\s*\(\s*\)/g, '')
		.replace(/\s{2,}/g, ' ')
		.trim();

export const dexNo = (dex: number): string => `#${String(dex).padStart(3, '0')}`;

export const ordinal = (n: number): string => {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

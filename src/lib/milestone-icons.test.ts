import { describe, expect, it } from 'vitest';

import { bonusIcons } from './milestone-icons';

describe('the icons of a bonus, by keywords in its English text', () => {
	it.each([
		['2× Catch Candy', ['candy', 'candy']],
		['3× XP for catching Pokémon.', ['xp']],
		['2× Candy for catching Pokémon.', ['candy', 'candy']],
		['2× chance for Trainers level 31 and up to receive Candy XL from catching Pokémon.', ['candyXl']],
		['Rare Candy XL', ['rareCandyXl']],
		['Rare Candy XL', ['rareCandyXl']],
		['Rare Candy', ['rareCandy']],
		['Candy XL and Rare Candy XL', ['rareCandyXl', 'candyXl']],
		['Lucky Egg', ['luckyEgg']],
		['Lure Modules will last for one hour and may attract the featured Pokémon.*', ['lure']],
		['Trades will require 50% less Stardust.*', ['trade', 'stardust']],
		['Take a few snapshots during Community Day for a surprise!', ['camera']],
		['Increased XP and Stardust from hatching Eggs.', ['egg', 'xp', 'stardust']],
		['2× Daily Adventure Incense duration.', ['dailyIncense']],
		['Free Stickers for catching Pokémon', ['stickers']],
		['One additional Candy for trading Pokémon.', ['candy', 'trade']],
		['And even more goodies!', []],
	])('%s', (text, icons) => {
		expect(bonusIcons(text)).toEqual(icons);
	});

	it('counts only the Incense of a sentence that excludes the Daily Adventure one', () => {
		expect(
			bonusIcons('Incense (excluding Daily Adventure Incense) activated during the event will last for three hours.')
		).toEqual(['incense']);
	});
});

describe('the vials of a Stardust multiplier', () => {
	it.each([
		['3× Stardust', ['stardust', 'stardustVial']],
		['2× Hatch Stardust', ['egg', 'stardust']],
		['5× Stardust for catching Pokémon', ['stardust', 'stardustVial', 'stardustVial', 'stardustVial']],
		['1× Stardust', ['stardustVial']],
		['More Stardust', ['stardust']],
	])('%s', (text, icons) => {
		expect(bonusIcons(text)).toEqual(icons);
	});
});

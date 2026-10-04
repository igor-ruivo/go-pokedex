import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import type { ILeagueDefinition } from '../DTOs/ILeagueDefinition';
import { leagueColor, leagueIcon, leagueTitle } from './league-visuals';

const league = (id: string, title: string, cpCap: number): ILeagueDefinition => ({
	id,
	title,
	cpCap,
	icon: '',
	rankingFile: '',
});

describe('leagueColor', () => {
	it('gives a Mega cup the colour of its tier, by cap', () => {
		expect(leagueColor('mega-1500')).toBe('var(--lg-great)');
		expect(leagueColor('mega-2500')).toBe('var(--lg-ultra)');
		expect(leagueColor('mega-10000')).toBe('var(--lg-master)');
	});

	it('gives a curated cup its own colour', () => {
		expect(leagueColor('little-500')).toBe('#f4c559');
		expect(leagueColor('retro-1500')).toBe('#ebe1ad');
	});

	it('gives any other cup a stable colour of its own', () => {
		const color = leagueColor('brand-new-cup-1500');
		expect(color).toMatch(/^#[0-9a-f]{6}$/);
		expect(leagueColor('brand-new-cup-1500')).toBe(color);
	});
});

describe('leagueIcon', () => {
	it('knows the icon of a mapped cup and nothing of a new one', () => {
		expect(leagueIcon('mega-1500')).toBe('/images/leagues/cups/great-league-mega-edition.png');
		expect(leagueIcon('brand-new-cup-1500')).toBeUndefined();
	});
});

describe('leagueTitle', () => {
	it('drops the CP cap dex-server bakes into a cup’s title', () => {
		expect(leagueTitle(league('brand-new-cup-1500', 'Brand New (1500 CP)', 1500), GameLanguage.en)).toEqual({
			short: 'Brand New',
			full: 'Brand New',
		});
	});

	it('names the yearly championship cup after the current year, whatever year its id carries', () => {
		const title = `${new Date().getFullYear()} GO LAIC`;
		expect(leagueTitle(league('laic2027-1500', 'LAIC (1500 CP)', 1500), GameLanguage.en)).toEqual({
			short: title,
			full: title,
		});
	});

	it('names a cup capped at 500 CP by its own name, never as a Great, Ultra or Master League', () => {
		const { short, full } = leagueTitle(league('little-500', 'little (500 CP)', 500), GameLanguage.en);
		expect(short.length).toBeGreaterThan(0);
		expect(`${short} ${full}`).not.toMatch(/great|ultra|master/i);
	});

	it('titles a Mega cup, whatever the wording', () => {
		const { short, full } = leagueTitle(league('mega-1500', 'Mega (1500 CP)', 1500), GameLanguage.en);
		expect(short.length).toBeGreaterThan(0);
		expect(full.length).toBeGreaterThan(0);
	});
});

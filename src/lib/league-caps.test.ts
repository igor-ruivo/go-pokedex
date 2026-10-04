import { afterEach, describe, expect, it } from 'vitest';

import type { TeamBuilderData } from '../DTOs/ITeamBuilder';
import { bestIvsFor, ivsKeyForCap, LEAGUE_CP, registerLeagueCaps } from './league-caps';

describe('LEAGUE_CP', () => {
	const original = { ...LEAGUE_CP };
	afterEach(() => {
		for (const key of Object.keys(LEAGUE_CP)) delete LEAGUE_CP[key];
		Object.assign(LEAGUE_CP, original);
	});

	it('knows the three permanent leagues', () => {
		expect(LEAGUE_CP.great).toBe(1500);
		expect(LEAGUE_CP.ultra).toBe(2500);
		expect(LEAGUE_CP.master).toBe(10000);
	});

	it('learns the caps of the rotating and custom cups as they load', () => {
		registerLeagueCaps([
			{ id: 'little', cpCap: 500 },
			{ id: 'custom-1', cpCap: 1800 },
		]);
		expect(LEAGUE_CP.little).toBe(500);
		expect(LEAGUE_CP['custom-1']).toBe(1800);
		expect(LEAGUE_CP.great).toBe(1500);
	});

	it('lets a cup at a permanent cap have its own entry without touching the permanent ones', () => {
		registerLeagueCaps([{ id: 'premier', cpCap: 1500 }]);
		expect(LEAGUE_CP.premier).toBe(1500);
		expect(LEAGUE_CP.great).toBe(1500);
	});
});

describe('ivsKeyForCap', () => {
	it('maps the permanent caps to their league ids and any other to cap-<n>', () => {
		expect(ivsKeyForCap(1500)).toBe('great');
		expect(ivsKeyForCap(2500)).toBe('ultra');
		expect(ivsKeyForCap(10000)).toBe('master');
		expect(ivsKeyForCap(500)).toBe('cap-500');
		expect(ivsKeyForCap(1800)).toBe('cap-1800');
	});
});

describe('bestIvsFor', () => {
	const builder = {
		ivs: { azumarill: { 'great': [40, 0, 15, 15], 'cap-500': [20, 1, 2, 3] } },
	} as unknown as Pick<TeamBuilderData, 'ivs'>;

	it('reads the spread for the cap’s key', () => {
		expect(bestIvsFor(builder, 'azumarill', 1500)).toEqual([40, 0, 15, 15]);
		expect(bestIvsFor(builder, 'azumarill', 500)).toEqual([20, 1, 2, 3]);
	});

	it('has none for a cap or species dex-server shipped nothing for, or without data', () => {
		expect(bestIvsFor(builder, 'azumarill', 2500)).toBeUndefined();
		expect(bestIvsFor(builder, 'medicham', 1500)).toBeUndefined();
		expect(bestIvsFor(undefined, 'azumarill', 1500)).toBeUndefined();
	});
});

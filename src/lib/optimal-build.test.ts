import { describe, expect, it } from 'vitest';

import { computeBestIVs } from '../utils/pokemon-helper';
import { computeOptimalBuild } from './optimal-build';

const table = (base: { atk: number; def: number; hp: number }, cap: number, maxLevel: number) =>
	Object.values(computeBestIVs(base.atk, base.def, base.hp, cap, maxLevel)).flat();

const medicham = { atk: 121, def: 152, hp: 155 };
const venusaurMega = { atk: 241, def: 246, hp: 190 };
const GREAT = 1500;
const MASTER = 10000;

const medichamGreat = {
	rows50: table(medicham, GREAT, 50),
	rows51: table(medicham, GREAT, 51),
};
const venusaurMaster = {
	rows50: table(venusaurMega, MASTER, 50),
	rows51: table(venusaurMega, MASTER, 51),
};
const venusaurGreat = {
	rows50: table(venusaurMega, GREAT, 50),
	rows51: table(venusaurMega, GREAT, 51),
};

const none = { buddy: false, superMega: false };
const medichamAt = (ivs: [number, number, number] | undefined, level: number | undefined, flags = none) =>
	computeOptimalBuild({
		baseStats: medicham,
		canSuperMega: false,
		ivs,
		level,
		flags,
		cpCap: GREAT,
		...medichamGreat,
	});

describe('computeOptimalBuild — IVs measured against the Pokémon’s own level ceiling', () => {
	it('calls the best level-50 spread optimal for a Pokémon that is not a Best Buddy', () => {
		const result = medichamAt([5, 15, 15], 50);
		expect(result.ivRank).toBe(1);
		expect(result.ivsOptimal).toBe(true);
		expect(result.best).toEqual({ ivs: [5, 15, 15], level: 50 });
	});

	it('stops calling those IVs optimal once the Pokémon is a Best Buddy that gains from the ribbon', () => {
		// the best spread at level 51 for a Medicham in Great League is a different one: 5/15/15 is only rank 7 there
		const asBuddy = medichamAt([5, 15, 15], 50, { buddy: true, superMega: false });
		expect(asBuddy.ivRank).toBe(7);
		expect(asBuddy.ivsOptimal).toBe(false);
		expect(asBuddy.best).toEqual({ ivs: [4, 15, 15], level: 50.5 });
	});

	it('calls the Best Buddy spread optimal for the Best Buddy, and not for the same Pokémon without the ribbon', () => {
		expect(medichamAt([4, 15, 15], 50.5, { buddy: true, superMega: false }).ivsOptimal).toBe(true);
		expect(medichamAt([4, 15, 15], 50).ivsOptimal).toBe(false);
	});

	it('says what the Best Buddy button would set, and what turning it off would go back to', () => {
		expect(medichamAt([5, 15, 15], 50).buddy).toEqual({ ivs: [4, 15, 15], level: 50.5 });
		expect(medichamAt([4, 15, 15], 50.5, { buddy: true, superMega: false }).buddy).toEqual({
			ivs: [5, 15, 15],
			level: 50,
		});
	});

	it('is optimal in level only at the highest level the cap allows under the ceiling', () => {
		expect(medichamAt([5, 15, 15], 50).levelOptimal).toBe(true);
		expect(medichamAt([5, 15, 15], 49).levelOptimal).toBe(false);
		// a level that follows the cap is not pinned: it is shown as optimal by the card, not here
		expect(medichamAt([5, 15, 15], undefined).levelOptimal).toBe(false);
		expect(medichamAt([4, 15, 15], 50.5, { buddy: true, superMega: false }).levelOptimal).toBe(true);
		expect(medichamAt([4, 15, 15], 50, { buddy: true, superMega: false }).levelOptimal).toBe(false);
	});

	it('knows nothing without IVs or base stats', () => {
		const empty = {
			ivRank: undefined,
			ivsOptimal: false,
			levelOptimal: false,
			best: undefined,
			buddy: undefined,
			superMega: undefined,
		};
		expect(medichamAt(undefined, 50)).toEqual(empty);
		expect(
			computeOptimalBuild({
				baseStats: undefined,
				canSuperMega: false,
				ivs: [1, 2, 3],
				level: 50,
				flags: none,
				cpCap: GREAT,
				...medichamGreat,
			})
		).toEqual(empty);
	});

	it('has no rank for IVs outside the table', () => {
		expect(computeOptimalBuild({ ...base(), rows50: [], rows51: [] }).ivRank).toBeUndefined();
	});

	function base() {
		return {
			baseStats: medicham,
			canSuperMega: false,
			ivs: [5, 15, 15] as [number, number, number],
			level: 50,
			flags: none,
			cpCap: GREAT,
		};
	}
});

describe('computeOptimalBuild — Super Max Mega', () => {
	const venusaur = (
		flags: { buddy: boolean; superMega: boolean },
		level: number | undefined,
		tables = venusaurMaster,
		cpCap = MASTER,
		canSuperMega = true
	) =>
		computeOptimalBuild({
			baseStats: venusaurMega,
			canSuperMega,
			ivs: [15, 15, 15],
			level,
			flags,
			cpCap,
			...tables,
		});

	it('takes the level ceiling to 52 for a Super Max Mega, and to 53 with the Best Buddy ribbon too', () => {
		expect(venusaur(none, 50).best).toEqual({ ivs: [15, 15, 15], level: 50 });
		expect(venusaur({ buddy: false, superMega: true }, 52).best).toEqual({ ivs: [15, 15, 15], level: 52 });
		expect(venusaur({ buddy: true, superMega: true }, 53).best).toEqual({ ivs: [15, 15, 15], level: 53 });
		expect(venusaur({ buddy: true, superMega: false }, 51).best).toEqual({ ivs: [15, 15, 15], level: 51 });
	});

	it('says what the Super Max Mega button would set, keeping the Best Buddy state', () => {
		expect(venusaur(none, 50).superMega).toEqual({ ivs: [15, 15, 15], level: 52 });
		expect(venusaur({ buddy: true, superMega: false }, 51).superMega).toEqual({ ivs: [15, 15, 15], level: 53 });
		// and what turning it off goes back to
		expect(venusaur({ buddy: false, superMega: true }, 52).superMega).toEqual({ ivs: [15, 15, 15], level: 50 });
		expect(venusaur({ buddy: true, superMega: true }, 53).superMega).toEqual({ ivs: [15, 15, 15], level: 51 });
	});

	it('says what the Best Buddy button would set, keeping the Super Max Mega state', () => {
		expect(venusaur({ buddy: false, superMega: true }, 52).buddy).toEqual({ ivs: [15, 15, 15], level: 53 });
		expect(venusaur({ buddy: true, superMega: true }, 53).buddy).toEqual({ ivs: [15, 15, 15], level: 52 });
	});

	it('has no Super Max Mega build for a species that cannot be one', () => {
		expect(venusaur(none, 50, venusaurMaster, MASTER, false).superMega).toBeUndefined();
	});

	it('is optimal in level at 52 only for a Super Max Mega, at 50 only for one that is not', () => {
		expect(venusaur({ buddy: false, superMega: true }, 52).levelOptimal).toBe(true);
		expect(venusaur({ buddy: false, superMega: true }, 50).levelOptimal).toBe(false);
		expect(venusaur(none, 50).levelOptimal).toBe(true);
		expect(venusaur(none, 52).levelOptimal).toBe(false);
	});

	it('keeps the same IV rank with or without the Super Max Mega status: its levels need no table of their own', () => {
		const plain = venusaur(none, 50);
		const asSuper = venusaur({ buddy: false, superMega: true }, 52);
		expect(asSuper.ivRank).toBe(plain.ivRank);
		expect(asSuper.ivsOptimal).toBe(plain.ivsOptimal);
	});

	it('is cap-bound in a capped league whatever the ceiling: the extra levels change nothing', () => {
		const plain = venusaur(none, undefined, venusaurGreat, GREAT);
		const asSuper = venusaur({ buddy: false, superMega: true }, undefined, venusaurGreat, GREAT);
		expect(asSuper.best).toEqual(plain.best);
		expect(asSuper.best!.level).toBeLessThan(50);
	});
});

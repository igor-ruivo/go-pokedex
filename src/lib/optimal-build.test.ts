import { describe, expect, it } from 'vitest';

import { computeBestIVs } from '../utils/pokemon-helper';
import { computeOptimalBuild } from './optimal-build';

const table = (base: { atk: number; def: number; hp: number }, cap: number, maxLevel: number) =>
	Object.values(computeBestIVs(base.atk, base.def, base.hp, cap, maxLevel)).flat();

const medicham = { atk: 121, def: 152, hp: 155 };
const venusaurMega = { atk: 241, def: 246, hp: 190 };
const GREAT = 1500;
const MASTER = 10000;

/** Every IV table a species can need, one per level ceiling: 50, 51, and 52 / 53 for a Super Max Mega. */
const tablesOf = (base: { atk: number; def: number; hp: number }, cap: number, ceilings = [50, 51]) => ({
	rows: Object.fromEntries(ceilings.map((ceiling) => [ceiling, table(base, cap, ceiling)])),
});

const medichamGreat = tablesOf(medicham, GREAT);
const venusaurMaster = tablesOf(venusaurMega, MASTER, [50, 51, 52, 53]);
const venusaurGreat = tablesOf(venusaurMega, GREAT, [50, 51, 52, 53]);
// light enough to fit Ultra League at level 50 — where a ceiling of 52 changes its best spread
const lightMega = { atk: 180, def: 200, hp: 150 };
const ULTRA = 2500;
const lightUltra = tablesOf(lightMega, ULTRA, [50, 51, 52, 53]);

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
		expect(computeOptimalBuild({ ...base(), rows: {} }).ivRank).toBeUndefined();
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

	it('is cap-bound for a heavy Mega in a capped league whatever the ceiling: the extra levels change nothing', () => {
		const plain = venusaur(none, undefined, venusaurGreat, GREAT);
		const asSuper = venusaur({ buddy: false, superMega: true }, undefined, venusaurGreat, GREAT);
		expect(asSuper.best).toEqual(plain.best);
		expect(asSuper.best!.level).toBeLessThan(50);
	});
});

describe('computeOptimalBuild — a Super Max Mega light enough to fit a capped league at level 50', () => {
	const light = (
		flags: { buddy: boolean; superMega: boolean },
		ivs: [number, number, number],
		level: number | undefined
	) =>
		computeOptimalBuild({
			baseStats: lightMega,
			canSuperMega: true,
			ivs,
			level,
			flags,
			cpCap: ULTRA,
			...lightUltra,
		});

	it('is measured against the level-52 table, not level 50’s', () => {
		// 8/15/15 is the best level-50 spread; with a ceiling of 52 it is 4/14/15
		const plain = light(none, [8, 15, 15], undefined);
		expect(plain.ivRank).toBe(1);
		expect(plain.ivsOptimal).toBe(true);

		const asSuper = light({ buddy: false, superMega: true }, [8, 15, 15], undefined);
		expect(asSuper.ivsOptimal).toBe(false);
		expect(asSuper.best!.ivs).toEqual([4, 14, 15]);
		expect(light({ buddy: false, superMega: true }, [4, 14, 15], undefined).ivsOptimal).toBe(true);
	});

	it('says what the Super Max Mega button sets (the level-52 spread), and what turning it off goes back to', () => {
		expect(light(none, [8, 15, 15], 50).superMega!.ivs).toEqual([4, 14, 15]);
		expect(light({ buddy: false, superMega: true }, [4, 14, 15], 52).superMega!.ivs).toEqual([8, 15, 15]);
	});

	it('takes the level of the spread up to the ceiling', () => {
		const best = light({ buddy: false, superMega: true }, [4, 14, 15], undefined).best!;
		expect(best.level).toBeGreaterThan(50);
		expect(best.level).toBeLessThanOrEqual(52);
	});
});

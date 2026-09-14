/**
 * Shared mock data for the Mass Delete algorithm test suites
 * (computeTrashString.test.ts / computeBadIvString.test.ts). Not a test file
 * itself — excluded from vitest's `include` glob by its filename.
 */
import { GameLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { PokemonTypes } from '../DTOs/PokemonTypes';
import type { RaidMetric } from '../lib/raid-metric';
import type { DPSEntry } from '../queries/raid-ranker';
import { type ComputeArgs, DEFAULT_PROTECTION } from './MassDelete';

// Despite `IGamemasterPokemon.types` being typed as `Array<PokemonTypes>`
// (a numeric TS enum), the real data dex-server serves is plain lowercase
// type-name strings ("grass", "fire", ...) cast to that type at the fetch
// boundary — never actual enum members. `computeTrashString`/
// `computeBadIvString` rely on this: they call `.toString().toLocaleLowerCase()`
// on each type, which only produces readable words ("grass") for a real
// lowercase-string runtime value; a genuine `PokemonTypes.Grass` enum member
// stringifies to its numeric index ("14") instead. Mocks must match the real
// runtime shape, not the static type.
export const mockType = (name: string): PokemonTypes => name as unknown as PokemonTypes;

export const mockPokemon = (
	overrides: Partial<IGamemasterPokemon> & Pick<IGamemasterPokemon, 'speciesId' | 'dex'>
): IGamemasterPokemon => ({
	speciesName: overrides.speciesId,
	types: [mockType('normal')],
	imageUrl: '',
	goImageUrl: '',
	shinyGoImageUrl: '',
	baseStats: { atk: 120, def: 120, hp: 120 },
	fastMoves: [],
	chargedMoves: [],
	extraChargedMoves: [],
	eliteMoves: [],
	legacyMoves: [],
	isShadow: false,
	isMega: false,
	isSuperMega: false,
	form: '',
	isLegendary: false,
	isMythical: false,
	isBeast: false,
	...overrides,
});

export const buildGamemaster = (list: Array<IGamemasterPokemon>): Record<string, IGamemasterPokemon> =>
	Object.fromEntries(list.map((p) => [p.speciesId, p]));

/** Just the 3-stage evolution line, nothing else — for the forward-only
 *  reachability tests, where a small/predictable dex universe matters (see
 *  that test file's own note on the positive-vs-negated dex-list encoding). */
export const buildEvolutionLineFixture = () => {
	const bulbasaur = mockPokemon({
		speciesId: 'bulbasaur',
		dex: 1,
		types: [mockType('grass'), mockType('poison')],
		baseStats: { atk: 118, def: 111, hp: 128 },
		family: { id: 'f-bulbasaur', evolutions: ['ivysaur'] },
	});
	const ivysaur = mockPokemon({
		speciesId: 'ivysaur',
		dex: 2,
		types: [mockType('grass'), mockType('poison')],
		baseStats: { atk: 151, def: 143, hp: 155 },
		family: { id: 'f-bulbasaur', parent: 'bulbasaur', evolutions: ['venusaur'] },
	});
	const venusaur = mockPokemon({
		speciesId: 'venusaur',
		dex: 3,
		types: [mockType('grass'), mockType('poison')],
		baseStats: { atk: 198, def: 189, hp: 190 },
		family: { id: 'f-bulbasaur', parent: 'ivysaur' },
	});
	const gamemasterPokemon = buildGamemaster([bulbasaur, ivysaur, venusaur]);
	return { gamemasterPokemon, bulbasaur, ivysaur, venusaur };
};

/**
 * The "everything else" fixture: one of each category the toggles/whitelist
 * care about, each isolated on its own dex unless the scenario specifically
 * needs a shared one. Not meant for hand-verifying exact dex-list string
 * encoding (too big for that — use `buildEvolutionLineFixture` or
 * `buildSmallSpecialDexesFixture` for those) — this one is for "does toggling
 * X change whether this species' own protective clause appears" tests, which
 * only need to check for that species' own substrings in the output.
 */
export const buildMainFixture = () => {
	// Standalone Shadow pair sharing one dex — no evolutions, so Shadow-toggle
	// tests aren't entangled with reachability.
	const shadowmon = mockPokemon({ speciesId: 'shadowmon', dex: 100, types: [mockType('psychic')] });
	const shadowmonShadow = mockPokemon({
		speciesId: 'shadowmon_shadow',
		dex: 100,
		isShadow: true,
		types: [mockType('psychic')],
	});

	// Two forms sharing one dex, disambiguated by a type each has uniquely at
	// that dex — for the manual-whitelist shared-dex edge case.
	const formGrass = mockPokemon({ speciesId: 'formmon_grass', dex: 555, types: [mockType('grass')] });
	const formFire = mockPokemon({ speciesId: 'formmon_fire', dex: 555, types: [mockType('fire')] });

	// Legendary / Mythical / Ultra Beast, each alone on its own dex (as real
	// game data always has them).
	const legendarymon = mockPokemon({ speciesId: 'legendarymon', dex: 150, isLegendary: true });
	const mythicalmon = mockPokemon({ speciesId: 'mythicalmon', dex: 151, isMythical: true });
	const beastmon = mockPokemon({ speciesId: 'beastmon', dex: 152, isBeast: true });

	// Mega-capable base + its Mega form, sharing a dex — `!p.isMega` always
	// excludes the Mega entry itself from candidacy regardless of any toggle;
	// only `megaEvolvable`'s tail keyword is toggle-controlled.
	const megabase = mockPokemon({ speciesId: 'megabase', dex: 200 });
	const megaform = mockPokemon({ speciesId: 'megabase_mega', dex: 200, isMega: true });

	const gamemasterPokemon = buildGamemaster([
		shadowmon,
		shadowmonShadow,
		formGrass,
		formFire,
		legendarymon,
		mythicalmon,
		beastmon,
		megabase,
		megaform,
	]);

	return {
		gamemasterPokemon,
		shadowmon,
		shadowmonShadow,
		formGrass,
		formFire,
		legendarymon,
		mythicalmon,
		beastmon,
		megabase,
		megaform,
	};
};

/**
 * A small (10-species) universe, deliberately sized so the positive dex list
 * ("1,2,3,4,5,6,7,8") and the negated/opposite list ("!9&!10") can be
 * hand-counted — for the `specialDexes`/`oppositeDexes` string-length
 * optimization test. 8 plain species (all made "bad", i.e. deletable) plus 2
 * that stay off the candidate list entirely (1 Legendary, 1 ordinary "good"
 * species) — so with all 10 dexes in the universe and 8 deletable, the
 * negated encoding ("!9&!10", 6 chars) is shorter than the positive one
 * ("1,2,3,4,5,6,7,8", 15 chars) and should win.
 */
export const buildSmallSpecialDexesFixture = () => {
	const plain = Array.from({ length: 8 }, (_, i) =>
		mockPokemon({ speciesId: `plain${i + 1}`, dex: i + 1, types: [mockType('normal')] })
	);
	const good = mockPokemon({ speciesId: 'goodmon', dex: 9, types: [mockType('normal')] });
	const legendarymon = mockPokemon({ speciesId: 'legendarymon', dex: 10, isLegendary: true });
	const gamemasterPokemon = buildGamemaster([...plain, good, legendarymon]);
	return { gamemasterPokemon, plain, good, legendarymon };
};

/**
 * Fixture for the Bad-IV mode tests. Base stats below were empirically
 * verified (via `computeBestIVs` directly, see the analysis this fixture's
 * comments describe) rather than guessed:
 * - `deviantmon` (300/100/100): at cap 2500 its real top-1 spread is 11/15/15
 *   (Attack bucket 3, not the "low" 0-1 the default rule assumes) — clears
 *   the 90%-of-cap pre-filter easily, so it genuinely needs its own
 *   carve-out at that cap. At cap 1500 its top-1 spread (1/13/15) DOES fit
 *   the default shape, so no carve-out is needed there.
 * - `deviantlegendary`: same deviating stats, but Legendary — for the
 *   toggle/carve-out-skip regression test.
 * - `deviantmonShadow`: same base stats, `isShadow: true` — used for the
 *   purification-aware carve-out tests (see `findBadIvCarveOuts`'s Shadow-
 *   only pass). Empirically verified via the actual worker function: at cap
 *   1500, purifying (raw +2 each stat, capped 15) makes raw `0/10/13` and
 *   `0/10/15` tie for the best *purified* stat product — bucket `0-2-3` and
 *   `0-2-4`, neither matching the default shape (Defense bucket 2 fails the
 *   `>=3` requirement) — genuinely new carve-outs a purification-blind
 *   analysis would never find, since deviantmon itself needs no cap-1500
 *   carve-out at all (its own raw top-1 already fits the default shape).
 * - `tinymon` (50/60/60): its 15/15/15/L50 max CP is 344, well under 90% of
 *   either 1500 or 2500 — never even reaches the "does its top spread fit
 *   the default" question, at either cap.
 * - `tinymonShadow`: same stats — purifying can't change whether the
 *   90%-of-cap pre-filter is cleared (it's identical either way, since a raw
 *   hundo purifies to itself), so this gets no carve-out either, at either
 *   cap — a purification-aware analysis correctly still leaves it deletable.
 */
export const buildBadIvFixture = () => {
	const deviantmon = mockPokemon({ speciesId: 'deviantmon', dex: 300, baseStats: { atk: 300, def: 100, hp: 100 } });
	const deviantlegendary = mockPokemon({
		speciesId: 'deviantlegendary',
		dex: 301,
		baseStats: { atk: 300, def: 100, hp: 100 },
		isLegendary: true,
	});
	const deviantmonShadow = mockPokemon({
		speciesId: 'deviantmon_shadow',
		dex: 300,
		isShadow: true,
		baseStats: { atk: 300, def: 100, hp: 100 },
	});
	const tinymon = mockPokemon({ speciesId: 'tinymon', dex: 302, baseStats: { atk: 50, def: 60, hp: 60 } });
	const tinymonShadow = mockPokemon({
		speciesId: 'tinymon_shadow',
		dex: 302,
		isShadow: true,
		baseStats: { atk: 50, def: 60, hp: 60 },
	});
	// `tiedmon` (100/132/180): reproduces, with synthetic stats, a real bug
	// found in live data (Raichu, Doduo, Naclstack, and 20+ others) — at cap
	// 1500 its top-1 stat product is a genuine TIE between the exact hundo
	// (15/15/15) and a 15/15/14 spread. `computeBestIVs` always lists the
	// hundo first (its own internal tie-break), so code that only looked at
	// index 0 silently never generated a carve-out for the 15/15/14 tie —
	// which isn't itself a hundo (no `!4*` safety net) and doesn't fit the
	// default low-Attack shape either, so it would've been wrongly swept
	// despite being tied for the best possible spread for this species.
	const tiedmon = mockPokemon({ speciesId: 'tiedmon', dex: 303, baseStats: { atk: 100, def: 132, hp: 180 } });
	// `blendmon` (140/120/140): empirically verified — at cap 1500 its own raw
	// top-1 deviates (bucket `2-4-4`, Attack too high for the default shape),
	// but every one of a Shadow's *purified*-best raw ties (Attack bucket 1
	// throughout) lands inside the default shape (Attack ≤ 1) — needs no
	// Shadow-specific carve-out at all, purification alone is enough.
	const blendmon = mockPokemon({ speciesId: 'blendmon', dex: 304, baseStats: { atk: 140, def: 120, hp: 140 } });
	const blendmonShadow = mockPokemon({
		speciesId: 'blendmon_shadow',
		dex: 304,
		isShadow: true,
		baseStats: { atk: 140, def: 120, hp: 140 },
	});
	// `overlapmon` (80/200/230): empirically verified — at cap 1500 both its
	// own raw top-1 AND a Shadow's purified-best top-1 land in the identical
	// bucket (`3-3-3`, neither the default shape nor a hundo) — the
	// dead-weight-avoidance case: the plain (shadow-agnostic) carve-out
	// clause the non-Shadow analysis already emits also protects a Shadow
	// catch matching that same raw bucket, so no separate `,!shadow`-scoped
	// clause should be emitted for it.
	const overlapmon = mockPokemon({ speciesId: 'overlapmon', dex: 305, baseStats: { atk: 80, def: 200, hp: 230 } });
	const overlapmonShadow = mockPokemon({
		speciesId: 'overlapmon_shadow',
		dex: 305,
		isShadow: true,
		baseStats: { atk: 80, def: 200, hp: 230 },
	});
	const gamemasterPokemon = buildGamemaster([
		deviantmon,
		deviantlegendary,
		deviantmonShadow,
		tinymon,
		tinymonShadow,
		tiedmon,
		blendmon,
		blendmonShadow,
		overlapmon,
		overlapmonShadow,
	]);
	return {
		gamemasterPokemon,
		deviantmon,
		deviantlegendary,
		deviantmonShadow,
		tinymon,
		tinymonShadow,
		tiedmon,
		blendmon,
		blendmonShadow,
		overlapmon,
		overlapmonShadow,
	};
};

/**
 * Two-stage evolution line for `findBadIvCarveOuts`, purpose-built to catch
 * the exact bug this session found and fixed manually (Lickitung/Kabuto,
 * Chansey/Blissey, Grimer/Muk): collecting only the FIRST unprotected
 * pattern found while walking a reachable family, instead of every distinct
 * one. Both stages' own top-1 spreads at cap 1500 were empirically verified
 * (via `computeBestIVs`) to deviate from the default shape, and to deviate
 * from EACH OTHER (different bucket signatures):
 * - `stageA` (100/100/300): top-1 is 12/15/13 → buckets 3/4/3.
 * - `stageB` (140/60/260), forward-reachable from stageA: top-1 is 8/15/15
 *   → buckets 2/4/4 — a different pattern, not a hundo (so not blanket-
 *   protected either).
 * Evaluating `stageA` as the origin must produce carve-outs for BOTH
 * patterns at cap 1500 — a buggy "stop at the first unprotected stage"
 * implementation would only find one of them.
 */
export const buildMultiStageBadIvFixture = () => {
	const stageA = mockPokemon({
		speciesId: 'stagea',
		dex: 400,
		baseStats: { atk: 100, def: 100, hp: 300 },
		family: { id: 'f-stage', evolutions: ['stageb'] },
	});
	const stageB = mockPokemon({
		speciesId: 'stageb',
		dex: 401,
		baseStats: { atk: 140, def: 60, hp: 260 },
		family: { id: 'f-stage', parent: 'stagea' },
	});
	const gamemasterPokemon = buildGamemaster([stageA, stageB]);
	return { gamemasterPokemon, stageA, stageB };
};

/**
 * Real Machop/Machoke/Machamp base stats (137/82/172, 177/125/190,
 * 234/159/207) plus their Shadow lines — a 3-stage family purpose-built to
 * exercise the Shadow-purification tie-explosion at real-world scale,
 * cross-verified against live dex-server data (see the session's own
 * back-and-forth deriving these by hand and checking them against the actual
 * algorithm). Every number below was independently re-derived via direct
 * `computeBestIVs`/purified-brute-force calls, not guessed:
 *
 * Non-Shadow (raw-only analysis) — all three get ZERO carve-outs, every
 * stage's own raw top-1 already fits the default shape or is an exact hundo:
 * - machop: clean 15/15/15 at both caps (no tie) — `!4*` alone covers it.
 * - machoke @1500: ties between 0/15/15 and 0/15/14, buckets 0-4-4/0-4-3 —
 *   both satisfy the default shape (Attack ≤1, Defense/HP ≥3).
 * - machamp @1500: 0/14/11, bucket 0-3-3 — also fits the default shape.
 *
 * Shadow (purification-aware analysis):
 * - machop_shadow: 16 entries total.
 *   - @1500 (9): the 7-way hundo-tie explosion {3,4}³ minus {4,4,4} (raw
 *     13/14/15 all purify to 15, so 2 possible raw buckets per stat tie for
 *     purified-hundo; {4,4,4} itself is skipped, already covered by `!4*`)
 *     — from Machop's OWN stage — PLUS 2 more (0-3-2, 0-4-2) from Machoke's
 *     own stage (its purified-best raw spread, ranked by PURIFIED outcome,
 *     not the same as Machoke's own raw-ranked top-1 above).
 *   - @2500 (7): the same 7-way hundo-tie explosion again — Machop's
 *     purified ceiling is hundo at Ultra League too.
 * - machoke_shadow: 9 entries total (a genuine SUBSET of machop_shadow's,
 *   since Machop's reachable family strictly contains Machoke's):
 *   - @1500 (2): 0-3-2 and 0-4-2 — its own stage's contribution.
 *   - @2500 (7): its own 7-way hundo-tie explosion (Machoke's purified
 *     ceiling is ALSO hundo-achievable at Ultra League).
 * - machamp_shadow: 0 entries — its own purified-best (bucket 1-3-3/1-4-3 at
 *   1500) already fits the default shape at every cap, no carve-out needed.
 */
export const buildShadowFamilyFixture = () => {
	const machop = mockPokemon({
		speciesId: 'machop',
		dex: 900,
		baseStats: { atk: 137, def: 82, hp: 172 },
		family: { id: 'f-machop', evolutions: ['machoke'] },
	});
	const machoke = mockPokemon({
		speciesId: 'machoke',
		dex: 901,
		baseStats: { atk: 177, def: 125, hp: 190 },
		family: { id: 'f-machop', parent: 'machop', evolutions: ['machamp'] },
	});
	const machamp = mockPokemon({
		speciesId: 'machamp',
		dex: 902,
		baseStats: { atk: 234, def: 159, hp: 207 },
		family: { id: 'f-machop', parent: 'machoke' },
	});
	const machopShadow = mockPokemon({
		speciesId: 'machop_shadow',
		dex: 900,
		isShadow: true,
		baseStats: { atk: 137, def: 82, hp: 172 },
		family: { id: 'f-machop-shadow', evolutions: ['machoke_shadow'] },
	});
	const machokeShadow = mockPokemon({
		speciesId: 'machoke_shadow',
		dex: 901,
		isShadow: true,
		baseStats: { atk: 177, def: 125, hp: 190 },
		family: { id: 'f-machop-shadow', parent: 'machop_shadow', evolutions: ['machamp_shadow'] },
	});
	const machampShadow = mockPokemon({
		speciesId: 'machamp_shadow',
		dex: 902,
		isShadow: true,
		baseStats: { atk: 234, def: 159, hp: 207 },
		family: { id: 'f-machop-shadow', parent: 'machoke_shadow' },
	});
	const gamemasterPokemon = buildGamemaster([machop, machoke, machamp, machopShadow, machokeShadow, machampShadow]);
	return { gamemasterPokemon, machop, machoke, machamp, machopShadow, machokeShadow, machampShadow };
};

export const rank = (r: number): { rank: number } => ({ rank: r });

export const mockDPSEntry = (overrides: Partial<DPSEntry> & { speciesId: string }): DPSEntry => ({
	dps: 0,
	tdo: 0,
	edps: 0,
	fastMove: 'mock_fast',
	fastMoveDmg: 0,
	chargedMove: 'mock_charged',
	chargedMoveDmg: 0,
	...overrides,
});

/** Full `ComputeArgs` with every knob defaulted to "protect everything,
 *  delete nothing" (empty rank lists ⇒ every league Infinity-ranked ⇒ bad,
 *  but also no raid data and generous cutoffs below don't matter since
 *  nothing is ranked) — override only what a given test actually varies. */
export const buildArgs = (
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	overrides: Partial<ComputeArgs> = {}
): ComputeArgs => ({
	gamemasterPokemon,
	rankLists: [{}, {}, {}],
	raidDPS: {},
	raidMetric: 'dps' as RaidMetric,
	gl: GameLanguage.en,
	cp: 1500,
	trashGreat: 10,
	trashUltra: 10,
	trashMaster: 10,
	trashRaid: 10,
	protect: DEFAULT_PROTECTION,
	whitelist: new Set<string>(),
	...overrides,
});

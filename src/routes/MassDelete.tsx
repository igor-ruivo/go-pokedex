import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ShadowMark } from '../components/ShadowMark';
import { spriteUrl } from '../components/Sprite';
import { useImageSource } from '../contexts/imageSource-context';
import { GameLanguage, useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { PokemonTypes } from '../DTOs/PokemonTypes';
import { useDismiss } from '../hooks/useDismiss';
import { cleanName, dexNo } from '../lib/format';
import { type RaidMetric, raidRankOf } from '../lib/raid-metric';
import {
	buildUniqueTypes,
	complementOfBucket,
	generatePokemonId,
	groupAttr,
	ivBucket,
	negateIdentity,
	translatePtBrTypeNames,
} from '../lib/search-string';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { type DPSEntry, useRaidRanker } from '../queries/raid-ranker';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import {
	ConfigKeys,
	readPersistentValue,
	readSessionValue,
	writePersistentValue,
	writeSessionValue,
} from '../utils/persistent-configs-handler';
import { fetchReachablePokemonIncludingSelf, isNormalPokemonAndHasShadowVersion } from '../utils/pokemon-helper';
import type { BadIvCarveOut } from '../workers/compute.worker';
import { getComputeWorker } from '../workers/compute-client';

const numCfg = (key: ConfigKeys, fallback: number): number => {
	const v = readPersistentValue(key);
	return v ? +v : fallback;
};

const boolCfg = (key: ConfigKeys, fallback: boolean): boolean => {
	const v = readPersistentValue(key);
	return v === null ? fallback : v === 'true';
};

const readWhitelist = (): Array<string> => {
	try {
		const raw = readPersistentValue(ConfigKeys.TrashWhitelist);
		const parsed: unknown = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
};

const CP_OPTIONS = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];

/** One of the seven categorical carve-outs both modes' search strings respect —
 *  each mirrors a literal, built-in Pokémon GO search keyword (`!favorite`,
 *  `!#`, `!legendary`, `!mythical`, `!ultra beast`, `!megaevolve`, `!shadow`)
 *  that the game itself evaluates against your live inventory; this app never
 *  needs to know which of your own catches are favorited or tagged; it just
 *  decides whether to emit the keyword at all. */
export interface ProtectionFlags {
	favorite: boolean;
	tagged: boolean;
	legendary: boolean;
	mythical: boolean;
	ultraBeast: boolean;
	megaEvolvable: boolean;
	shadow: boolean;
}

export const DEFAULT_PROTECTION: ProtectionFlags = {
	favorite: true,
	tagged: true,
	legendary: true,
	mythical: true,
	ultraBeast: true,
	megaEvolvable: true,
	// Off by default, unlike the rest: both modes already judge a Shadow catch
	// on its own individual merit (a Shadow and its non-Shadow counterpart are
	// separate candidates throughout) rather than never considering it at
	// all — turning this on is an explicit, blunt override of that, so it
	// shouldn't silently change what the legacy-verified algorithm would do.
	shadow: false,
};

const PROTECTION_META: ReadonlyArray<{
	key: keyof ProtectionFlags;
	label: string;
	description: string;
}> = [
	{
		key: 'favorite',
		label: 'Favorited',
		description: 'Pokémon marked as a Favorite in-game.',
	},
	{
		key: 'tagged',
		label: 'Tagged',
		description: 'Pokémon with a nickname or custom tag.',
	},
	{
		key: 'legendary',
		label: 'Legendary',
		description: 'Box legendaries (Mewtwo, Lugia, …).',
	},
	{
		key: 'mythical',
		label: 'Mythical',
		description: 'Mythicals (Mew, Celebi, …).',
	},
	{
		key: 'ultraBeast',
		label: 'Ultra Beast',
		description: 'Ultra Beasts (Nihilego, Buzzwole, …).',
	},
	{
		key: 'megaEvolvable',
		label: 'Mega Evolvable',
		description: 'Only the game knows this — needs enough Mega Energy banked for that species right now.',
	},
	{
		key: 'shadow',
		label: 'Shadow',
		description: 'Every Shadow Pokémon, regardless of its own IVs or rank.',
	},
];

/* Three tabs, three deliberately separate domains — each one asks exactly one
   question and ignores everything else, so their answers can be trusted and
   combined freely (run one, two, or all three, in any order):
     - Non-meta relevant: is this species competitively relevant ANYWHERE?
       Never looks at IVs, not even once.
     - Non-Perfect IVs: is this exact catch's IV spread the true best possible
       for its species? Never looks at meta relevance, not even once.
     - Tradeable: is this species relevant somewhere IVs don't matter (Master
       League, raids) while this catch's own IVs still have room to improve?
   Mixing "meta" and "IV" judgments in one tab was the mistake this app used
   to make (a "keep relevant for trade" checkbox in this tab used to do a
   half-hearted version of what the second tab now does properly) — each tab
   staying in its own lane is what makes all three trustworthy. */
const HELP_TEXT =
	'Meta only, never IVs: deletes any Pokémon that isn’t competitively relevant anywhere — not in Great, Ultra, or ' +
	'Master League, and not in raids — based on the rank cutoffs and CP cap below. A species (or any of its later ' +
	'evolutions) only needs to clear the cutoff in one of those to be spared, and once it does, every catch of it is ' +
	'spared too, regardless of that catch’s own IVs — this tab has no opinion on IVs at all. Anything at or above ' +
	'your CP cap is always kept, and so is everything checked in the categories and whitelist below, regardless of rank.';

const BAD_IV_WARNING =
	'This mode is aggressive and perfectionist: the intent is to delete every catch that isn’t a perfect (100%) IV ' +
	'Pokémon, with no regard for whether a species is currently good or bad in the meta — double-check the ' +
	'categories and whitelist below before running it.';

const BAD_IV_HELP_TEXT =
	'IVs only, never meta: ignores the current meta entirely — the goal is to delete anything that isn’t a perfect ' +
	'15/15/15, since anything less is wasted IV potential, regardless of whether the species itself is good or bad ' +
	'right now. The game’s search only lets us match IV ranges, not exact values, so it can’t always draw that line ' +
	'exactly — for Great League (1500 CP) and Ultra League (2500 CP), most species are swept via a shared ' +
	'low-Attack/high-bulk range that approximates it, and a few hundred get their own individually-verified range ' +
	'instead, since the shared one doesn’t actually fit their stats; either way, a few near-perfect (but ' +
	'not-quite-hundo) catches right at the boundary can slip through as false negatives. Master League has no CP ' +
	'cap, so there the true best really is always a plain 15/15/15 with nothing else close — this mode’s Master ' +
	'League handling is exact, not an approximation. A perfect 15/15/15 is always kept in every league, and so is ' +
	'everything checked in the categories and whitelist below, regardless of IVs.';

const TRADE_HELP_TEXT =
	'A third, separate question from the two tabs above: which of your catches are worth handing off in a trade? ' +
	'Master League has no CP cap, and raids don’t care about one either — so unlike Great/Ultra, a higher IV is ' +
	'never a downside there, only ever neutral or better. A Best Friend trade floors every stat at 5, a pure upgrade ' +
	'for exactly that population. So: any species relevant for Master League or raids (cutoffs below), whose current ' +
	'IVs aren’t already great, is worth trading — the meta relevance won’t change, and the IVs can only improve. A ' +
	'perfect 15/15/15 is always excluded (it has nothing to gain), and the categories and whitelist below narrow the ' +
	'suggestions further, same as the other tabs.';

export interface ComputeArgs {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	rankLists: Array<Record<string, { rank: number } | undefined>>;
	raidDPS: Record<string, Record<string, DPSEntry>>;
	raidMetric: RaidMetric;
	gl: GameLanguage;
	cp: number;
	trashGreat: number;
	trashUltra: number;
	trashMaster: number;
	trashRaid: number;
	protect: ProtectionFlags;
	/** Manually-protected species — never evaluated, always excluded outright. */
	whitelist: Set<string>;
}

/* ---- verbatim port of the legacy DeleteTrash `computeStr`, since extended
   with togglable category protection and a manual per-species whitelist ----
   Deliberately meta-only: whether a species (or any of its later evolutions)
   clears a rank/raid cutoff is a species-level fact, entirely independent of
   which IVs any particular catch of it has. Once it clears one cutoff
   anywhere, every catch of it is spared — no IV consideration enters into
   this tab at all, that's what the "Non-Perfect IVs" tab is for. */
export const computeTrashString = (a: ComputeArgs): string => {
	const { gamemasterPokemon, rankLists, raidDPS, raidMetric, gl, cp, trashGreat, trashUltra, trashMaster, trashRaid, protect, whitelist } =
		a;

	const enumValues: Array<PokemonTypes> = Object.keys(PokemonTypes)
		.filter((key) => isNaN(Number(key)) && key !== 'Normal')
		.map((key) => key as unknown as PokemonTypes);

	const isBadRank = (rank: number, rankLimit: number) => rank === Infinity || rank > rankLimit;

	const isGoodForRaids = (p: IGamemasterPokemon) => {
		let minRaidRank = Infinity;
		const finalCollection = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, undefined, true));
		enumValues.forEach((t) => {
			const list = raidDPS[t.toString().toLocaleLowerCase()];
			finalCollection.forEach((pk) => {
				const entry = list?.[pk.speciesId];
				const rank = entry && raidRankOf(entry, raidMetric);
				if (rank != null) {
					minRaidRank = Math.min(minRaidRank, rank);
				}
			});
		});
		return minRaidRank <= trashRaid;
	};

	const isBadForEverything = (p: IGamemasterPokemon) => {
		const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
		const glLowestRank = Math.min(
			...reachablePokemon.map((r) => rankLists[0][r.speciesId]?.rank).filter((r): r is number => !!r)
		);
		const ulLowestRank = Math.min(
			...reachablePokemon.map((r) => rankLists[1][r.speciesId]?.rank).filter((r): r is number => !!r)
		);
		const mlLowestRank = Math.min(
			...reachablePokemon.map((r) => rankLists[2][r.speciesId]?.rank).filter((r): r is number => !!r)
		);
		return (
			!isGoodForRaids(p) &&
			isBadRank(glLowestRank, trashGreat) &&
			isBadRank(ulLowestRank, trashUltra) &&
			isBadRank(mlLowestRank, trashMaster)
		);
	};

	const potentiallyDeletablePokemon = new Set<number>();
	const alwaysGood: Record<string, Set<IGamemasterPokemon>> = {};

	Object.values(gamemasterPokemon)
		.filter(
			(p) =>
				!p.aliasId &&
				!p.isMega &&
				(protect.legendary ? !p.isLegendary : true) &&
				(protect.mythical ? !p.isMythical : true) &&
				(protect.ultraBeast ? !p.isBeast : true)
		)
		.forEach((p) => {
			// Manually whitelisted — never run the (expensive, reachable-set-walking)
			// evaluation at all, just protect this exact form outright. Forcing it
			// into `alwaysGood` (rather than skipping it entirely) still lets a
			// non-whitelisted sibling sharing the same dex number get swept — this
			// form still gets its own disambiguating exclusion clause below.
			//
			// Shadow works the same way, and deliberately can't join the `.filter`
			// above the way Legendary/Mythical/Ultra Beast do: those categories
			// essentially never share a dex number with a non-excluded sibling, so
			// skipping them before they ever reach this loop is safe — but a Shadow
			// and its non-Shadow counterpart share the *same* dex number by
			// definition. Excluding Shadow at the `.filter` stage would mean a bad
			// non-Shadow sibling could still pull that dex into the deletable set
			// with nothing left in the loop to add the Shadow form's own protective
			// clause. Short-circuiting here instead still skips its own evaluation
			// (the efficiency win) while still emitting that clause when needed.
			if (whitelist.has(p.speciesId) || (protect.shadow && p.isShadow)) {
				if (!alwaysGood[p.dex]) {
					alwaysGood[p.dex] = new Set<IGamemasterPokemon>();
				}
				alwaysGood[p.dex].add(p);
				return;
			}
			if (isBadForEverything(p)) {
				potentiallyDeletablePokemon.add(p.dex);
			} else {
				if (!alwaysGood[p.dex]) {
					alwaysGood[p.dex] = new Set<IGamemasterPokemon>();
				}
				alwaysGood[p.dex].add(p);
			}
		});

	const allPokemonForms = Object.values(gamemasterPokemon)
		.filter((e) => !e.isMega && !e.aliasId)
		.map((e) => ({
			dexNumber: e.dex,
			types: e.types.map((f) => f.toString().toLocaleLowerCase()),
			isShadow: e.isShadow,
			p: e,
		}));

	const uniqueTypes = buildUniqueTypes(allPokemonForms.filter((c) => !c.isShadow));
	const baseIds: Record<string, string> = {};
	allPokemonForms.forEach((form) => {
		const formSiblings = allPokemonForms.filter((f) => f.dexNumber === form.dexNumber && !f.isShadow);
		const id = generatePokemonId(form.dexNumber, form.types, uniqueTypes, formSiblings, form);
		baseIds[`${form.dexNumber},${form.types.join(',')}`] = id;
	});

	let str = '';
	const potentiallyDeletablePokemonArray = Array.from(potentiallyDeletablePokemon);
	str += potentiallyDeletablePokemonArray.join(',');
	const terms = new Set<string>();

	potentiallyDeletablePokemonArray.forEach((d) => {
		if (alwaysGood[d]) {
			alwaysGood[d].forEach((e) => {
				let newStr = '';
				const baseId = baseIds[`${e.dex},${e.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];
				newStr += '&' + negateIdentity(baseId);
				if (e.isShadow) {
					newStr += `,!shadow`;
				} else if (isNormalPokemonAndHasShadowVersion(e, gamemasterPokemon)) {
					newStr += `,shadow`;
				}
				if (!terms.has(newStr)) {
					str += newStr;
					terms.add(newStr);
				}
			});
		}
	});

	// keep the query short — Android's search box caps out around 5k characters
	const parts = str.split('&');
	const allDexes = new Set(
		Object.values(gamemasterPokemon)
			.filter((e) => !e.isMega && !e.aliasId)
			.map((f) => f.dex)
	);
	const actualDexes = new Set(parts[0].split(',').map((f) => +f));
	// Safety net for the shortened "blacklist" encoding below: these dexes never
	// entered candidacy in the first place (see the `.filter` above), so they
	// must never end up matched by it either — but only while their toggle is
	// actually on; off, they've already been evaluated like anything else and
	// this must not silently re-protect them regardless of that verdict.
	const specialDexes = new Set(
		Object.values(gamemasterPokemon)
			.filter(
				(d2) =>
					!d2.aliasId &&
					!d2.isMega &&
					((protect.ultraBeast && d2.isBeast) ||
						(protect.legendary && d2.isLegendary) ||
						(protect.mythical && d2.isMythical))
			)
			.map((d2) => +d2.dex)
	);
	const oppositeDexes =
		'!' +
		Array.from(allDexes)
			.filter((j) => !actualDexes.has(j) || specialDexes.has(j))
			.join('&!');

	let newStr = parts[0].length <= oppositeDexes.length ? parts[0] : oppositeDexes;

	let currentDex = '';
	const buffer = new Map<string, string>();
	for (let i = 1; i < parts.length; i++) {
		const current = parts[i];
		const readDex = current.substring(1, current.indexOf(','));
		if (currentDex !== readDex) {
			currentDex = readDex;
			if (buffer.size > 0) {
				newStr += (newStr ? '&' : '') + Array.from(buffer.values()).join('&');
				buffer.clear();
			}
		}
		const termWithoutShadowModifier = current.replaceAll(',!shadow', '').replaceAll(',shadow', '');
		if (!buffer.has(termWithoutShadowModifier)) {
			buffer.set(termWithoutShadowModifier, current);
		} else {
			buffer.set(termWithoutShadowModifier, termWithoutShadowModifier);
		}
	}
	if (buffer.size > 0) {
		newStr += (newStr ? '&' : '') + Array.from(buffer.values()).join('&');
	}

	if (gl === GameLanguage.ptbr) {
		newStr = translatePtBrTypeNames(newStr);
	}

	newStr += `&!4*&!${gameTranslator(GameTranslatorKeys.CP, gl)}${cp}-`;
	if (protect.tagged) newStr += '&!#';
	if (protect.favorite) newStr += `&!${gameTranslator(GameTranslatorKeys.Favorite, gl)}`;
	if (protect.megaEvolvable) newStr += `&!${gameTranslator(GameTranslatorKeys.MegaEvolve, gl)}`;
	// No `&!shadow` here, unlike Bad-IV mode below: every Shadow form already got
	// its own disambiguating exclusion clause above when `protect.shadow` is on
	// (see the loop's short-circuit) — this mode independently evaluates Shadow
	// and non-Shadow forms throughout, so that per-form clause is already
	// complete, and a blanket keyword on top of it would be pure dead weight.

	return newStr;
};

/**
 * "Mass Delete Pokémon With Wasted IV Potential" — meta-agnostic: never looks
 * at PvP/raid rankings at all, just each species' own intrinsic best-possible
 * IV spread
 * per CP cap (see `findBadIvCarveOuts` in the compute worker, which does the
 * actual brute-force analysis this only turns into a string). Default keep
 * rule is the classic low-Attack/max-bulk CP-cap spread (0-5 Attack, 11-15
 * Defense, 11-15 HP); `carveOuts` are the species where that default doesn't
 * match their own real optimum, each protected via its own exact bucket
 * pattern instead. An exact hundo is always kept regardless (`!4*`), so
 * nothing here ever needs to special-case one. Manually-whitelisted species
 * get an unconditional exclusion clause instead of (not in addition to) their
 * carve-out pattern — their own IV spread stops mattering entirely.
 */
export const computeBadIvString = (
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	carveOuts: Array<BadIvCarveOut>,
	gl: GameLanguage,
	cp: number,
	protect: ProtectionFlags,
	whitelist: Set<string>
): string => {
	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);
	const CP = gameTranslator(GameTranslatorKeys.CP, gl);

	// Shadow forms mirror their non-shadow counterpart's stats exactly — CP
	// depends only on base stats, and shadow doesn't change those — so this
	// whole mode never needs to distinguish shadow from non-shadow at all.
	const allPokemonForms = Object.values(gamemasterPokemon)
		.filter((e) => !e.isMega && !e.aliasId && !e.isShadow)
		.map((e) => ({
			dexNumber: e.dex,
			types: e.types.map((f) => f.toString().toLocaleLowerCase()),
			isShadow: false,
			p: e,
		}));
	const uniqueTypes = buildUniqueTypes(allPokemonForms);
	const baseIds: Record<string, string> = {};
	allPokemonForms.forEach((form) => {
		const formSiblings = allPokemonForms.filter((f) => f.dexNumber === form.dexNumber);
		const id = generatePokemonId(form.dexNumber, form.types, uniqueTypes, formSiblings, form);
		baseIds[`${form.dexNumber},${form.types.join(',')}`] = id;
	});

	// The shared Great/Ultra default clause is the primary selection criterion
	// (no leading `&`, matching Tab 1's own convention of always starting with
	// a bare positive term). Master's broader "11+ everywhere" rule is
	// deliberately not included — only an exact hundo gets a free pass, and
	// that's `!4*` at the tail, unconditionally.
	let result = `2-4${A},0-2${D},0-2${S}`;

	const seenClauses = new Set<string>();
	carveOuts.forEach(({ speciesId, pattern }) => {
		if (whitelist.has(speciesId)) return; // gets its own unconditional clause below instead
		const p = gamemasterPokemon[speciesId];
		if (!p) return;
		// Already excluded outright by a tail keyword below (see the same check
		// there) — the carve-out worker computes these unconditionally so a
		// verified protective pattern exists the moment one of those toggles is
		// turned off, but while it's still on the keyword alone already blocks
		// every catch of this species, making its own clause pure dead weight.
		if (
			(protect.legendary && p.isLegendary) ||
			(protect.mythical && p.isMythical) ||
			(protect.ultraBeast && p.isBeast)
		) {
			return;
		}
		const baseId = baseIds[`${p.dex},${p.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];
		if (!baseId) return;
		const negA = groupAttr(complementOfBucket(ivBucket(pattern.A)), A);
		const negD = groupAttr(complementOfBucket(ivBucket(pattern.D)), D);
		const negS = groupAttr(complementOfBucket(ivBucket(pattern.S)), S);
		const clause = `&${negateIdentity(baseId)}${negA}${negD}${negS}`;
		if (!seenClauses.has(clause)) {
			result += clause;
			seenClauses.add(clause);
		}
	});

	whitelist.forEach((speciesId) => {
		const p = gamemasterPokemon[speciesId];
		if (!p || p.isMega || p.aliasId) return;
		const baseId = baseIds[`${p.dex},${p.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];
		if (!baseId) return;
		const clause = `&${negateIdentity(baseId)}`;
		if (!seenClauses.has(clause)) {
			result += clause;
			seenClauses.add(clause);
		}
	});

	if (gl === GameLanguage.ptbr) {
		result = translatePtBrTypeNames(result);
	}

	result += `&!4*&!${CP}${cp}-`;
	if (protect.tagged) result += '&!#';
	if (protect.favorite) result += `&!${gameTranslator(GameTranslatorKeys.Favorite, gl)}`;
	if (protect.megaEvolvable) result += `&!${gameTranslator(GameTranslatorKeys.MegaEvolve, gl)}`;
	if (protect.legendary) result += `&!${gameTranslator(GameTranslatorKeys.Legendary, gl)}`;
	if (protect.mythical) result += `&!${gameTranslator(GameTranslatorKeys.Mythical, gl)}`;
	if (protect.ultraBeast) result += `&!${gameTranslator(GameTranslatorKeys.UltraBeast, gl)}`;
	if (protect.shadow) result += `&!${gameTranslator(GameTranslatorKeys.ShadowSearch, gl)}`;

	return result;
};

/**
 * "Find Pokémon Worth Trading" — a third, independent domain, deliberately
 * disjoint from the two above: species that are meta-relevant for Master
 * League or raids *specifically*, combined with catches that don't already
 * have great IVs. Master League has no CP cap, and raids don't care about a
 * PVP cap either — so unlike Great/Ultra, a higher IV is never a liability
 * there, only ever neutral-to-better. A Best Friend trade floors every stat
 * at 5, a pure upgrade for exactly this population (never a downside, unlike
 * Great/Ultra where a low Attack IV can be load-bearing) — so a
 * Master/raid-relevant species with mediocre-or-worse current IVs is
 * precisely what's worth trading: the meta-relevance won't change, and the
 * IVs can only improve. A hundo is always excluded outright (`!4*`) — it has
 * nothing to gain from a trade. `onlyLowIv` optionally narrows further, to
 * only the clearly-low spreads (Attack/Defense/HP all bucket 0-2).
 */
export const computeTradeableString = (
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	rankLists: Array<Record<string, { rank: number } | undefined>>,
	raidDPS: Record<string, Record<string, DPSEntry>>,
	raidMetric: RaidMetric,
	gl: GameLanguage,
	trashMaster: number,
	trashRaid: number,
	protect: ProtectionFlags,
	whitelist: Set<string>,
	onlyLowIv: boolean
): string => {
	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);

	const enumValues: Array<PokemonTypes> = Object.keys(PokemonTypes)
		.filter((key) => isNaN(Number(key)) && key !== 'Normal')
		.map((key) => key as unknown as PokemonTypes);

	const isBadRank = (rank: number, rankLimit: number) => rank === Infinity || rank > rankLimit;

	const isGoodForRaids = (p: IGamemasterPokemon) => {
		let minRaidRank = Infinity;
		const finalCollection = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon, undefined, true));
		enumValues.forEach((t) => {
			const list = raidDPS[t.toString().toLocaleLowerCase()];
			finalCollection.forEach((pk) => {
				const entry = list?.[pk.speciesId];
				const rank = entry && raidRankOf(entry, raidMetric);
				if (rank != null) {
					minRaidRank = Math.min(minRaidRank, rank);
				}
			});
		});
		return minRaidRank <= trashRaid;
	};

	const isGoodForMaster = (p: IGamemasterPokemon) => {
		const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
		const mlLowestRank = Math.min(
			...reachablePokemon.map((r) => rankLists[2][r.speciesId]?.rank).filter((r): r is number => !!r)
		);
		return !isBadRank(mlLowestRank, trashMaster);
	};

	const tradeableDexes = new Set<number>();
	const excludedForms: Record<string, Set<IGamemasterPokemon>> = {};

	Object.values(gamemasterPokemon)
		.filter(
			(p) =>
				!p.aliasId &&
				!p.isMega &&
				(protect.legendary ? !p.isLegendary : true) &&
				(protect.mythical ? !p.isMythical : true) &&
				(protect.ultraBeast ? !p.isBeast : true)
		)
		.forEach((p) => {
			// Manually excluded from suggestion, or Shadow-excluded — same
			// shared-dex nuance as the other two tabs: a whitelisted or
			// Shadow-protected form must not be suggested even when a
			// non-excluded sibling at the same dex otherwise qualifies, so it
			// still needs its own disambiguating exclusion clause below.
			if (whitelist.has(p.speciesId) || (protect.shadow && p.isShadow)) {
				if (!excludedForms[p.dex]) excludedForms[p.dex] = new Set<IGamemasterPokemon>();
				excludedForms[p.dex].add(p);
				return;
			}
			if (isGoodForRaids(p) || isGoodForMaster(p)) {
				tradeableDexes.add(p.dex);
			}
		});

	const allPokemonForms = Object.values(gamemasterPokemon)
		.filter((e) => !e.isMega && !e.aliasId)
		.map((e) => ({
			dexNumber: e.dex,
			types: e.types.map((f) => f.toString().toLocaleLowerCase()),
			isShadow: e.isShadow,
			p: e,
		}));
	const uniqueTypes = buildUniqueTypes(allPokemonForms.filter((c) => !c.isShadow));
	const baseIds: Record<string, string> = {};
	allPokemonForms.forEach((form) => {
		const formSiblings = allPokemonForms.filter((f) => f.dexNumber === form.dexNumber && !f.isShadow);
		const id = generatePokemonId(form.dexNumber, form.types, uniqueTypes, formSiblings, form);
		baseIds[`${form.dexNumber},${form.types.join(',')}`] = id;
	});

	let result = Array.from(tradeableDexes).join(',');
	const terms = new Set<string>();
	tradeableDexes.forEach((d) => {
		if (!excludedForms[d]) return;
		excludedForms[d].forEach((e) => {
			let newStr =
				'&' + negateIdentity(baseIds[`${e.dex},${e.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`]);
			if (e.isShadow) {
				newStr += ',!shadow';
			} else if (isNormalPokemonAndHasShadowVersion(e, gamemasterPokemon)) {
				newStr += ',shadow';
			}
			if (!terms.has(newStr)) {
				result += newStr;
				terms.add(newStr);
			}
		});
	});

	if (gl === GameLanguage.ptbr) {
		result = translatePtBrTypeNames(result);
	}

	// A hundo needs no trade at all, regardless of the stricter toggle below.
	result += '&!4*';
	if (onlyLowIv) {
		result += `&0-2${A}&0-2${D}&0-2${S}`;
	}
	if (protect.tagged) result += '&!#';
	if (protect.favorite) result += `&!${gameTranslator(GameTranslatorKeys.Favorite, gl)}`;
	if (protect.megaEvolvable) result += `&!${gameTranslator(GameTranslatorKeys.MegaEvolve, gl)}`;

	return result;
};

/* -------------------------------------------------------------------------- */

const NumSelect = ({
	label,
	value,
	onChange,
	count,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	count: number;
}) => (
	<select className='r-md-select' aria-label={label} value={value} onChange={(e) => onChange(+e.target.value)}>
		{Array.from({ length: count }, (_x, i) => i).map((n) => (
			<option key={n} value={n}>
				{n}
			</option>
		))}
	</select>
);

/** Pokémon-only typeahead for adding a species to the whitelist — same shape
 *  as the app-bar's `SearchBox`, trimmed to a single result kind. */
const WhitelistSearch = ({
	gamemasterPokemon,
	exclude,
	onPick,
	placeholder,
}: {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	exclude: Set<string>;
	onPick: (speciesId: string) => void;
	placeholder: string;
}) => {
	const { imageSource } = useImageSource();
	const [q, setQ] = useState('');
	const [open, setOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
	const term = norm(q);

	const results = useMemo(() => {
		if (!term) return [];
		const all = Object.values(gamemasterPokemon).filter((p) => !p.aliasId && !p.isMega && !exclude.has(p.speciesId));
		const rank = (p: IGamemasterPokemon) => {
			const hay = [norm(p.speciesName), norm(p.speciesId)];
			if (hay.some((h) => h.startsWith(term))) return 0;
			if (hay.some((h) => h.includes(term))) return 1;
			return -1;
		};
		return all
			.map((p) => ({ p, s: rank(p) }))
			.filter((x) => x.s >= 0 || String(x.p.dex) === q.trim())
			.sort((a, b) => a.s - b.s || a.p.dex - b.p.dex)
			.slice(0, 20)
			.map((x) => x.p);
	}, [term, gamemasterPokemon, exclude, q]);

	const pick = (p: IGamemasterPokemon) => {
		onPick(p.speciesId);
		setQ('');
		setOpen(false);
	};

	return (
		<div className='r-search r-md-wl-search' ref={rootRef}>
			<svg className='r-search-icon' viewBox='0 0 24 24' aria-hidden='true'>
				<circle cx='11' cy='11' r='7' />
				<line x1='21' y1='21' x2='16.2' y2='16.2' />
			</svg>
			<input
				value={q}
				onChange={(e) => {
					setQ(e.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				placeholder={placeholder}
				aria-label={placeholder}
				autoComplete='off'
			/>
			{q && (
				<button
					type='button'
					className='r-search-clear'
					aria-label='Clear'
					onClick={() => {
						setQ('');
						setOpen(false);
					}}
				>
					×
				</button>
			)}
			{open && results.length > 0 && (
				<ul className='r-search-menu' role='listbox'>
					{results.map((p) => (
						<li key={p.speciesId}>
							<button type='button' role='option' aria-selected={false} onClick={() => pick(p)}>
								<span className='r-search-sprite'>
									{p.isShadow && <ShadowMark />}
									<img src={spriteUrl(p, imageSource)} alt='' loading='lazy' decoding='async' />
								</span>
								<span className='r-search-name'>
									{cleanName(p.speciesName)}
									{p.isShadow && <em className='r-search-shadow'> · Shadow</em>}
								</span>
								<span className='r-search-dex'>{dexNo(p.dex)}</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

const WhitelistChip = ({
	p,
	locked,
	reason,
	imageSource,
	onRemove,
}: {
	p: IGamemasterPokemon;
	locked: boolean;
	reason: string;
	imageSource: ReturnType<typeof useImageSource>['imageSource'];
	onRemove: (speciesId: string) => void;
}) => (
	<button
		type='button'
		className='r-md-wl-chip'
		data-locked={locked ? '' : undefined}
		disabled={locked}
		title={locked ? `Protected because it’s ${reason} — toggle that off above to remove it` : 'Remove'}
		onClick={() => onRemove(p.speciesId)}
	>
		<span className='r-md-wl-sprite'>
			{p.isShadow && <ShadowMark />}
			<img src={spriteUrl(p, imageSource)} alt='' loading='lazy' decoding='async' />
		</span>
		<span className='r-md-wl-name'>{cleanName(p.speciesName)}</span>
		{!locked && (
			<span className='r-md-wl-x' aria-hidden='true'>
				×
			</span>
		)}
	</button>
);

// dex, then form (a shadow's speciesId is its base form's plus `_shadow`, so
// stripping that groups a form with its own shadow right after it), then
// non-shadow before shadow — e.g. pikachu, raichu, raichu (shadow), raichu
// (alolan), raichu (alolan, shadow).
const formKeyOf = (speciesId: string) => speciesId.replace(/_shadow$/, '');
const byDexFormShadow = (a: { p: IGamemasterPokemon }, b: { p: IGamemasterPokemon }) =>
	a.p.dex - b.p.dex ||
	formKeyOf(a.p.speciesId).localeCompare(formKeyOf(b.p.speciesId)) ||
	Number(a.p.isShadow) - Number(b.p.isShadow);

const MassDelete = () => {
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { movesFetchCompleted } = useMoves();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { raidMetric } = useRaidMetric();
	const { currentGameLanguage: gl } = useLanguage();
	const { imageSource } = useImageSource();

	const [mode, setMode] = useState<'meta' | 'badIv' | 'trade'>(() => {
		const v = readPersistentValue(ConfigKeys.MassDeleteMode);
		return v === 'badIv' || v === 'trade' ? v : 'meta';
	});
	useEffect(() => void writePersistentValue(ConfigKeys.MassDeleteMode, mode), [mode]);

	const [trashGreat, setTrashGreat] = useState(() => numCfg(ConfigKeys.TrashGreat, 50));
	const [trashUltra, setTrashUltra] = useState(() => numCfg(ConfigKeys.TrashUltra, 50));
	const [trashMaster, setTrashMaster] = useState(() => numCfg(ConfigKeys.TrashMaster, 110));
	const [trashRaid, setTrashRaid] = useState(() => numCfg(ConfigKeys.TrashRaid, 5));
	const [cp, setCp] = useState(() => numCfg(ConfigKeys.TrashCP, 2500));
	// Only meaningful for the Tradeable tab — narrows the result to catches
	// whose Attack/Defense/HP are all clearly low (bucket 0-2), rather than
	// just excluding the exact hundo.
	const [tradeOnlyLowIv, setTradeOnlyLowIv] = useState(() => readPersistentValue(ConfigKeys.TradeOnlyLowIv) === 'true');
	useEffect(() => void writePersistentValue(ConfigKeys.TradeOnlyLowIv, String(tradeOnlyLowIv)), [tradeOnlyLowIv]);

	const [protect, setProtect] = useState<ProtectionFlags>(() => ({
		favorite: boolCfg(ConfigKeys.TrashKeepFavorite, DEFAULT_PROTECTION.favorite),
		tagged: boolCfg(ConfigKeys.TrashKeepTagged, DEFAULT_PROTECTION.tagged),
		legendary: boolCfg(ConfigKeys.TrashKeepLegendary, DEFAULT_PROTECTION.legendary),
		mythical: boolCfg(ConfigKeys.TrashKeepMythical, DEFAULT_PROTECTION.mythical),
		ultraBeast: boolCfg(ConfigKeys.TrashKeepUltraBeast, DEFAULT_PROTECTION.ultraBeast),
		megaEvolvable: boolCfg(ConfigKeys.TrashKeepMegaEvolvable, DEFAULT_PROTECTION.megaEvolvable),
		shadow: boolCfg(ConfigKeys.TrashKeepShadow, DEFAULT_PROTECTION.shadow),
	}));
	const setProtectFlag = (key: keyof ProtectionFlags) => setProtect((p) => ({ ...p, [key]: !p[key] }));
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashKeepFavorite, String(protect.favorite)),
		[protect.favorite]
	);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashKeepTagged, String(protect.tagged)), [protect.tagged]);
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashKeepLegendary, String(protect.legendary)),
		[protect.legendary]
	);
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashKeepMythical, String(protect.mythical)),
		[protect.mythical]
	);
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashKeepUltraBeast, String(protect.ultraBeast)),
		[protect.ultraBeast]
	);
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashKeepMegaEvolvable, String(protect.megaEvolvable)),
		[protect.megaEvolvable]
	);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashKeepShadow, String(protect.shadow)), [protect.shadow]);

	// Manually-protected species, by speciesId — never evaluated by either
	// mode's algorithm, always excluded outright from the generated string.
	const [whitelist, setWhitelist] = useState<Array<string>>(() => readWhitelist());
	useEffect(() => void writePersistentValue(ConfigKeys.TrashWhitelist, JSON.stringify(whitelist)), [whitelist]);
	const whitelistSet = useMemo(() => new Set(whitelist), [whitelist]);
	const addToWhitelist = (speciesId: string) => setWhitelist((w) => (w.includes(speciesId) ? w : [...w, speciesId]));
	const removeFromWhitelist = (speciesId: string) => setWhitelist((w) => w.filter((s) => s !== speciesId));

	// Species already covered by one of the category toggles above — shown
	// alongside the manual whitelist so it's clear at a glance why they'll
	// never be deleted either way, but locked (their protection comes from
	// the toggle, not this list, so removing them here would do nothing).
	// Mega-capable deliberately isn't one of these categories: unlike
	// Legendary/Mythical/Ultra Beast, it isn't a static species property this
	// app can infer — it also needs enough Mega Energy banked right now, which
	// only the game itself knows, so that toggle stays a pure search-string
	// keyword with no corresponding species list here.
	const autoProtected = useMemo(() => {
		const map = new Map<string, string>();
		Object.values(gamemasterPokemon)
			.filter((p) => !p.aliasId && !p.isMega)
			.forEach((p) => {
				if (protect.legendary && p.isLegendary) map.set(p.speciesId, 'Legendary');
				else if (protect.mythical && p.isMythical) map.set(p.speciesId, 'Mythical');
				else if (protect.ultraBeast && p.isBeast) map.set(p.speciesId, 'Ultra Beast');
				else if (protect.shadow && p.isShadow) map.set(p.speciesId, 'Shadow');
			});
		return map;
	}, [gamemasterPokemon, protect.legendary, protect.mythical, protect.ultraBeast, protect.shadow]);

	// Two separate, separately-sorted groups (see `byDexFormShadow`) rather than
	// one merged list —
	// individually-chosen Pokémon first, since that's the list you're actually
	// curating here, then a divider, then whatever the category toggles above
	// already cover for free (shown for visibility, not because this list is
	// where they're managed).
	const whitelistChipsManual = useMemo(
		() =>
			whitelist
				.filter((id) => gamemasterPokemon[id])
				.map((id) => ({ p: gamemasterPokemon[id], locked: false, reason: '' }))
				.sort(byDexFormShadow),
		[whitelist, gamemasterPokemon]
	);
	const whitelistChipsAuto = useMemo(
		() =>
			Array.from(autoProtected.entries())
				.filter(([id]) => !whitelistSet.has(id))
				.map(([id, reason]) => ({ p: gamemasterPokemon[id], locked: true, reason }))
				.sort(byDexFormShadow),
		[autoProtected, whitelistSet, gamemasterPokemon]
	);

	// Nothing worth offering the search for: already manually whitelisted, or
	// already unconditionally protected by a category toggle above (adding it
	// here too would just be a no-op that clutters the chip row).
	const whitelistSearchExclude = useMemo(
		() => new Set([...whitelistSet, ...autoProtected.keys()]),
		[whitelistSet, autoProtected]
	);

	const [isCalculating, setIsCalculating] = useState(false);
	const [result, setResult] = useState('');
	const [copied, setCopied] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	// Collapsed by default every session (they take up a lot of vertical
	// space) — remembered only for the rest of *this* tab's session via
	// `sessionStorage`, not forever via `localStorage`, so reopening the app
	// later always starts tidy again.
	const [panelOpen, setPanelOpen] = useState(() => readSessionValue(ConfigKeys.MassDeleteControlsCollapsed) === 'open');
	const [wlOpen, setWlOpen] = useState(() => readSessionValue(ConfigKeys.MassDeleteWhitelistCollapsed) === 'open');
	useEffect(
		() => void writeSessionValue(ConfigKeys.MassDeleteControlsCollapsed, panelOpen ? 'open' : 'closed'),
		[panelOpen]
	);
	useEffect(
		() => void writeSessionValue(ConfigKeys.MassDeleteWhitelistCollapsed, wlOpen ? 'open' : 'closed'),
		[wlOpen]
	);

	const outRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => void writePersistentValue(ConfigKeys.TrashGreat, String(trashGreat)), [trashGreat]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashUltra, String(trashUltra)), [trashUltra]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashMaster, String(trashMaster)), [trashMaster]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashRaid, String(trashRaid)), [trashRaid]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashCP, String(cp)), [cp]);

	// changing any knob invalidates a stale result
	useEffect(() => {
		setResult('');
	}, [trashGreat, trashUltra, trashMaster, trashRaid, cp, gl, raidMetric, protect, whitelist]);

	useEffect(() => {
		if (!isCalculating || !fetchCompleted || !pvpFetchCompleted || !raidDPSFetchCompleted || !movesFetchCompleted) {
			return;
		}
		const id = window.setTimeout(() => {
			setResult(
				computeTrashString({
					gamemasterPokemon,
					rankLists: rankLists as unknown as ComputeArgs['rankLists'],
					raidDPS,
					raidMetric,
					gl,
					cp,
					trashGreat,
					trashUltra,
					trashMaster,
					trashRaid,
					protect,
					whitelist: whitelistSet,
				})
			);
			setIsCalculating(false);
		}, 60);
		return () => window.clearTimeout(id);
	}, [
		isCalculating,
		fetchCompleted,
		pvpFetchCompleted,
		raidDPSFetchCompleted,
		movesFetchCompleted,
		gamemasterPokemon,
		rankLists,
		raidDPS,
		raidMetric,
		gl,
		cp,
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
		protect,
		whitelistSet,
	]);

	// ---- "Bad IV" mode ----
	const [isCalculatingBadIv, setIsCalculatingBadIv] = useState(false);
	const [badIvResult, setBadIvResult] = useState('');

	// The heavy part — the brute-force sweep for every species' own best spread
	// per cap — never depends on `cp`/`gl`/the toggles/the whitelist, so it's
	// cached indefinitely and only ever runs once per session; only the
	// (cheap) string assembly below reacts to those.
	const { data: badIvCarveOuts } = useQuery({
		enabled: isCalculatingBadIv && fetchCompleted,
		queryKey: ['bad-iv-carveouts'],
		queryFn: () => getComputeWorker().findBadIvCarveOuts({ gamemasterPokemon, caps: [1500, 2500] }),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	useEffect(() => {
		if (!isCalculatingBadIv || !fetchCompleted || !badIvCarveOuts) return;
		const id = window.setTimeout(() => {
			setBadIvResult(computeBadIvString(gamemasterPokemon, badIvCarveOuts, gl, cp, protect, whitelistSet));
			setIsCalculatingBadIv(false);
		}, 60);
		return () => window.clearTimeout(id);
	}, [isCalculatingBadIv, fetchCompleted, badIvCarveOuts, gamemasterPokemon, gl, cp, protect, whitelistSet]);

	// changing the CP floor, language, protections or whitelist invalidates a
	// stale result (the carve-out sweep itself is unaffected, so no need to
	// recompute that part)
	useEffect(() => {
		setBadIvResult('');
	}, [cp, gl, protect, whitelist]);

	// ---- "Tradeable" mode ----
	const [isCalculatingTrade, setIsCalculatingTrade] = useState(false);
	const [tradeResult, setTradeResult] = useState('');

	useEffect(() => {
		setTradeResult('');
	}, [trashMaster, trashRaid, gl, raidMetric, protect, whitelist, tradeOnlyLowIv]);

	useEffect(() => {
		if (!isCalculatingTrade || !fetchCompleted || !pvpFetchCompleted || !raidDPSFetchCompleted || !movesFetchCompleted) {
			return;
		}
		const id = window.setTimeout(() => {
			setTradeResult(
				computeTradeableString(
					gamemasterPokemon,
					rankLists as unknown as ComputeArgs['rankLists'],
					raidDPS,
					raidMetric,
					gl,
					trashMaster,
					trashRaid,
					protect,
					whitelistSet,
					tradeOnlyLowIv
				)
			);
			setIsCalculatingTrade(false);
		}, 60);
		return () => window.clearTimeout(id);
	}, [
		isCalculatingTrade,
		fetchCompleted,
		pvpFetchCompleted,
		raidDPSFetchCompleted,
		movesFetchCompleted,
		gamemasterPokemon,
		rankLists,
		raidDPS,
		raidMetric,
		gl,
		trashMaster,
		trashRaid,
		protect,
		whitelistSet,
		tradeOnlyLowIv,
	]);

	const isBadIv = mode === 'badIv';
	const isTrade = mode === 'trade';
	const activeResult = isBadIv ? badIvResult : isTrade ? tradeResult : result;
	const activeCalculating = isBadIv ? isCalculatingBadIv : isTrade ? isCalculatingTrade : isCalculating;

	const copy = () => {
		if (!activeResult) return;
		void navigator.clipboard?.writeText(activeResult);
		outRef.current?.select();
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1400);
	};

	const ready = fetchCompleted && pvpFetchCompleted;

	const protectionSummary = PROTECTION_META.filter((m) => protect[m.key])
		.map((m) => m.label)
		.join(', ');
	const keepTopSummary = [
		`Top ${trashGreat} Great League`,
		`Top ${trashUltra} Ultra League`,
		`Top ${trashMaster} Master League`,
		`Top ${trashRaid} Raid`,
	].join(' · ');
	const tradeTopSummary = [`Top ${trashMaster} Master League`, `Top ${trashRaid} Raid`].join(' · ');
	const panelSummary = isBadIv
		? `CP ≥ ${cp.toLocaleString()} kept · protects ${protectionSummary || 'nothing extra'}`
		: isTrade
			? `${tradeTopSummary}${tradeOnlyLowIv ? ' · only clearly-low IVs' : ''} · excludes ${protectionSummary || 'nothing extra'}`
			: `${keepTopSummary} · CP ≥ ${cp.toLocaleString()} kept · protects ${protectionSummary || 'nothing extra'}`;

	const whitelistSummary =
		whitelistChipsManual.length === 0 && whitelistChipsAuto.length === 0
			? 'No individually-protected Pokémon yet'
			: [
					whitelistChipsManual.length > 0 && `${whitelistChipsManual.length} kept individually`,
					whitelistChipsAuto.length > 0 && `${whitelistChipsAuto.length} protected by category`,
				]
					.filter(Boolean)
					.join(' · ');

	const isDefaultProtection = (Object.keys(protect) as Array<keyof ProtectionFlags>).every(
		(k) => protect[k] === DEFAULT_PROTECTION[k]
	);
	const panelDirty =
		!isDefaultProtection ||
		(!isTrade && cp !== 2500) ||
		(mode !== 'badIv' && (trashMaster !== 110 || trashRaid !== 5)) ||
		(mode === 'meta' && (trashGreat !== 50 || trashUltra !== 50)) ||
		(isTrade && tradeOnlyLowIv);
	const resetPanel = () => {
		setProtect(DEFAULT_PROTECTION);
		if (!isTrade) setCp(2500);
		if (mode !== 'badIv') {
			setTrashMaster(110);
			setTrashRaid(5);
		}
		if (mode === 'meta') {
			setTrashGreat(50);
			setTrashUltra(50);
		}
		if (isTrade) setTradeOnlyLowIv(false);
	};

	const pageTitle = isBadIv
		? 'Mass Delete Non-Perfect IV Pokémon'
		: isTrade
			? 'Find Pokémon Worth Trading'
			: 'Mass Delete current non-meta relevant Pokémon';
	const activeHelpText = isBadIv ? BAD_IV_HELP_TEXT : isTrade ? TRADE_HELP_TEXT : HELP_TEXT;

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>{pageTitle}</h1>

			<div className='r-seg r-seg--wrap r-md-mode-seg' role='tablist' aria-label='Mass delete mode'>
				<button type='button' data-active={mode === 'meta'} onClick={() => setMode('meta')}>
					Non-meta relevant
				</button>
				<button type='button' data-active={isBadIv} onClick={() => setMode('badIv')}>
					Non-Perfect IVs
				</button>
				<button type='button' data-active={isTrade} onClick={() => setMode('trade')}>
					Tradeable
				</button>
			</div>

			{isBadIv && (
				<div className='r-card r-md-warning'>
					<p style={{ margin: 0 }}>⚠️ {BAD_IV_WARNING}</p>
				</div>
			)}

			<div className='r-card r-md-help'>
				<p className={helpOpen ? '' : 'r-md-help-clamp'}>{activeHelpText}</p>
				<button type='button' className='r-md-more' onClick={() => setHelpOpen((v) => !v)}>
					{helpOpen ? 'Read less' : 'Read more'}
				</button>
			</div>

			<div className='r-section-h'>Configuration</div>
			<div className='r-ctr-config r-md-config' data-open={panelOpen}>
				<div className='r-ctr-config-bar'>
					<button
						type='button'
						className='r-ctr-config-toggle'
						aria-expanded={panelOpen}
						onClick={() => setPanelOpen((o) => !o)}
					>
						<span className='r-ctr-config-ic' aria-hidden='true'>
							⚙
						</span>
						<span className='r-ctr-config-sum'>{panelSummary}</span>
						<span className='r-ctr-config-chev' aria-hidden='true'>
							{panelOpen ? 'Hide' : 'Edit'}
						</span>
					</button>
					{panelDirty && (
						<button type='button' className='r-ctr-config-clear' onClick={resetPanel}>
							Reset
						</button>
					)}
				</div>

				{panelOpen && (
					<div className='r-ctr-panel'>
						{mode === 'meta' && (
							<>
								<p className='r-ctr-cond-hint r-md-knobs-subtitle'>Preserve top current meta Pokémon per league/raid</p>
								<div className='r-md-knobs-grid r-md-knobs-grid--4up'>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/great.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>Great League</i>
											<i className='r-md-knob-short'>Great</i>
										</span>
										<NumSelect label='Keep top Great League' value={trashGreat} onChange={setTrashGreat} count={2000} />
									</div>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/ultra.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>Ultra League</i>
											<i className='r-md-knob-short'>Ultra</i>
										</span>
										<NumSelect label='Keep top Ultra League' value={trashUltra} onChange={setTrashUltra} count={2000} />
									</div>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/master.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>Master League</i>
											<i className='r-md-knob-short'>Master</i>
										</span>
										<NumSelect
											label='Keep top Master League'
											value={trashMaster}
											onChange={setTrashMaster}
											count={2000}
										/>
									</div>
									<div className='r-md-knob'>
										<span>
											<img src='/images/tx_raid_coin.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>Raid Attackers</i>
											<i className='r-md-knob-short'>Raid</i>
										</span>
										<NumSelect label='Keep top raid attackers' value={trashRaid} onChange={setTrashRaid} count={2000} />
									</div>
								</div>
							</>
						)}

						{isTrade && (
							<>
								<p className='r-ctr-cond-hint r-md-knobs-subtitle'>
									A species only needs to clear ONE of these two cutoffs to be suggested
								</p>
								<div className='r-md-knobs-grid r-md-knobs-grid--4up'>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/master.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>Master League</i>
											<i className='r-md-knob-short'>Master</i>
										</span>
										<NumSelect
											label='Keep top Master League'
											value={trashMaster}
											onChange={setTrashMaster}
											count={2000}
										/>
									</div>
									<div className='r-md-knob'>
										<span>
											<img src='/images/tx_raid_coin.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>Raid Attackers</i>
											<i className='r-md-knob-short'>Raid</i>
										</span>
										<NumSelect label='Keep top raid attackers' value={trashRaid} onChange={setTrashRaid} count={2000} />
									</div>
								</div>
							</>
						)}

						<div className='r-md-knobs-grid'>
							{!isTrade && (
								<div className='r-md-knob'>
									<span>Never delete at or above CP</span>
									<select
										className='r-md-select'
										aria-label='Never delete at or above CP'
										value={cp}
										onChange={(e) => setCp(+e.target.value)}
									>
										{CP_OPTIONS.map((n) => (
											<option key={n} value={n}>
												{n}
											</option>
										))}
									</select>
								</div>
							)}
							{isTrade && (
								<div className='r-md-knob'>
									<span>Only very low IVs (0-2 in every stat)</span>
									<button
										type='button'
										className='r-ctr-toggle'
										data-on={tradeOnlyLowIv ? '' : undefined}
										aria-pressed={tradeOnlyLowIv}
										title='Narrows suggestions to catches whose Attack, Defense, and HP are all clearly low — otherwise, anything short of a hundo is suggested.'
										onClick={() => setTradeOnlyLowIv((v) => !v)}
									>
										<span className='r-ss-box' aria-hidden='true' />
										{tradeOnlyLowIv ? 'On' : 'Off'}
									</button>
								</div>
							)}
						</div>

						<div className='r-section-h' style={{ marginTop: 4 }}>
							{isTrade ? 'Never suggest this category' : 'Never delete this category'}
						</div>
						<div className='r-md-protect-grid'>
							{PROTECTION_META.map((m) => (
								<button
									key={m.key}
									type='button'
									className='r-ctr-toggle r-md-protect-chip'
									data-on={protect[m.key] ? '' : undefined}
									aria-pressed={protect[m.key]}
									title={m.description}
									onClick={() => setProtectFlag(m.key)}
								>
									<span className='r-ss-box' aria-hidden='true' />
									{m.label}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			<div className='r-section-h'>{isTrade ? 'Never suggest these Pokémon' : 'Never delete these Pokémon'}</div>
			<div className='r-ctr-config' data-open={wlOpen}>
				<div className='r-ctr-config-bar'>
					<button
						type='button'
						className='r-ctr-config-toggle'
						aria-expanded={wlOpen}
						onClick={() => setWlOpen((o) => !o)}
					>
						<span className='r-ctr-config-ic' aria-hidden='true'>
							<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' strokeWidth='2'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									d='M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z'
								/>
							</svg>
						</span>
						<span className='r-ctr-config-sum'>{whitelistSummary}</span>
						<span className='r-ctr-config-chev' aria-hidden='true'>
							{wlOpen ? 'Hide' : 'Edit'}
						</span>
					</button>
				</div>
				{wlOpen && (
					<div className='r-ctr-panel'>
						<WhitelistSearch
							gamemasterPokemon={gamemasterPokemon}
							exclude={whitelistSearchExclude}
							onPick={addToWhitelist}
							placeholder={isTrade ? 'Add a Pokémon to never suggest…' : 'Add a Pokémon to never delete…'}
						/>
						<div className='r-md-wl-chips'>
							{whitelistChipsManual.length === 0 && whitelistChipsAuto.length === 0 && (
								<p className='r-muted' style={{ margin: 0 }}>
									{isTrade
										? 'Nothing here yet — search above to keep a specific Pokémon out of trade suggestions regardless of the categories above.'
										: 'Nothing here yet — search above to protect a specific Pokémon regardless of the categories above.'}
								</p>
							)}
							{whitelistChipsManual.map(({ p, locked, reason }) => (
								<WhitelistChip
									key={p.speciesId}
									p={p}
									locked={locked}
									reason={reason}
									imageSource={imageSource}
									onRemove={removeFromWhitelist}
								/>
							))}
							{whitelistChipsManual.length > 0 && whitelistChipsAuto.length > 0 && (
								<div className='r-md-wl-divider' aria-hidden='true' />
							)}
							{whitelistChipsAuto.map(({ p, locked, reason }) => (
								<WhitelistChip
									key={p.speciesId}
									p={p}
									locked={locked}
									reason={reason}
									imageSource={imageSource}
									onRemove={removeFromWhitelist}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			<button
				type='button'
				className='r-md-compute'
				disabled={!ready || activeCalculating}
				onClick={() => {
					if (isBadIv) {
						setBadIvResult('');
						setIsCalculatingBadIv(true);
					} else if (isTrade) {
						setTradeResult('');
						setIsCalculatingTrade(true);
					} else {
						setResult('');
						setIsCalculating(true);
					}
				}}
			>
				{activeCalculating ? 'Computing…' : ready ? 'Compute' : 'Loading data…'}
			</button>

			<textarea
				ref={outRef}
				className='r-md-out'
				readOnly
				value={activeCalculating ? 'Computing… this sweeps every species, give it a moment.' : activeResult}
				placeholder={
					isTrade
						? 'Your search string appears here. Paste it into the Pokémon GO search bar to review your trade candidates.'
						: 'Your search string appears here. Paste it into the Pokémon GO search bar, review the matches, then delete.'
				}
				onClick={copy}
			/>
			{activeResult && (
				<button type='button' className='r-md-copy' onClick={copy}>
					{copied ? 'Copied ✓' : 'Copy search string'}
				</button>
			)}
		</div>
	);
};

export default MassDelete;

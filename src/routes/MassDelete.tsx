import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ShadowMark } from '../components/ShadowMark';
import { spriteUrl } from '../components/Sprite';
import { useBestBuddy } from '../contexts/best-buddy-context';
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
	complementOfBuckets,
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

/* The English help text is ported verbatim from the legacy app — the wording
   spells out exactly what will and won't be deleted, so users know the stakes. */
const HELP_TEXT =
	'Deletes any Pokémon that isn’t competitively relevant anywhere — not in Great, Ultra, or Master League, and not ' +
	'in raids — based on the rank cutoffs and CP cap below. A species (or any of its later evolutions) only needs to ' +
	'clear the cutoff in one of those to be spared. Anything at or above your CP cap is always kept, and so is ' +
	'everything checked in the categories and whitelist below, regardless of rank.';

const BAD_IV_WARNING =
	'This mode is aggressive and perfectionist: the intent is to delete every catch that isn’t a perfect (100%) IV ' +
	'Pokémon, with no regard for whether a species is currently good or bad in the meta — double-check the ' +
	'categories and whitelist below before running it.';

const BAD_IV_HELP_TEXT =
	'Ignores the current meta entirely: the goal is to delete anything that isn’t a perfect 15/15/15, since anything ' +
	'less is wasted IV potential. The game’s search only lets us match IV ranges, not exact values, so it can’t ' +
	'always draw that line exactly — for Great League (1500 CP) and Ultra League (2500 CP), most species are swept ' +
	'via a shared low-Attack/high-bulk range that approximates it, and a few hundred get their own individually-' +
	'verified range instead, since the shared one doesn’t actually fit their stats; either way, a few near-perfect ' +
	'(but not-quite-hundo) catches right at the boundary can slip through as false negatives. Master League has no ' +
	'CP cap, so there the true best really is always a plain 15/15/15 with nothing else close — this mode’s Master ' +
	'League handling is exact, not an approximation. A perfect 15/15/15 is always kept in every league, and so is ' +
	'everything checked in the categories and whitelist below, regardless of IVs.';

const PERFECT_HELP_TEXT =
	'The inverse of the mode above: instead of best-effort deleting everything that isn’t perfect, this finds the ' +
	'catches that already are. A plain 15/15/15 always counts, in every league. For Great League (1500 CP) and Ultra ' +
	'League (2500 CP), it also finds catches in the shared low-Attack/high-bulk range that’s the true optimum for ' +
	'most species — but the few hundred species with their own individually-verified optimum instead are ' +
	'deliberately left out here, rather than risk calling a merely-decent spread “perfect” (their own hundo, if they ' +
	'have one, still counts). The categories and whitelist below still apply, but here they mean the opposite of ' +
	'“protect from deletion” — they’re excluded from these results entirely.';

export interface ComputeArgs {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	rankLists: Array<Record<string, { rank: number } | undefined>>;
	raidDPS: Record<string, Record<string, DPSEntry>>;
	raidMetric: RaidMetric;
	lowAttackMap: Record<string, Record<number, boolean>> | undefined;
	gl: GameLanguage;
	cp: number;
	trashGreat: number;
	trashUltra: number;
	trashMaster: number;
	trashRaid: number;
	/** See `isBadForEverythingIfItHasHighAttack`'s doc comment. */
	keepForTrade: boolean;
	protect: ProtectionFlags;
	/** Manually-protected species — never evaluated, always excluded outright. */
	whitelist: Set<string>;
}

/* ---- verbatim port of the legacy DeleteTrash `computeStr`, since extended
   with togglable category protection and a manual per-species whitelist ---- */
export const computeTrashString = (a: ComputeArgs): string => {
	const {
		gamemasterPokemon,
		rankLists,
		raidDPS,
		raidMetric,
		lowAttackMap,
		gl,
		cp,
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
		keepForTrade,
		protect,
		whitelist,
	} = a;

	const enumValues: Array<PokemonTypes> = Object.keys(PokemonTypes)
		.filter((key) => isNaN(Number(key)) && key !== 'Normal')
		.map((key) => key as unknown as PokemonTypes);

	const isBadRank = (rank: number, rankLimit: number) => rank === Infinity || rank > rankLimit;

	const needsLessThanFiveAttack = (p: IGamemasterPokemon, leagueIndex: number) => {
		const cap = leagueIndex === 0 ? 1500 : 2500;
		return lowAttackMap?.[p.speciesId]?.[cap] ?? true;
	};

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

	// A Great/Ultra-relevant reachable stage that doesn't need a sub-5 Attack IV
	// to earn that relevance can always be fixed later by a Best Friend trade
	// (which floors every stat at 5) — so with `keepForTrade` on (the default,
	// matching the pre-revamp behavior), a currently-bad-IV catch of it is kept
	// unconditionally rather than trashed, on the assumption it'll get traded up
	// eventually. With it off, that assumption is disregarded entirely: those
	// two checks are skipped, so such a species falls through to the same
	// "only the naturally low-Attack catches survive" bucket as a species that
	// actually needs low Attack — for someone who knows they won't trade it,
	// not `alwaysGood`.
	const isBadForEverythingIfItHasHighAttack = (p: IGamemasterPokemon) => {
		if (isGoodForRaids(p)) {
			return false;
		}
		const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
		if (reachablePokemon.some((k) => !isBadRank(rankLists[2][k.speciesId]?.rank ?? Infinity, trashMaster))) {
			return false;
		}
		if (
			keepForTrade &&
			reachablePokemon.some(
				(k) => !isBadRank(rankLists[0][k.speciesId]?.rank ?? Infinity, trashGreat) && !needsLessThanFiveAttack(k, 0)
			)
		) {
			return false;
		}
		if (
			keepForTrade &&
			reachablePokemon.some(
				(k) => !isBadRank(rankLists[1][k.speciesId]?.rank ?? Infinity, trashUltra) && !needsLessThanFiveAttack(k, 1)
			)
		) {
			return false;
		}
		return true;
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
	const alwaysBadIfHighAtk: Record<string, Set<IGamemasterPokemon>> = {};
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
			} else if (isBadForEverythingIfItHasHighAttack(p)) {
				potentiallyDeletablePokemon.add(p.dex);
				if (!alwaysBadIfHighAtk[p.dex]) {
					alwaysBadIfHighAtk[p.dex] = new Set<IGamemasterPokemon>();
				}
				alwaysBadIfHighAtk[p.dex].add(p);
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
		if (alwaysBadIfHighAtk[d]) {
			alwaysBadIfHighAtk[d].forEach((e) => {
				let newStr = '';
				const baseId = baseIds[`${e.dex},${e.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];
				newStr += '&' + negateIdentity(baseId);
				if (e.isShadow) {
					newStr += `,!shadow`;
				} else if (isNormalPokemonAndHasShadowVersion(e, gamemasterPokemon)) {
					newStr += `,shadow`;
				}
				newStr += `,2-${gameTranslator(GameTranslatorKeys.AttackSearch, gl)}`;
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

// Buckets 0-1 (IV 0-10) for Attack, 3-4 (IV 11-15) for Defense/HP — the classic
// low-Attack/max-bulk CP-cap shape `matchesDefault` (in the compute worker)
// already treats as "this species' true optimum looks completely normal" for
// ~80% of species. This is its POSITIVE, species-agnostic form (unlike the
// hand-typed narrow literal `computeBadIvString` deletes by, which only
// targets a deliberately tiny "definitely wasted" corner).
const GOOD_ATTACK_BUCKETS = new Set([0, 1]);
const GOOD_BULK_BUCKETS = new Set([3, 4]);

/**
 * "Find Your Perfect (100%) IV Pokémon" — the inverse intent of the Bad-IV
 * mode above: instead of best-effort *deleting* everything that isn't a
 * perfect catch, best-effort *finds* the ones that already are. Genuinely
 * exact for Master League (`4*` — a hundo is unconditionally the true best
 * there, no exceptions) and for the ~80% of species whose own true Great/
 * Ultra League optimum matches the shared low-Attack/max-bulk shape (verified
 * — see `matchesDefault`). Deliberately can't chase the individually-verified
 * optimum of the remaining ~20% (`carveOuts`, the same data `computeBadIvString`
 * uses): Niantic's search grammar has no parentheses, so there's no way to
 * OR together many species' differently-shaped bucket requirements into one
 * string the way a plain per-species *exclusion* can be chained — the same
 * asymmetry that makes protecting an exception from a bad rule easy but
 * including one into a good rule hard. Rather than risk a false "this is
 * perfect" for those species, they're excluded from the shared-shape claim
 * entirely (their own hundo, if they have one, still matches via `4*`) —
 * safer to under-report than to mislead someone into treating a merely-decent
 * IV spread as their species' actual ceiling.
 *
 * Unlike Bad-IV mode, the category toggles (Legendary/Mythical/Ultra Beast/
 * Mega Evolvable/Shadow) don't apply here at all: they exist to protect a
 * category from *deletion*, which has no meaning for a *find* operation — we
 * want to go through every species when looking for perfect ones, not skip
 * whole categories. Only Favorite/Tagged carry over (relabeled "ignore" in
 * the UI), since excluding your already-reviewed catches from these results
 * is still a meaningful thing to want.
 */
export const computePerfectIvString = (
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	carveOuts: Array<BadIvCarveOut>,
	gl: GameLanguage,
	protect: Pick<ProtectionFlags, 'favorite' | 'tagged'>,
	whitelist: Set<string>
): string => {
	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);

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

	// The shared good shape is the primary anchor, in the same bucket domain
	// (0-4, not raw 0-15 IV) `matchesDefault` and every carve-out clause below
	// use — Attack bucket 0-1, Defense/HP bucket 3-4. `,4*` folds hundo in as
	// an alternative the same way the legacy per-Pokémon search-string
	// generator does (see `SearchStringsTab`'s `computeSearchString`, its
	// non-`trash` branch) — appending a bare positive keyword after an
	// attribute-range list ORs it in rather than ANDing it against those
	// ranges.
	let result = `0-1${A},3-4${D},3-4${S},4*`;

	const deviantSpecies = new Set(carveOuts.map((c) => c.speciesId));
	const seenClauses = new Set<string>();
	deviantSpecies.forEach((speciesId) => {
		if (whitelist.has(speciesId)) return; // already tail-excluded outright below
		const p = gamemasterPokemon[speciesId];
		if (!p) return;
		const baseId = baseIds[`${p.dex},${p.types.map((t) => t.toString().toLocaleLowerCase()).join(',')}`];
		if (!baseId) return;
		const negA = groupAttr(complementOfBuckets(GOOD_ATTACK_BUCKETS), A);
		const negD = groupAttr(complementOfBuckets(GOOD_BULK_BUCKETS), D);
		const negS = groupAttr(complementOfBuckets(GOOD_BULK_BUCKETS), S);
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

	if (protect.tagged) result += '&!#';
	if (protect.favorite) result += `&!${gameTranslator(GameTranslatorKeys.Favorite, gl)}`;

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
}: {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	exclude: Set<string>;
	onPick: (speciesId: string) => void;
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
				placeholder='Add a Pokémon to never delete…'
				aria-label='Add a Pokémon to the never-delete whitelist'
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
	const { maxLevel } = useBestBuddy();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { raidMetric } = useRaidMetric();
	const { currentGameLanguage: gl } = useLanguage();
	const { imageSource } = useImageSource();

	const [mode, setMode] = useState<'meta' | 'badIv'>(() =>
		readPersistentValue(ConfigKeys.MassDeleteMode) === 'badIv' ? 'badIv' : 'meta'
	);
	useEffect(() => void writePersistentValue(ConfigKeys.MassDeleteMode, mode), [mode]);

	// Inverts the Bad-IV tab's intent: find catches that already are perfect,
	// rather than best-effort deleting the ones that aren't.
	const [findPerfect, setFindPerfect] = useState(() => readPersistentValue(ConfigKeys.BadIvFindPerfect) === 'true');
	useEffect(() => void writePersistentValue(ConfigKeys.BadIvFindPerfect, String(findPerfect)), [findPerfect]);

	const [trashGreat, setTrashGreat] = useState(() => numCfg(ConfigKeys.TrashGreat, 50));
	const [trashUltra, setTrashUltra] = useState(() => numCfg(ConfigKeys.TrashUltra, 50));
	const [trashMaster, setTrashMaster] = useState(() => numCfg(ConfigKeys.TrashMaster, 110));
	const [trashRaid, setTrashRaid] = useState(() => numCfg(ConfigKeys.TrashRaid, 5));
	const [cp, setCp] = useState(() => numCfg(ConfigKeys.TrashCP, 2500));
	// Default true: a wild catch that only needs a future Best Friend trade
	// (floors every stat at 5) to become meta-relevant is kept, not trashed —
	// see `isBadForEverythingIfItHasHighAttack`'s doc comment.
	const [keepForTrade, setKeepForTrade] = useState(() => readPersistentValue(ConfigKeys.TrashKeepForTrade) !== 'false');

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
	useEffect(() => void writePersistentValue(ConfigKeys.TrashKeepForTrade, String(keepForTrade)), [keepForTrade]);

	// changing any knob invalidates a stale result
	useEffect(() => {
		setResult('');
	}, [trashGreat, trashUltra, trashMaster, trashRaid, cp, gl, raidMetric, keepForTrade, protect, whitelist]);

	const candidates = useMemo(
		() =>
			Object.values(gamemasterPokemon)
				.filter((p) => !p.aliasId)
				.map((p) => ({
					speciesId: p.speciesId,
					atk: p.baseStats.atk,
					def: p.baseStats.def,
					hp: p.baseStats.hp,
				})),
		[gamemasterPokemon]
	);

	const { data: lowAttackMap } = useQuery({
		enabled: isCalculating && fetchCompleted,
		queryKey: ['trash-low-attack', maxLevel],
		queryFn: () => getComputeWorker().lowAttackViable({ candidates, caps: [1500, 2500], maxLevel }),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	useEffect(() => {
		if (
			!isCalculating ||
			!fetchCompleted ||
			!pvpFetchCompleted ||
			!raidDPSFetchCompleted ||
			!movesFetchCompleted ||
			!lowAttackMap
		) {
			return;
		}
		const id = window.setTimeout(() => {
			setResult(
				computeTrashString({
					gamemasterPokemon,
					rankLists: rankLists as unknown as ComputeArgs['rankLists'],
					raidDPS,
					raidMetric,
					lowAttackMap,
					gl,
					cp,
					trashGreat,
					trashUltra,
					trashMaster,
					trashRaid,
					keepForTrade,
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
		lowAttackMap,
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
		keepForTrade,
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
			setBadIvResult(
				findPerfect
					? computePerfectIvString(gamemasterPokemon, badIvCarveOuts, gl, protect, whitelistSet)
					: computeBadIvString(gamemasterPokemon, badIvCarveOuts, gl, cp, protect, whitelistSet)
			);
			setIsCalculatingBadIv(false);
		}, 60);
		return () => window.clearTimeout(id);
	}, [isCalculatingBadIv, fetchCompleted, badIvCarveOuts, gamemasterPokemon, gl, cp, protect, whitelistSet, findPerfect]);

	// changing the CP floor, language, protections, whitelist or the invert
	// toggle invalidates a stale result (the carve-out sweep itself is
	// unaffected, so no need to recompute that part)
	useEffect(() => {
		setBadIvResult('');
	}, [cp, gl, protect, whitelist, findPerfect]);

	const isBadIv = mode === 'badIv';
	const activeResult = isBadIv ? badIvResult : result;
	const activeCalculating = isBadIv ? isCalculatingBadIv : isCalculating;

	const copy = () => {
		if (!activeResult) return;
		void navigator.clipboard?.writeText(activeResult);
		outRef.current?.select();
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1400);
	};

	const ready = fetchCompleted && pvpFetchCompleted;

	const isFindPerfect = isBadIv && findPerfect;
	// The category toggles protect from *deletion* — meaningless while finding,
	// where we want to go through every category, not skip whole ones. Only
	// Favorite/Tagged still mean something ("don't show me ones I've already
	// reviewed"), relabeled to match on the chips themselves; the summary
	// sentence below already supplies its own "ignores" verb, so it uses the
	// plain category names instead of the relabeled chip text.
	const relevantProtectionMeta = isFindPerfect
		? PROTECTION_META.filter((m) => m.key === 'favorite' || m.key === 'tagged')
		: PROTECTION_META;
	const visibleProtectionMeta = isFindPerfect
		? relevantProtectionMeta.map((m) => ({ ...m, label: m.key === 'favorite' ? 'Ignore Favourites' : 'Ignore Tagged' }))
		: PROTECTION_META;
	const protectionSummary = relevantProtectionMeta
		.filter((m) => protect[m.key])
		.map((m) => m.label)
		.join(', ');
	const keepTopSummary = [
		`Top ${trashGreat} Great League`,
		`Top ${trashUltra} Ultra League`,
		`Top ${trashMaster} Master League`,
		`Top ${trashRaid} Raid`,
	].join(' · ');
	const panelSummary = isFindPerfect
		? `Ignores ${protectionSummary || 'nothing'}`
		: isBadIv
			? `CP ≥ ${cp.toLocaleString()} kept · protects ${protectionSummary || 'nothing extra'}`
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
		cp !== 2500 ||
		(!isBadIv && (trashGreat !== 50 || trashUltra !== 50 || trashMaster !== 110 || trashRaid !== 5 || !keepForTrade));
	const resetPanel = () => {
		setCp(2500);
		setProtect(DEFAULT_PROTECTION);
		if (!isBadIv) {
			setTrashGreat(50);
			setTrashUltra(50);
			setTrashMaster(110);
			setTrashRaid(5);
			setKeepForTrade(true);
		}
	};

	const pageTitle = isFindPerfect
		? 'Find Your Perfect (100%) IV Pokémon'
		: isBadIv
			? 'Mass Delete Non-Perfect IV Pokémon'
			: 'Mass Delete current non-meta relevant Pokémon';

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>{pageTitle}</h1>

			<div className='r-seg r-seg--wrap r-md-mode-seg' role='tablist' aria-label='Mass delete mode'>
				<button type='button' data-active={!isBadIv} onClick={() => setMode('meta')}>
					Non-meta relevant
				</button>
				<button type='button' data-active={isBadIv} onClick={() => setMode('badIv')}>
					{isFindPerfect ? 'Find Perfect IVs' : 'Non-Perfect IVs'}
				</button>
			</div>

			{isBadIv && (
				<div className='r-md-invert-toggle-row'>
					<button
						type='button'
						className='r-ctr-toggle r-md-invert-toggle'
						data-on={findPerfect ? '' : undefined}
						aria-pressed={findPerfect}
						title='Flips this tab’s intent: instead of best-effort deleting non-perfect catches, best-effort finds the ones that already are perfect.'
						onClick={() => setFindPerfect((v) => !v)}
					>
						<span className='r-ss-box' aria-hidden='true' />
						Find perfect IVs instead
					</button>
				</div>
			)}

			{isBadIv && !findPerfect && (
				<div className='r-card r-md-warning'>
					<p style={{ margin: 0 }}>⚠️ {BAD_IV_WARNING}</p>
				</div>
			)}

			<div className='r-card r-md-help'>
				<p className={helpOpen ? '' : 'r-md-help-clamp'}>
					{isFindPerfect ? PERFECT_HELP_TEXT : isBadIv ? BAD_IV_HELP_TEXT : HELP_TEXT}
				</p>
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
						{!isBadIv && (
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

						<div className='r-md-knobs-grid'>
							{!isFindPerfect && (
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
							{!isBadIv && (
								<div className='r-md-knob'>
									<span>Keep relevant for trade</span>
									<button
										type='button'
										className='r-ctr-toggle'
										data-on={keepForTrade ? '' : undefined}
										aria-pressed={keepForTrade}
										title='Protects species that don’t need a low Attack IV to be relevant, on the assumption a future Best Friend trade would fix them anyway.'
										onClick={() => setKeepForTrade((v) => !v)}
									>
										<span className='r-ss-box' aria-hidden='true' />
										{keepForTrade ? 'On' : 'Off'}
									</button>
								</div>
							)}
						</div>

						<div className='r-section-h' style={{ marginTop: 4 }}>
							{isFindPerfect ? 'Ignore this category' : 'Never delete this category'}
						</div>
						<div className='r-md-protect-grid'>
							{visibleProtectionMeta.map((m) => (
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

			<div className='r-section-h'>{isFindPerfect ? 'Exclude these Pokémon from results' : 'Never delete these Pokémon'}</div>
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
						/>
						<div className='r-md-wl-chips'>
							{whitelistChipsManual.length === 0 && whitelistChipsAuto.length === 0 && (
								<p className='r-muted' style={{ margin: 0 }}>
									Nothing here yet — search above to protect a specific Pokémon regardless of the categories above.
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
					isFindPerfect
						? 'Your search string appears here. Paste it into the Pokémon GO search bar to see your perfect catches.'
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

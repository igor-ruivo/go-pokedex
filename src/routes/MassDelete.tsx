import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ShadowMark } from '../components/ShadowMark';
import { handleSpriteError, spriteUrl } from '../components/Sprite';
import { useBestBuddy } from '../contexts/best-buddy-context';
import { useImageSource } from '../contexts/imageSource-context';
import type { GameLanguage } from '../contexts/language-context';
import { useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { ISpeciesSearchMetadata } from '../DTOs/ISpeciesSearchMetadata';
import { PokemonTypes } from '../DTOs/PokemonTypes';
import { useDismiss } from '../hooks/useDismiss';
import { cleanName, dexNo } from '../lib/format';
import { type MassDeleteTab, R } from '../lib/nav';
import { type RaidMetric, raidRankOf } from '../lib/raid-metric';
import {
	canonicalizeDexExclusions,
	complementOfBucket,
	type DexExclusion,
	groupAttr,
	ivBucket,
	negateIdentity,
	renderDexExclusion,
	translateTypeNames,
} from '../lib/search-string';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { type DPSEntry, useRaidRanker } from '../queries/raid-ranker';
import { useSpeciesSearchMetadata } from '../queries/species-search-metadata';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import {
	ConfigKeys,
	readPersistentValue,
	readSessionValue,
	writePersistentValue,
	writeSessionValue,
} from '../utils/persistent-configs-handler';
import { fetchReachablePokemonIncludingSelf } from '../utils/pokemon-helper';
import type { BadIvCarveOut, BadIvPattern, TradeableSpeciesData } from '../workers/compute.worker';
import { getComputeWorker } from '../workers/compute-client';

/** dex-server's own `searchFormId`, converted back to the raw comma-joined
 *  form these generators' `negateIdentity`-based clauses need — an exact,
 *  lossless inverse of the `.replaceAll(',', '&')` dex-server applies when
 *  publishing it (types and dex numbers never contain `&`). Throws if the
 *  species is missing — there is no on-the-fly fallback; dex-server is the
 *  single source of truth for this identifier. */
const commaFormId = (speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>, speciesId: string): string => {
	const metadata = speciesSearchMetadata[speciesId];
	if (!metadata) {
		throw new Error(`speciesSearchMetadata is missing an entry for "${speciesId}" — metadata isn't loaded yet.`);
	}
	return metadata.searchFormId.replaceAll('&', ',');
};

/** dex-server's own precomputed Shadow-counterpart pointer, straight off the
 *  gamemaster entry itself (`family-relations-calculator.ts`) — no
 *  `speciesSearchMetadata` involved at all, no gamemaster scan. */
const hasShadowCounterpart = (species: IGamemasterPokemon): boolean => species.shadowSpecies !== undefined;

/**
 * Every non-Mega/non-alias/non-Shadow form's own comma-form id, grouped by
 * dex — what `canonicalizeDexExclusions` needs to know it's safe to collapse
 * a dex's per-form clauses into one bare `!<dex>` (every sibling form
 * actually accounted for). Shadow forms never need their own entry here:
 * they always resolve to the identical id as their non-Shadow counterpart
 * (same dex, same types — dex-server's own `searchFormId` is keyed that
 * way), so including them would only ever add a duplicate.
 */
const buildFormsPerDex = (
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>
): Record<number, Set<string>> => {
	const formsPerDex: Record<number, Set<string>> = {};
	Object.values(gamemasterPokemon)
		.filter((e) => !e.isMega && !e.aliasId && !e.isShadow)
		.forEach((form) => {
			const [, ...formTokens] = negateIdentity(commaFormId(speciesSearchMetadata, form.speciesId)).split(',');
			(formsPerDex[form.dex] ??= new Set()).add(formTokens.join(','));
		});
	return formsPerDex;
};

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
	dynamax: boolean;
	fusion: boolean;
	gigantamax: boolean;
	background: boolean;
	specialBackground: boolean;
	shiny: boolean;
	costume: boolean;
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
	// These six are pure cosmetic/rarity keywords the game tracks per catch —
	// nothing in the gamemaster data says which of your own catches are
	// Dynamax/Fusion/Gigantamax/backgrounded/Shiny/costumed, so unlike the
	// categories above there's no way to reason about them at all; each is
	// just a blind `!keyword` append, same as `favorite`/`tagged`. Off by
	// default, unlike the rest: these are opt-in, not opt-out — same reasoning
	// as `shadow` above, just for a different reason (there's no existing
	// per-catch judgment to override here, it's a brand new exclusion).
	dynamax: false,
	fusion: false,
	gigantamax: false,
	background: false,
	specialBackground: false,
	shiny: false,
	costume: false,
};

/** Order and keys are fixed; label/description are translated at render
 *  time via literal per-entry `t()` calls (see `protectionMeta` inside
 *  MassDelete) — a `t(\`massDelete:protectionMeta.${key}.label\`)` template
 *  would silently escape scripts/check-i18n-parity.mjs's static scan, same
 *  reasoning as Shell.tsx's NAV array. */
const PROTECTION_META_TRANSLATORS: ReadonlyArray<{
	key: keyof ProtectionFlags;
	translate: (t: TFunction, gl: GameLanguage) => { label: string; description: string };
}> = [
	{
		key: 'favorite',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.favorite.label'),
			description: t('massDelete:protectionMeta.favorite.description'),
		}),
	},
	{
		key: 'tagged',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.tagged.label'),
			description: t('massDelete:protectionMeta.tagged.description'),
		}),
	},
	{
		key: 'legendary',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.legendary.label'),
			description: t('massDelete:protectionMeta.legendary.description'),
		}),
	},
	{
		key: 'mythical',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.mythical.label'),
			description: t('massDelete:protectionMeta.mythical.description'),
		}),
	},
	{
		key: 'ultraBeast',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.ultraBeast.label'),
			description: t('massDelete:protectionMeta.ultraBeast.description'),
		}),
	},
	{
		key: 'megaEvolvable',
		translate: (t, gl) => ({
			label: t('massDelete:protectionMeta.megaEvolvable.label', {
				megaEvolvable: gameTranslator(GameTranslatorKeys.MegaEvolvableDisplay, gl),
			}),
			description: t('massDelete:protectionMeta.megaEvolvable.description'),
		}),
	},
	{
		key: 'shadow',
		translate: (t, gl) => ({
			label: t('massDelete:protectionMeta.shadow.label', { shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl) }),
			description: t('massDelete:protectionMeta.shadow.description'),
		}),
	},
	{
		key: 'dynamax',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.dynamax.label'),
			description: t('massDelete:protectionMeta.dynamax.description'),
		}),
	},
	{
		key: 'fusion',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.fusion.label'),
			description: t('massDelete:protectionMeta.fusion.description'),
		}),
	},
	{
		key: 'gigantamax',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.gigantamax.label'),
			description: t('massDelete:protectionMeta.gigantamax.description'),
		}),
	},
	{
		key: 'background',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.background.label'),
			description: t('massDelete:protectionMeta.background.description'),
		}),
	},
	{
		key: 'specialBackground',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.specialBackground.label'),
			description: t('massDelete:protectionMeta.specialBackground.description'),
		}),
	},
	{
		key: 'shiny',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.shiny.label'),
			description: t('massDelete:protectionMeta.shiny.description'),
		}),
	},
	{
		key: 'costume',
		translate: (t) => ({
			label: t('massDelete:protectionMeta.costume.label'),
			description: t('massDelete:protectionMeta.costume.description'),
		}),
	},
];

/* Three tabs, three deliberately separate domains — each one asks exactly one
   question and ignores everything else, so their answers can be trusted and
   combined freely (run one, two, or all three, in any order):
     - Non-meta relevant: is this species competitively relevant ANYWHERE?
       Never looks at IVs, not even once.
     - Non-Perfect IVs: is this exact catch's IV spread the true best possible
       for its species? Never looks at meta relevance, not even once.
     - Find Tradeable: is this species relevant somewhere IVs don't matter
       (Master League, raids) while this catch's own IVs still have room to
       improve?
   Mixing "meta" and "IV" judgments in one tab was the mistake this app used
   to make (a "keep relevant for trade" checkbox in this tab used to do a
   half-hearted version of what the second tab now does properly) — each tab
   staying in its own lane is what makes all three trustworthy. */
export interface ComputeArgs {
	gamemasterPokemon: Record<string, IGamemasterPokemon>;
	speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>;
	rankLists: Array<Record<string, { rank: number } | undefined>>;
	raidDPS: Record<string, Record<string, DPSEntry>>;
	raidMetric: RaidMetric;
	gl: GameLanguage;
	cp: number;
	trashGreat: number;
	trashUltra: number;
	trashMaster: number;
	trashRaid: number;
	/** Every non-Shadow species' own tied-for-rank-1 (best stat product) raw
	 *  IV bucket pattern(s) for the uncapped Master cap only — see
	 *  `findBadIvCarveOuts` in the compute worker (called here with
	 *  `caps: [Number.MAX_VALUE], includeShadowPurify: false`). `!4*` alone
	 *  only protects the exact 15/15/15; a stat-product TIE with it (most
	 *  often an HP-floor coincidence like 15/15/14 — a real, confirmed thing,
	 *  not an approximation) is otherwise indistinguishable from genuine
	 *  wasted IV potential. Shadow catches don't need this: they already have
	 *  their own, cheaper, always-on protection (`shadowPurifyHundoGuard`
	 *  below), so the expensive Shadow-purify pass is deliberately skipped for
	 *  this sweep — confirmed against real data to be ~87% of the cost of
	 *  computing this otherwise. */
	masterCarveOuts: Array<BadIvCarveOut>;
	protect: ProtectionFlags;
	/** Manually-protected species — never evaluated, always excluded outright. */
	whitelist: Set<string>;
	/** Default `false`. Set `true` to skip `masterCarveOuts` entirely — a
	 *  genuinely deletable species then relies solely on the unconditional,
	 *  global `!4*` exclusion for Master League (the exact hundo only), same
	 *  as `computeBadIvString`'s own "Simplified mode" trades some accuracy
	 *  for a shorter string. */
	simplified?: boolean;
}

/**
 * Unconditional, not togglable by anything — same treatment as `!4*` itself,
 * and appended alongside it in all three tabs. A Shadow catch with Attack,
 * Defense, AND HP each already in bucket 3-4 (raw IV 11-15) might purify
 * (+2 per stat, capped at 15) into an exact 15/15/15: raw 13 or 14 in a stat
 * reaches 15 once purified, and raw 15 already is one. Judging a Shadow
 * catch as "not a hundo" purely on its own raw IVs, the way every other
 * check here does, would risk deleting or trading away what amounts to a
 * hundo the moment it's purified — a free, always-available action, not a
 * hypothetical. The game's search can't filter tighter than bucket
 * granularity, so the whole bucket 3-4 range is protected, not just the raw
 * values that provably reach exactly 15 — the same approximation every
 * other bucket-based carve-out in this file already makes.
 */
const shadowPurifyHundoGuard = (gl: GameLanguage): string => {
	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);
	const shadow = gameTranslator(GameTranslatorKeys.ShadowSearch, gl);
	return `&0-2${A},0-2${D},0-2${S},!${shadow}`;
};

/* ---- verbatim port of the legacy DeleteTrash `computeStr`, since extended
   with togglable category protection and a manual per-species whitelist ----
   Deliberately meta-only: whether a species (or any of its later evolutions)
   clears a rank/raid cutoff is a species-level fact, entirely independent of
   which IVs any particular catch of it has. Once it clears one cutoff
   anywhere, every catch of it is spared — no IV consideration enters into
   this tab at all, that's what the "Non-Perfect IVs" tab is for. */
export const computeTrashString = (a: ComputeArgs): string => {
	const {
		gamemasterPokemon,
		speciesSearchMetadata,
		rankLists,
		raidDPS,
		raidMetric,
		gl,
		cp,
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
		masterCarveOuts,
		protect,
		whitelist,
		simplified = false,
	} = a;

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
	// Every species that ends up deletable on its own account (not merely
	// sharing a dex with one) — read below to scope the Master carve-out
	// consumption to exactly these; a species that never entered candidacy at
	// all is already unconditionally protected regardless of IVs, so a
	// carve-out clause for it would be pure dead weight.
	const deletableSpeciesIds = new Set<string>();

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
				deletableSpeciesIds.add(p.speciesId);
			} else {
				if (!alwaysGood[p.dex]) {
					alwaysGood[p.dex] = new Set<IGamemasterPokemon>();
				}
				alwaysGood[p.dex].add(p);
			}
		});

	const formsPerDex = buildFormsPerDex(gamemasterPokemon, speciesSearchMetadata);

	const potentiallyDeletablePokemonArray = Array.from(potentiallyDeletablePokemon);
	const dexListStr = potentiallyDeletablePokemonArray.join(',');

	const exclusions: Array<DexExclusion> = [];
	potentiallyDeletablePokemonArray.forEach((d) => {
		if (!alwaysGood[d]) return;
		alwaysGood[d].forEach((e) => {
			const [, ...formTokens] = negateIdentity(commaFormId(speciesSearchMetadata, e.speciesId)).split(',');
			const shadowScope: DexExclusion['shadowScope'] = e.isShadow
				? 'shadow-only'
				: hasShadowCounterpart(e)
					? 'non-shadow-only'
					: '';
			exclusions.push({ dex: e.dex, form: formTokens.join(','), shadowScope, extra: '' });
		});
	});

	// Stat-product-tie protection (Master League only — see `masterCarveOuts`'s
	// own doc comment on `ComputeArgs`): a species that's genuinely deletable
	// (bad everywhere) can still have individual catches whose raw IVs are its
	// own tied-for-rank-1 Master spread — just as "nothing left to gain" as an
	// exact hundo, even though they aren't one. `!4*` alone only ever catches
	// the literal hundo, so every carve-out belonging to an actually-deletable,
	// non-Shadow species gets its own protective clause here too. Never
	// Shadow-scoped — `masterCarveOuts` is computed with `includeShadowPurify:
	// false`, so it never contains a Shadow-suffixed speciesId in the first
	// place; Shadow catches already have their own, separate, always-on
	// protection (`shadowPurifyHundoGuard` below).
	//
	// Simplified mode skips this loop entirely: a genuinely deletable species
	// then relies solely on the unconditional, global `!4*` exclusion below
	// (the exact hundo only) for Master League protection — shorter string,
	// but a non-hundo Master-tied spread (e.g. a 15/15/14 HP-floor tie) is no
	// longer individually carved out.
	if (!simplified)
		masterCarveOuts.forEach(({ speciesId, pattern }) => {
			if (!deletableSpeciesIds.has(speciesId)) return;
			const p = gamemasterPokemon[speciesId];
			if (!p) return;
			const [, ...formTokens] = negateIdentity(commaFormId(speciesSearchMetadata, p.speciesId)).split(',');
			const extra =
				groupAttr(complementOfBucket(ivBucket(pattern.A)), A) +
				groupAttr(complementOfBucket(ivBucket(pattern.D)), D) +
				groupAttr(complementOfBucket(ivBucket(pattern.S)), S);
			exclusions.push({ dex: p.dex, form: formTokens.join(','), shadowScope: '', extra });
		});

	// keep the query short — Android's search box caps out around 5k characters
	const allDexes = new Set(
		Object.values(gamemasterPokemon)
			.filter((e) => !e.isMega && !e.aliasId)
			.map((f) => f.dex)
	);
	const actualDexes = new Set(potentiallyDeletablePokemonArray);
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

	let newStr = dexListStr.length <= oppositeDexes.length ? dexListStr : oppositeDexes;

	// Final dead-weight pass — see `canonicalizeDexExclusions`'s own doc
	// comment. Replaces this tab's own former same-dex buffer/dedup logic,
	// which only ever collapsed a Shadow-scope pair for the *identical* form
	// (Case A there). Its cross-form dex-only merge (Case B) never actually
	// fires here, structurally: a dex only ever reaches this loop via a
	// sibling that ISN'T protected (see `alwaysGood`/`potentiallyDeletable-
	// Pokemon` above — whitelisted/Shadow-protected short-circuits BEFORE the
	// deletable-or-not evaluation, so a form is always either "why this dex
	// is even a candidate" or "one of its protected siblings", never both) —
	// "every sibling protected" and "this dex is a candidate at all" can't
	// hold simultaneously. Kept anyway for the same shared, tested logic
	// across all three tabs, and in case that invariant ever changes.
	for (const t of canonicalizeDexExclusions(exclusions, formsPerDex)) {
		newStr += (newStr ? '&' : '') + renderDexExclusion(t);
	}

	newStr = translateTypeNames(newStr, gl);

	newStr += `&!4*${shadowPurifyHundoGuard(gl)}&!${gameTranslator(GameTranslatorKeys.CPSearch, gl)}${cp}-`;
	if (protect.tagged) newStr += '&!#';
	if (protect.favorite) newStr += `&!${gameTranslator(GameTranslatorKeys.Favorite, gl)}`;
	if (protect.megaEvolvable) newStr += `&!${gameTranslator(GameTranslatorKeys.MegaEvolve, gl)}`;
	// Precautionary duplicate of the candidate-level filter above (same as
	// the Non-Perfect IVs tab already does for these four) — belt-and-
	// suspenders in case a reachable-family edge case ever let one slip past
	// that filter.
	if (protect.legendary) newStr += `&!${gameTranslator(GameTranslatorKeys.Legendary, gl)}`;
	if (protect.mythical) newStr += `&!${gameTranslator(GameTranslatorKeys.Mythical, gl)}`;
	if (protect.ultraBeast) newStr += `&!${gameTranslator(GameTranslatorKeys.UltraBeast, gl)}`;
	if (protect.shadow) newStr += `&!${gameTranslator(GameTranslatorKeys.ShadowSearch, gl)}`;
	if (protect.dynamax) newStr += `&!${gameTranslator(GameTranslatorKeys.DynamaxSearch, gl)}`;
	if (protect.fusion) newStr += `&!${gameTranslator(GameTranslatorKeys.FusionSearch, gl)}`;
	if (protect.gigantamax) newStr += `&!${gameTranslator(GameTranslatorKeys.GigantamaxSearch, gl)}`;
	if (protect.background) newStr += `&!${gameTranslator(GameTranslatorKeys.BackgroundSearch, gl)}`;
	if (protect.specialBackground) newStr += `&!${gameTranslator(GameTranslatorKeys.SpecialBackgroundSearch, gl)}`;
	if (protect.shiny) newStr += `&!${gameTranslator(GameTranslatorKeys.ShinySearch, gl)}`;
	if (protect.costume) newStr += `&!${gameTranslator(GameTranslatorKeys.CostumeSearch, gl)}`;
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
 * nothing here ever needs to special-case one — but a hundo isn't the only
 * spread with nothing left to gain: `masterCarveOuts` (computed separately,
 * uncapped, `includeShadowPurify: false`) covers the one other case `!4*`
 * can't — a genuine stat-product TIE with it in Master League, always bucket
 * 4/4/3 (only HP floors; Attack/Defense can never tie below 15). Applied
 * unconditionally to every species this whole tab evaluates, not just a
 * filtered candidate subset — this tab never has one, unlike the other two.
 * Shadow catches need no entry here at all: they're already completely
 * covered by the always-on `shadowPurifyHundoGuard` below (every raw IV that
 * could ever purify into a Master tie is already inside the bucket 3-4 range
 * it protects), so `masterCarveOuts` is computed without the expensive
 * Shadow-purify pass — pure waste to redo protection that already exists.
 * Manually-whitelisted species get an unconditional exclusion clause instead
 * of (not in addition to) any carve-out pattern — their own IV spread stops
 * mattering entirely.
 *
 * `simplified` (the "Simplified mode" toggle next to the CP dropdown) trades
 * accuracy for string length: instead of a per-carve-out clause that protects
 * only the exact deviating bucket pattern (`&!<dex>,<pattern-complement>`),
 * it emits the same bare, unconditional exclusion whitelisted species get
 * (`&!<dex>`, or `&!<dex>,!shadow` when the carve-out is Shadow-specific) —
 * i.e. any species that needs even one bucket-level carve-out is skipped
 * entirely rather than only protecting its own real optimum. Strictly more
 * false negatives than Complete mode (some catches Complete would still
 * correctly target stay un-targeted here too), never fewer — it only ever
 * widens what gets excluded, exactly like the whitelist clause it borrows its
 * shape from. Applies identically to `masterCarveOuts` entries, same as any
 * other carve-out.
 */
export const computeBadIvString = (
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>,
	carveOuts: Array<BadIvCarveOut>,
	gl: GameLanguage,
	cp: number,
	protect: ProtectionFlags,
	whitelist: Set<string>,
	simplified = false,
	masterCarveOuts: Array<BadIvCarveOut> = []
): string => {
	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);
	const CP = gameTranslator(GameTranslatorKeys.CPSearch, gl);

	// Shadow forms mirror their non-shadow counterpart's stats exactly — CP
	// depends only on base stats, and shadow doesn't change those — so this
	// whole mode never needs to distinguish shadow from non-shadow at all
	// (`buildFormsPerDex` itself already excludes Shadow forms, for the same
	// reason dex-server's own `searchFormId` does).
	const formsPerDex = buildFormsPerDex(gamemasterPokemon, speciesSearchMetadata);

	// The shared Great/Ultra default clause is the primary selection criterion
	// (no leading `&`, matching Tab 1's own convention of always starting with
	// a bare positive term). Master's broader "11+ everywhere" rule is
	// deliberately not included — only an exact hundo gets a free pass, and
	// that's `!4*` at the tail, unconditionally.
	let result = `2-4${A},0-2${D},0-2${S}`;

	const exclusions: Array<DexExclusion> = [];
	// `masterCarveOuts` entries are consumed by the exact same logic below as
	// `carveOuts` — the loop body never actually branches on `cap`, and every
	// `masterCarveOuts` entry is guaranteed non-Shadow (computed with
	// `includeShadowPurify: false`), so `p.isShadow` below is always `false`
	// for them, same as any other non-Shadow carve-out.
	[...carveOuts, ...masterCarveOuts].forEach(({ speciesId, pattern }) => {
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
		const [, ...formTokens] = negateIdentity(commaFormId(speciesSearchMetadata, p.speciesId)).split(',');
		// This exact pattern is either that species' own true optimum (shadow-
		// agnostic — a non-Shadow catch's raw IVs are its real IVs, and a
		// Shadow catch's own raw IVs mean the same thing before it's purified,
		// so protecting this pattern is correct for both) — or, when `p` is
		// itself a Shadow form, it's specifically the *pre*-purification raw
		// spread that turns into that species' true optimum only once
		// purified (`findBadIvCarveOuts`'s Shadow-only pass). That second kind
		// only holds for an actually-Shadow catch — a non-Shadow catch with
		// this same raw spread gets no future +2 boost, so it stays genuinely
		// wasted — hence the Shadow-only scoping.
		// Simplified mode stops right here — see this function's own doc
		// comment on the tradeoff. Complete mode goes on to narrow the
		// exclusion down to just the deviating bucket pattern itself.
		const extra = simplified
			? ''
			: groupAttr(complementOfBucket(ivBucket(pattern.A)), A) +
				groupAttr(complementOfBucket(ivBucket(pattern.D)), D) +
				groupAttr(complementOfBucket(ivBucket(pattern.S)), S);
		exclusions.push({ dex: p.dex, form: formTokens.join(','), shadowScope: p.isShadow ? 'shadow-only' : '', extra });
	});

	whitelist.forEach((speciesId) => {
		const p = gamemasterPokemon[speciesId];
		if (!p || p.isMega || p.aliasId) return;
		const [, ...formTokens] = negateIdentity(commaFormId(speciesSearchMetadata, p.speciesId)).split(',');
		exclusions.push({ dex: p.dex, form: formTokens.join(','), shadowScope: '', extra: '' });
	});

	// Final dead-weight pass: drops a Shadow-scoped clause a same-pattern
	// unscoped one already subsumes (or merges Shadow-only + non-Shadow-only
	// halves back into one), and — when Simplified mode (or the whitelist)
	// has left *every* sibling form at a dex unconditionally excluded — folds
	// them all into one bare `!<dex>`. See `canonicalizeDexExclusions`'s own
	// doc comment for the exact soundness conditions.
	for (const t of canonicalizeDexExclusions(exclusions, formsPerDex)) {
		result += `&${renderDexExclusion(t)}`;
	}

	result = translateTypeNames(result, gl);

	result += `&!4*${shadowPurifyHundoGuard(gl)}&!${CP}${cp}-`;
	if (protect.tagged) result += '&!#';
	if (protect.favorite) result += `&!${gameTranslator(GameTranslatorKeys.Favorite, gl)}`;
	if (protect.megaEvolvable) result += `&!${gameTranslator(GameTranslatorKeys.MegaEvolve, gl)}`;
	if (protect.legendary) result += `&!${gameTranslator(GameTranslatorKeys.Legendary, gl)}`;
	if (protect.mythical) result += `&!${gameTranslator(GameTranslatorKeys.Mythical, gl)}`;
	if (protect.ultraBeast) result += `&!${gameTranslator(GameTranslatorKeys.UltraBeast, gl)}`;
	if (protect.shadow) result += `&!${gameTranslator(GameTranslatorKeys.ShadowSearch, gl)}`;
	if (protect.dynamax) result += `&!${gameTranslator(GameTranslatorKeys.DynamaxSearch, gl)}`;
	if (protect.fusion) result += `&!${gameTranslator(GameTranslatorKeys.FusionSearch, gl)}`;
	if (protect.gigantamax) result += `&!${gameTranslator(GameTranslatorKeys.GigantamaxSearch, gl)}`;
	if (protect.background) result += `&!${gameTranslator(GameTranslatorKeys.BackgroundSearch, gl)}`;
	if (protect.specialBackground) result += `&!${gameTranslator(GameTranslatorKeys.SpecialBackgroundSearch, gl)}`;
	if (protect.shiny) result += `&!${gameTranslator(GameTranslatorKeys.ShinySearch, gl)}`;
	if (protect.costume) result += `&!${gameTranslator(GameTranslatorKeys.CostumeSearch, gl)}`;

	return result;
};

/**
 * "Find Pokémon Worth Trading" — a third, independent domain: species that
 * are actually relevant for Master League, raids, or Great/Ultra (see below),
 * where a Best Friend trade's guaranteed floor of 5 per stat (12, on a Lucky
 * Trade) can only ever be a genuine upgrade, never a downside — that's the
 * whole premise a suggestion here is supposed to rest on.
 *
 * Unlike the other two tabs, this one can't lean on the game's own `!4*`
 * keyword alone to avoid suggesting something that's already at its ceiling:
 * a stat-product TIE with the hundo (most commonly a 15/15/14, since HP is
 * the only stat the game floors — see `findBadIvCarveOuts`'s own doc
 * comment) has just as little to gain from a trade as an exact hundo does,
 * but `!4*` doesn't match it. So for every reachable stage that actually
 * qualifies a candidate (clears its league's rank cutoff), this also carves
 * out that stage's own tied-for-rank-1 raw IV pattern(s) — at whichever
 * single level ceiling the player currently has toggled (never both, see
 * `findBadIvCarveOuts`'s own `maxLevel` doc comment) — from the CANDIDATE's
 * own dex. Raw IVs never change through evolution, so a pattern computed
 * from a later stage's own base stats still correctly protects an earlier,
 * not-yet-evolved catch that already happens to have those exact raw IVs.
 *
 * This is deliberately cheap despite doing real per-catch protection, for a
 * reason unique to this tab: a Shadow can NEVER be a trade candidate at all
 * (the game doesn't allow it), so purification — by far the most expensive
 * part of the equivalent machinery in the Non-Perfect IVs tab — is simply
 * never relevant here (confirmed against real data: the Shadow-purify pass
 * alone was ~87% of an equivalent Master sweep's cost). Carve-outs are also
 * only ever computed for reachable stages that actually clear a rank cutoff,
 * never a species' whole reachable family unconditionally.
 *
 * Master League has no CP cap, so a reachable stage qualifies on rank alone —
 * no IV condition needed for a species to be a real candidate there. Great
 * and Ultra are pickier: their CP caps often mean the single best (top stat
 * product) spread for a species is the classic low-Attack shape, which a
 * trade's guaranteed floor of 5 can never actually reach (a trade never
 * produces below 5 in a stat) — so a reachable stage there only counts as a
 * qualifying reason when its own tied-best spread, at the single level
 * ceiling currently toggled, has every stat at 5 or higher.
 *
 * A hundo is always excluded outright (`!4*`) regardless of any of the
 * above — the carve-outs above never need to (and don't) duplicate that.
 * `onlyLowIv` optionally narrows further, to only the clearly-low spreads
 * (Attack/Defense/HP all bucket 0-2, i.e. raw IV 10 or less). `cp` is an
 * upper bound, not a floor — some players don't want to give up a catch
 * they've already invested CP into, so anything at or above it is never
 * suggested.
 */
export const computeTradeableString = (
	gamemasterPokemon: Record<string, IGamemasterPokemon>,
	speciesSearchMetadata: Record<string, ISpeciesSearchMetadata>,
	rankLists: Array<Record<string, { rank: number } | undefined>>,
	raidDPS: Record<string, Record<string, DPSEntry>>,
	raidMetric: RaidMetric,
	gl: GameLanguage,
	trashGreat: number,
	trashUltra: number,
	trashMaster: number,
	trashRaid: number,
	tradeableSpeciesData: Record<string, TradeableSpeciesData>,
	protect: ProtectionFlags,
	whitelist: Set<string>,
	onlyLowIv: boolean,
	cp: number
): string => {
	const A = gameTranslator(GameTranslatorKeys.AttackSearch, gl);
	const D = gameTranslator(GameTranslatorKeys.DefenseSearch, gl);
	const S = gameTranslator(GameTranslatorKeys.HPSearch, gl);
	const CP = gameTranslator(GameTranslatorKeys.CPSearch, gl);
	const shadow = gameTranslator(GameTranslatorKeys.ShadowSearch, gl);
	const mythical = gameTranslator(GameTranslatorKeys.Mythical, gl);

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

	const tradeableDexes = new Set<number>();
	const excludedForms: Record<string, Set<IGamemasterPokemon>> = {};
	// Every tied-for-rank-1 pattern a qualifying reachable stage contributed,
	// per CANDIDATE species (not per reachable — raw IVs belong to the
	// candidate, never change through evolution, so that's always the right
	// place to carve a pattern out of, regardless of which reachable stage's
	// own base stats produced it). Deduped by `speciesId|A-D-S`, consumed
	// below once `baseIds`/`formsPerDex` exist.
	const carvePatternsBySpecies = new Map<string, Map<string, BadIvPattern>>();
	const addCarvePattern = (speciesId: string, pattern: BadIvPattern) => {
		if (!carvePatternsBySpecies.has(speciesId)) carvePatternsBySpecies.set(speciesId, new Map());
		carvePatternsBySpecies.get(speciesId)!.set(`${pattern.A}-${pattern.D}-${pattern.S}`, pattern);
	};

	Object.values(gamemasterPokemon)
		.filter(
			(p) =>
				!p.aliasId &&
				!p.isMega &&
				(protect.legendary ? !p.isLegendary : true) &&
				// Mythicals can never be traded, full stop, exactly like Shadows
				// (see the flat `&!mythic` appended below) — unconditional, not
				// tied to the toggle.
				!p.isMythical &&
				(protect.ultraBeast ? !p.isBeast : true)
		)
		.forEach((p) => {
			// Shadows can never be traded, full stop — the game doesn't allow
			// it, regardless of IVs — so a Shadow form never gets to be the one
			// that qualifies a dex here (unconditionally, not tied to any
			// toggle), and needs no scoped exclusion clause of its own either:
			// the flat `&!shadow` appended below already excludes every Shadow
			// catch outright.
			if (p.isShadow) return;
			// Manually excluded from suggestion — a whitelisted form must not be
			// suggested even when a non-excluded sibling at the same dex
			// otherwise qualifies, so it still needs its own disambiguating
			// exclusion clause below.
			if (whitelist.has(p.speciesId)) {
				if (!excludedForms[p.dex]) excludedForms[p.dex] = new Set<IGamemasterPokemon>();
				excludedForms[p.dex].add(p);
				return;
			}

			// Master/Great/Ultra: walk the whole reachable family (including
			// `p` itself) once, checking each stage `r` against every league's
			// own rank cutoff AND (Great/Ultra only) its own floor-5
			// eligibility, and — whenever `r` actually qualifies `p` through
			// some league — folding that SAME stage's own tied-rank-1
			// pattern(s) for that league into `p`'s carve-out set. A stage can
			// qualify `p` through more than one league at once; each
			// contributes its own patterns independently.
			const reachablePokemon = Array.from(fetchReachablePokemonIncludingSelf(p, gamemasterPokemon));
			let goodForMaster = false;
			let goodForGreat = false;
			let goodForUltra = false;
			for (const r of reachablePokemon) {
				// Deliberately NOT skipped when `data` is missing (e.g. `r` is
				// excluded from `findTradeableSpeciesData`'s own candidate
				// filter for some reason) — Master's admission is pure rank,
				// same as before this whole carve-out mechanism existed, and
				// must never silently start depending on this data being
				// present. Only the pattern carve-out (an ADDITIONAL, optional
				// protection) needs `data` at all — its absence just means no
				// carve-out gets added for this stage, never a lost admission.
				const data = tradeableSpeciesData[r.speciesId];

				const mlRank = rankLists[2][r.speciesId]?.rank;
				if (mlRank != null && !isBadRank(mlRank, trashMaster)) {
					goodForMaster = true;
					data?.master.patterns.forEach((pattern) => addCarvePattern(p.speciesId, pattern));
				}

				const glRank = rankLists[0][r.speciesId]?.rank;
				if (glRank != null && !isBadRank(glRank, trashGreat) && data?.great.floorOk) {
					goodForGreat = true;
					data.great.patterns.forEach((pattern) => addCarvePattern(p.speciesId, pattern));
				}

				const ulRank = rankLists[1][r.speciesId]?.rank;
				if (ulRank != null && !isBadRank(ulRank, trashUltra) && data?.ultra.floorOk) {
					goodForUltra = true;
					data.ultra.patterns.forEach((pattern) => addCarvePattern(p.speciesId, pattern));
				}
			}

			if (isGoodForRaids(p) || goodForMaster || goodForGreat || goodForUltra) {
				tradeableDexes.add(p.dex);
			}
		});

	const formsPerDex = buildFormsPerDex(gamemasterPokemon, speciesSearchMetadata);

	let result = Array.from(tradeableDexes).join(',');
	const exclusions: Array<DexExclusion> = [];
	tradeableDexes.forEach((d) => {
		if (!excludedForms[d]) return;
		excludedForms[d].forEach((e) => {
			const [, ...formTokens] = negateIdentity(commaFormId(speciesSearchMetadata, e.speciesId)).split(',');
			// `e` is never a Shadow form here (those are skipped entirely
			// above), but it can still share a dex with one — 'non-shadow-only'
			// keeps this whitelist exclusion from also swallowing that Shadow
			// sibling's own (already unconditionally excluded) catches.
			const shadowScope: DexExclusion['shadowScope'] = hasShadowCounterpart(e) ? 'non-shadow-only' : '';
			exclusions.push({ dex: e.dex, form: formTokens.join(','), shadowScope, extra: '' });
		});
	});
	// Stat-product-tie protection — the carve-out patterns accumulated above,
	// turned into the same bucket-complement exclusion shape the other two
	// tabs use. `speciesId` here is always the ORIGINAL candidate (never the
	// reachable stage whose own base stats produced the pattern — see the
	// candidate loop above), so this always protects the actual catch's own
	// raw IVs, correctly, regardless of which future stage the pattern came
	// from. Never Shadow-scoped — a candidate here is guaranteed non-Shadow
	// (Shadows are skipped entirely above), so a bare, Shadow-agnostic clause
	// is always correct.
	carvePatternsBySpecies.forEach((patterns, speciesId) => {
		const p = gamemasterPokemon[speciesId];
		if (!p) return;
		const [, ...formTokens] = negateIdentity(commaFormId(speciesSearchMetadata, p.speciesId)).split(',');
		patterns.forEach((pattern) => {
			const extra =
				groupAttr(complementOfBucket(ivBucket(pattern.A)), A) +
				groupAttr(complementOfBucket(ivBucket(pattern.D)), D) +
				groupAttr(complementOfBucket(ivBucket(pattern.S)), S);
			exclusions.push({ dex: p.dex, form: formTokens.join(','), shadowScope: '', extra });
		});
	});
	// Final dead-weight pass — see `canonicalizeDexExclusions`'s own doc
	// comment. Both its Case A (Shadow-scope collapse, for the whitelist
	// exclusions above) and Case B (cross-form dex-only merge) can now
	// genuinely fire here, unlike before the carve-out patterns above existed
	// — e.g. every sibling form at a dex independently earning the exact same
	// tied-rank-1 pattern collapses into one shared clause instead of one per
	// form.
	for (const t of canonicalizeDexExclusions(exclusions, formsPerDex)) {
		result += `&${renderDexExclusion(t)}`;
	}

	result = translateTypeNames(result, gl);

	// A hundo needs no trade at all, regardless of the stricter toggle below.
	// Shadows and Mythicals can never be traded — no purify-to-hundo carve-out
	// needed here the way the other two tabs need it (a Shadow catch can't be
	// deleted or found-not-worth-keeping away right before it'd purify into
	// one — but it was never tradeable in the first place, purified or not),
	// just a flat, unconditional exclusion for both.
	result += `&!4*&!${shadow}&!${mythical}&!${CP}${cp}-`;
	if (onlyLowIv) {
		result += `&0-2${A}&0-2${D}&0-2${S}`;
	}
	if (protect.tagged) result += '&!#';
	if (protect.favorite) result += `&!${gameTranslator(GameTranslatorKeys.Favorite, gl)}`;
	if (protect.megaEvolvable) result += `&!${gameTranslator(GameTranslatorKeys.MegaEvolve, gl)}`;
	// Precautionary duplicate of the candidate-level filter above (same as the
	// other two tabs already do for these three) — belt-and-suspenders in
	// case a reachable-family edge case ever let one slip past that filter.
	if (protect.legendary) result += `&!${gameTranslator(GameTranslatorKeys.Legendary, gl)}`;
	if (protect.ultraBeast) result += `&!${gameTranslator(GameTranslatorKeys.UltraBeast, gl)}`;
	if (protect.dynamax) result += `&!${gameTranslator(GameTranslatorKeys.DynamaxSearch, gl)}`;
	if (protect.fusion) result += `&!${gameTranslator(GameTranslatorKeys.FusionSearch, gl)}`;
	if (protect.gigantamax) result += `&!${gameTranslator(GameTranslatorKeys.GigantamaxSearch, gl)}`;
	if (protect.background) result += `&!${gameTranslator(GameTranslatorKeys.BackgroundSearch, gl)}`;
	if (protect.specialBackground) result += `&!${gameTranslator(GameTranslatorKeys.SpecialBackgroundSearch, gl)}`;
	if (protect.shiny) result += `&!${gameTranslator(GameTranslatorKeys.ShinySearch, gl)}`;
	if (protect.costume) result += `&!${gameTranslator(GameTranslatorKeys.CostumeSearch, gl)}`;
	// Unconditional, not a togglable protection: an already-traded Pokémon
	// can never be traded again, so suggesting one would just be wrong,
	// regardless of any category setting above.
	result += `&!${gameTranslator(GameTranslatorKeys.TradedSearch, gl)}`;

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
	const { t } = useTranslation(['massDelete']);
	const { currentGameLanguage: gl } = useLanguage();
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
					aria-label={t('massDelete:whitelist.clear')}
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
									<img
										src={spriteUrl(p, imageSource)}
										alt=''
										loading='lazy'
										decoding='async'
										onError={handleSpriteError(p)}
									/>
								</span>
								<span className='r-search-name'>
									{cleanName(p.speciesName)}
									{p.isShadow && (
										<em className='r-search-shadow'>
											{' '}
											· {t('massDelete:whitelist.shadowSuffix', { shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl) })}
										</em>
									)}
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
}) => {
	const { t } = useTranslation(['massDelete']);
	return (
		<button
			type='button'
			className='r-md-wl-chip'
			data-locked={locked ? '' : undefined}
			disabled={locked}
			title={locked ? t('massDelete:whitelist.removeLockedTitle', { reason }) : t('massDelete:whitelist.remove')}
			onClick={() => onRemove(p.speciesId)}
		>
			<span className='r-md-wl-sprite'>
				{p.isShadow && <ShadowMark />}
				<img src={spriteUrl(p, imageSource)} alt='' loading='lazy' decoding='async' onError={handleSpriteError(p)} />
			</span>
			<span className='r-md-wl-name'>{cleanName(p.speciesName)}</span>
			{!locked && (
				<span className='r-md-wl-x' aria-hidden='true'>
					×
				</span>
			)}
		</button>
	);
};

// dex, then form (grouping each Shadow right after its precomputed
// non-Shadow counterpart, via dex-server's own `nonShadowSpecies` field),
// then non-shadow before shadow — e.g. pikachu, raichu, raichu (shadow),
// raichu (alolan), raichu (alolan, shadow).
const formKeyOf = (p: IGamemasterPokemon) => (p.isShadow ? (p.nonShadowSpecies ?? p.speciesId) : p.speciesId);
const byDexFormShadow = (a: { p: IGamemasterPokemon }, b: { p: IGamemasterPokemon }) =>
	a.p.dex - b.p.dex || formKeyOf(a.p).localeCompare(formKeyOf(b.p)) || Number(a.p.isShadow) - Number(b.p.isShadow);

const MassDelete = () => {
	const { t } = useTranslation(['massDelete']);
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { speciesSearchMetadata, fetchCompleted: speciesSearchMetadataFetchCompleted } = useSpeciesSearchMetadata();
	const { movesFetchCompleted } = useMoves();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { raidMetric } = useRaidMetric();
	const { currentGameLanguage: gl } = useLanguage();
	const { imageSource } = useImageSource();
	// Every carve-out/tie-eligibility sweep across all three tabs now honors
	// this single toggle exclusively — never both 50 and 51 at once — trading
	// the extra-level accuracy that used to cost real search-string length for
	// a shorter, single-level-correct string instead.
	const { maxLevel } = useBestBuddy();

	// The mode lives in the URL, not local/persisted state — each mode is a
	// real, distinct, shareable/crawlable page (`/search-strings/:tab`) rather
	// than a client-only toggle, matching how Calendar's own tabs work.
	// Anything not recognized quietly falls back to the default, same as
	// Calendar does for its own `:tab` param — no separate redirect route for
	// a typo'd slug.
	const { tab } = useParams();
	const navigate = useNavigate();
	const mode: 'meta' | 'badIv' | 'trade' = tab === 'non-perfect-ivs' ? 'badIv' : tab === 'tradeable' ? 'trade' : 'meta';
	const setMode = (next: 'meta' | 'badIv' | 'trade') => {
		const slug: MassDeleteTab =
			next === 'badIv' ? 'non-perfect-ivs' : next === 'trade' ? 'tradeable' : 'non-meta-relevant';
		void navigate(R.searchStrings(slug));
	};
	const isTrade = mode === 'trade';

	const [trashGreat, setTrashGreat] = useState(() => numCfg(ConfigKeys.TrashGreat, 50));
	const [trashUltra, setTrashUltra] = useState(() => numCfg(ConfigKeys.TrashUltra, 50));
	const [trashMaster, setTrashMaster] = useState(() => numCfg(ConfigKeys.TrashMaster, 110));
	const [trashRaid, setTrashRaid] = useState(() => numCfg(ConfigKeys.TrashRaid, 5));
	// Shared across all three tabs — "never delete/suggest at or above this
	// CP" is the exact same guard everywhere, just applied to a different
	// action (delete vs. trade-suggest); one CP dropdown, one setting.
	const [cp, setCp] = useState(() => numCfg(ConfigKeys.TrashCP, 2500));
	// Only meaningful for the Find Tradeable tab — narrows the result to
	// catches whose Attack/Defense/HP are all clearly low (raw IV 10 or
	// less), rather than just excluding the exact hundo.
	const [tradeOnlyLowIv, setTradeOnlyLowIv] = useState(() => readPersistentValue(ConfigKeys.TradeOnlyLowIv) === 'true');
	useEffect(() => void writePersistentValue(ConfigKeys.TradeOnlyLowIv, String(tradeOnlyLowIv)), [tradeOnlyLowIv]);
	// Only meaningful for the Non-Perfect IVs tab — see `computeBadIvString`'s
	// own doc comment on the `simplified` parameter this feeds.
	const [simplifiedBadIv, setSimplifiedBadIv] = useState(
		() => readPersistentValue(ConfigKeys.BadIvSimplifiedMode) === 'true'
	);
	useEffect(
		() => void writePersistentValue(ConfigKeys.BadIvSimplifiedMode, String(simplifiedBadIv)),
		[simplifiedBadIv]
	);
	// Only meaningful for the Non-meta-relevant tab — see `computeTrashString`'s
	// own doc comment on the `simplified` parameter this feeds.
	const [simplifiedTrash, setSimplifiedTrash] = useState(
		() => readPersistentValue(ConfigKeys.TrashSimplifiedMode) === 'true'
	);
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashSimplifiedMode, String(simplifiedTrash)),
		[simplifiedTrash]
	);

	const [protect, setProtect] = useState<ProtectionFlags>(() => ({
		favorite: boolCfg(ConfigKeys.TrashKeepFavorite, DEFAULT_PROTECTION.favorite),
		tagged: boolCfg(ConfigKeys.TrashKeepTagged, DEFAULT_PROTECTION.tagged),
		legendary: boolCfg(ConfigKeys.TrashKeepLegendary, DEFAULT_PROTECTION.legendary),
		mythical: boolCfg(ConfigKeys.TrashKeepMythical, DEFAULT_PROTECTION.mythical),
		ultraBeast: boolCfg(ConfigKeys.TrashKeepUltraBeast, DEFAULT_PROTECTION.ultraBeast),
		megaEvolvable: boolCfg(ConfigKeys.TrashKeepMegaEvolvable, DEFAULT_PROTECTION.megaEvolvable),
		shadow: boolCfg(ConfigKeys.TrashKeepShadow, DEFAULT_PROTECTION.shadow),
		dynamax: boolCfg(ConfigKeys.TrashKeepDynamax, DEFAULT_PROTECTION.dynamax),
		fusion: boolCfg(ConfigKeys.TrashKeepFusion, DEFAULT_PROTECTION.fusion),
		gigantamax: boolCfg(ConfigKeys.TrashKeepGigantamax, DEFAULT_PROTECTION.gigantamax),
		background: boolCfg(ConfigKeys.TrashKeepBackground, DEFAULT_PROTECTION.background),
		specialBackground: boolCfg(ConfigKeys.TrashKeepSpecialBackground, DEFAULT_PROTECTION.specialBackground),
		shiny: boolCfg(ConfigKeys.TrashKeepShiny, DEFAULT_PROTECTION.shiny),
		costume: boolCfg(ConfigKeys.TrashKeepCostume, DEFAULT_PROTECTION.costume),
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
	useEffect(() => void writePersistentValue(ConfigKeys.TrashKeepDynamax, String(protect.dynamax)), [protect.dynamax]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashKeepFusion, String(protect.fusion)), [protect.fusion]);
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashKeepGigantamax, String(protect.gigantamax)),
		[protect.gigantamax]
	);
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashKeepBackground, String(protect.background)),
		[protect.background]
	);
	useEffect(
		() => void writePersistentValue(ConfigKeys.TrashKeepSpecialBackground, String(protect.specialBackground)),
		[protect.specialBackground]
	);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashKeepShiny, String(protect.shiny)), [protect.shiny]);
	useEffect(() => void writePersistentValue(ConfigKeys.TrashKeepCostume, String(protect.costume)), [protect.costume]);

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
		// On the Trade tab, Shadow and Mythical are protected unconditionally
		// (see the locked-on chips and computeTradeableString's flat
		// `&!shadow&!mythic`) — not tied to the `protect.shadow`/
		// `protect.mythical` flags there, so this has to check `isTrade` too,
		// or every Shadow/Mythical Pokémon would be silently missing from this
		// list despite the chips showing "on".
		const shadowProtected = isTrade || protect.shadow;
		const mythicalProtected = isTrade || protect.mythical;
		Object.values(gamemasterPokemon)
			.filter((p) => !p.aliasId && !p.isMega)
			.forEach((p) => {
				if (protect.legendary && p.isLegendary) map.set(p.speciesId, t('massDelete:protectionMeta.legendary.label'));
				else if (mythicalProtected && p.isMythical) map.set(p.speciesId, t('massDelete:protectionMeta.mythical.label'));
				else if (protect.ultraBeast && p.isBeast) map.set(p.speciesId, t('massDelete:protectionMeta.ultraBeast.label'));
				else if (shadowProtected && p.isShadow)
					map.set(
						p.speciesId,
						t('massDelete:protectionMeta.shadow.label', { shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl) })
					);
			});
		return map;
	}, [gamemasterPokemon, protect.legendary, protect.mythical, protect.ultraBeast, protect.shadow, isTrade, t, gl]);

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

	// Hoisted up from "Bad IV" mode's own section below (it's still declared
	// there in spirit — this is just so the shared `masterCarveOuts` query
	// right after can gate on it too, alongside the Non-meta tab's own
	// `isCalculating`, without a hook-ordering issue).
	const [isCalculatingBadIv, setIsCalculatingBadIv] = useState(false);
	const [badIvResult, setBadIvResult] = useState('');

	// Every non-Shadow species' own tied-for-rank-1 raw-IV bucket pattern(s)
	// for the uncapped Master cap only — see `ComputeArgs.masterCarveOuts`'s
	// own doc comment. Shared by the Non-meta AND Non-Perfect IVs tabs (both
	// need the exact same non-Shadow Master sweep). Deliberately its own
	// separate query from `badIvCarveOuts` below (not folded into its `caps`
	// array): that one needs the expensive Shadow-purify pass for Great/Ultra
	// anyway, but this one explicitly skips it (`includeShadowPurify: false`)
	// since Shadow catches already have their own, cheaper, always-on
	// protection here (`shadowPurifyHundoGuard`) — sharing one query would
	// force this sweep to wait on work it structurally never needs.
	// `speciesSearchMetadata`'s own key count is folded into every query key
	// below (not just passed as an argument): react-query's `staleTime:
	// Infinity` would otherwise cache a slow, brute-forced result computed
	// before that fetch resolved, and never automatically upgrade to the fast
	// precomputed path once it lands.
	const speciesSearchMetadataCount = Object.keys(speciesSearchMetadata).length;
	const { data: masterCarveOuts } = useQuery({
		enabled: (isCalculating || isCalculatingBadIv) && fetchCompleted && speciesSearchMetadataFetchCompleted,
		queryKey: ['master-carveouts-no-shadow', maxLevel, speciesSearchMetadataCount],
		queryFn: () =>
			getComputeWorker().findBadIvCarveOuts({
				gamemasterPokemon,
				speciesSearchMetadata,
				caps: [Number.MAX_VALUE],
				includeShadowPurify: false,
				maxLevel,
			}),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	// changing any knob invalidates a stale result — including the Best Buddy
	// level toggle: `masterCarveOuts` is keyed on `maxLevel` and silently
	// swaps out from under an already-displayed string otherwise.
	useEffect(() => {
		setResult('');
	}, [
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
		cp,
		gl,
		raidMetric,
		protect,
		whitelist,
		maxLevel,
		simplifiedTrash,
	]);

	useEffect(() => {
		if (
			!isCalculating ||
			!fetchCompleted ||
			!pvpFetchCompleted ||
			!raidDPSFetchCompleted ||
			!movesFetchCompleted ||
			!masterCarveOuts
		) {
			return;
		}
		const id = window.setTimeout(() => {
			setResult(
				computeTrashString({
					gamemasterPokemon,
					speciesSearchMetadata,
					rankLists: rankLists as unknown as ComputeArgs['rankLists'],
					raidDPS,
					raidMetric,
					gl,
					cp,
					trashGreat,
					trashUltra,
					trashMaster,
					trashRaid,
					masterCarveOuts,
					protect,
					whitelist: whitelistSet,
					simplified: simplifiedTrash,
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
		masterCarveOuts,
		gamemasterPokemon,
		speciesSearchMetadata,
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
		simplifiedTrash,
	]);

	// ---- "Bad IV" mode ----
	// (`isCalculatingBadIv`/`badIvResult` declared earlier — see the comment
	// on `masterCarveOuts` above for why.)

	// The heavy part — the brute-force sweep for every species' own best spread
	// per cap — never depends on `cp`/`gl`/the category toggles/the whitelist,
	// so it's cached indefinitely and only ever recomputed when the Best Buddy
	// toggle itself changes; only the (cheap) string assembly below reacts to
	// the other knobs.
	const { data: badIvCarveOuts } = useQuery({
		enabled: isCalculatingBadIv && fetchCompleted && speciesSearchMetadataFetchCompleted,
		queryKey: ['bad-iv-carveouts', maxLevel, speciesSearchMetadataCount],
		queryFn: () =>
			getComputeWorker().findBadIvCarveOuts({ gamemasterPokemon, speciesSearchMetadata, caps: [1500, 2500], maxLevel }),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	useEffect(() => {
		if (!isCalculatingBadIv || !fetchCompleted || !badIvCarveOuts || !masterCarveOuts) return;
		const id = window.setTimeout(() => {
			setBadIvResult(
				computeBadIvString(
					gamemasterPokemon,
					speciesSearchMetadata,
					badIvCarveOuts,
					gl,
					cp,
					protect,
					whitelistSet,
					simplifiedBadIv,
					masterCarveOuts
				)
			);
			setIsCalculatingBadIv(false);
		}, 60);
		return () => window.clearTimeout(id);
	}, [
		isCalculatingBadIv,
		fetchCompleted,
		badIvCarveOuts,
		masterCarveOuts,
		gamemasterPokemon,
		speciesSearchMetadata,
		gl,
		cp,
		protect,
		whitelistSet,
		simplifiedBadIv,
	]);

	// changing the CP floor, language, protections, whitelist, or simplified
	// mode invalidates a stale result. The Best Buddy level toggle does too —
	// unlike the other knobs here, it DOES change the carve-out sweep itself
	// (`badIvCarveOuts`/`masterCarveOuts` are both keyed on `maxLevel`), so an
	// already-displayed string would otherwise silently go stale under it.
	useEffect(() => {
		setBadIvResult('');
	}, [cp, gl, protect, whitelist, simplifiedBadIv, maxLevel]);

	// ---- "Find Tradeable" mode ----
	const [isCalculatingTrade, setIsCalculatingTrade] = useState(false);
	const [tradeResult, setTradeResult] = useState('');

	// Same shape as `badIvCarveOuts` above: purely species-stat-driven (never
	// depends on `gl`/`cp`/the category toggles/the whitelist/the rank
	// cutoffs), so it's cached indefinitely and only ever recomputed when the
	// Best Buddy toggle changes. Deliberately its own separate query from
	// `badIvCarveOuts` — this one skips the expensive Shadow-purify pass
	// entirely, which `findBadIvCarveOuts` can't do (the other two tabs
	// genuinely need it), so sharing one query would force this tab to pay
	// for work it structurally never needs.
	const { data: tradeableSpeciesData } = useQuery({
		enabled: isCalculatingTrade && fetchCompleted && speciesSearchMetadataFetchCompleted,
		queryKey: ['tradeable-species-data', maxLevel, speciesSearchMetadataCount],
		queryFn: () => getComputeWorker().findTradeableSpeciesData({ gamemasterPokemon, speciesSearchMetadata, maxLevel }),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	// See `setBadIvResult`'s own comment above — `tradeableSpeciesData` is
	// likewise keyed on `maxLevel`, so the Best Buddy toggle must invalidate
	// this result too.
	useEffect(() => {
		setTradeResult('');
	}, [
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
		gl,
		raidMetric,
		protect,
		whitelist,
		tradeOnlyLowIv,
		cp,
		maxLevel,
	]);

	useEffect(() => {
		if (
			!isCalculatingTrade ||
			!fetchCompleted ||
			!pvpFetchCompleted ||
			!raidDPSFetchCompleted ||
			!movesFetchCompleted ||
			!tradeableSpeciesData
		) {
			return;
		}
		const id = window.setTimeout(() => {
			setTradeResult(
				computeTradeableString(
					gamemasterPokemon,
					speciesSearchMetadata,
					rankLists as unknown as ComputeArgs['rankLists'],
					raidDPS,
					raidMetric,
					gl,
					trashGreat,
					trashUltra,
					trashMaster,
					trashRaid,
					tradeableSpeciesData,
					protect,
					whitelistSet,
					tradeOnlyLowIv,
					cp
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
		tradeableSpeciesData,
		gamemasterPokemon,
		speciesSearchMetadata,
		rankLists,
		raidDPS,
		raidMetric,
		gl,
		trashGreat,
		trashUltra,
		trashMaster,
		trashRaid,
		protect,
		whitelistSet,
		tradeOnlyLowIv,
		cp,
	]);

	const isBadIv = mode === 'badIv';
	const activeResult = isBadIv ? badIvResult : isTrade ? tradeResult : result;
	const activeCalculating = isBadIv ? isCalculatingBadIv : isTrade ? isCalculatingTrade : isCalculating;

	const copy = () => {
		if (!activeResult) return;
		void navigator.clipboard?.writeText(activeResult);
		outRef.current?.select();
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1400);
	};

	const ready =
		fetchCompleted &&
		speciesSearchMetadataFetchCompleted &&
		movesFetchCompleted &&
		pvpFetchCompleted &&
		raidDPSFetchCompleted;

	// On the Trade tab, "Shadow" and "Mythical" are always effectively
	// protected (see the locked-on chips below) regardless of the stored
	// `protect.shadow`/`protect.mythical` flags — the summary has to agree
	// with what the chips themselves show, or it'd read as if they weren't
	// being protected at all.
	const protectionMeta = useMemo(
		() => PROTECTION_META_TRANSLATORS.map(({ key, translate }) => ({ key, ...translate(t, gl) })),
		[t, gl]
	);

	const protectionSummary = protectionMeta
		.filter((m) => (isTrade && (m.key === 'shadow' || m.key === 'mythical')) || protect[m.key])
		.map((m) => m.label)
		.join(', ');
	const nothingExtra = t('massDelete:panelSummary.nothingExtra');
	const keepTopSummary = [
		t('massDelete:panelSummary.topGreat', { n: trashGreat }),
		t('massDelete:panelSummary.topUltra', { n: trashUltra }),
		t('massDelete:panelSummary.topMaster', { n: trashMaster }),
		t('massDelete:panelSummary.topRaid', { n: trashRaid, raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) }),
	].join(' · ');
	const tradeTopSummary = [
		t('massDelete:panelSummary.topGreat', { n: trashGreat }),
		t('massDelete:panelSummary.topUltra', { n: trashUltra }),
		t('massDelete:panelSummary.topMaster', { n: trashMaster }),
		t('massDelete:panelSummary.topRaid', { n: trashRaid, raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) }),
	].join(' · ');
	const panelSummary = isBadIv
		? `${t('massDelete:panelSummary.cpKept', { cpValue: cp.toLocaleString(), cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })}${simplifiedBadIv ? ` · ${t('massDelete:panelSummary.simplifiedModeSuffix')}` : ''} · ${t('massDelete:panelSummary.protectsList', { list: protectionSummary || nothingExtra })}`
		: isTrade
			? `${tradeTopSummary}${tradeOnlyLowIv ? ` · ${t('massDelete:panelSummary.onlyClearlyLowIvs')}` : ''} · ${t('massDelete:panelSummary.cpUnder', { cpValue: cp.toLocaleString(), cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })} · ${t('massDelete:panelSummary.excludesList', { list: protectionSummary || nothingExtra })}`
			: `${keepTopSummary} · ${t('massDelete:panelSummary.cpKept', { cpValue: cp.toLocaleString(), cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })}${simplifiedTrash ? ` · ${t('massDelete:panelSummary.simplifiedModeSuffix')}` : ''} · ${t('massDelete:panelSummary.protectsList', { list: protectionSummary || nothingExtra })}`;

	const whitelistSummary =
		whitelistChipsManual.length === 0 && whitelistChipsAuto.length === 0
			? t('massDelete:whitelist.summaryEmpty')
			: [
					whitelistChipsManual.length > 0 &&
						t('massDelete:whitelist.summaryManual', { count: whitelistChipsManual.length }),
					whitelistChipsAuto.length > 0 && t('massDelete:whitelist.summaryAuto', { count: whitelistChipsAuto.length }),
				]
					.filter(Boolean)
					.join(' · ');

	const isDefaultProtection = (Object.keys(protect) as Array<keyof ProtectionFlags>).every(
		(k) => protect[k] === DEFAULT_PROTECTION[k]
	);
	const panelDirty =
		!isDefaultProtection ||
		cp !== 2500 ||
		(mode !== 'badIv' && (trashMaster !== 110 || trashRaid !== 5)) ||
		((mode === 'meta' || isTrade) && (trashGreat !== 50 || trashUltra !== 50)) ||
		(isTrade && tradeOnlyLowIv) ||
		(isBadIv && simplifiedBadIv) ||
		(mode === 'meta' && simplifiedTrash);
	const resetPanel = () => {
		setProtect(DEFAULT_PROTECTION);
		setCp(2500);
		if (mode !== 'badIv') {
			setTrashMaster(110);
			setTrashRaid(5);
		}
		if (mode === 'meta' || isTrade) {
			setTrashGreat(50);
			setTrashUltra(50);
		}
		if (isTrade) setTradeOnlyLowIv(false);
		if (isBadIv) setSimplifiedBadIv(false);
		if (mode === 'meta') setSimplifiedTrash(false);
	};

	const pageTitle = isBadIv
		? t('massDelete:pageTitle.badIv')
		: isTrade
			? t('massDelete:pageTitle.trade')
			: t('massDelete:pageTitle.meta');
	const activeHelpText = isBadIv
		? t('massDelete:helpText.badIv')
		: isTrade
			? t('massDelete:helpText.trade')
			: t('massDelete:helpText.meta');

	// This page depends on five separate dex-server feeds (gamemaster, moves,
	// PvP rankings, raid DPS, species-search-metadata) — three of them
	// multi-MB and none persisted to disk (see `PERSISTED_QUERY_KEY_PREFIXES`
	// in query-client.ts), so without this gate the page used to render its
	// full UI immediately with empty data and then silently jump to the real
	// thing once all five landed, with nothing on screen to explain the wait.
	if (!ready) {
		return (
			<div className='r-loading'>
				<div className='r-spinner' />
				{t('massDelete:loading')}
			</div>
		);
	}

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>{pageTitle}</h1>

			<div className='r-seg r-seg--wrap r-md-mode-seg' role='tablist' aria-label={t('massDelete:modeTablist')}>
				<button type='button' data-active={mode === 'meta'} onClick={() => setMode('meta')}>
					<i className='r-md-knob-full'>{t('massDelete:modeTabs.meta.full')}</i>
					<i className='r-md-knob-short'>{t('massDelete:modeTabs.meta.short')}</i>
				</button>
				<button type='button' data-active={isBadIv} onClick={() => setMode('badIv')}>
					<i className='r-md-knob-full'>{t('massDelete:modeTabs.badIv.full')}</i>
					<i className='r-md-knob-short'>{t('massDelete:modeTabs.badIv.short')}</i>
				</button>
				<button type='button' data-active={isTrade} onClick={() => setMode('trade')}>
					<i className='r-md-knob-full'>{t('massDelete:modeTabs.trade.full')}</i>
					<i className='r-md-knob-short'>{t('massDelete:modeTabs.trade.short')}</i>
				</button>
			</div>

			{isBadIv && (
				<div className='r-card r-md-warning'>
					<p style={{ margin: 0 }}>⚠️ {t('massDelete:badIvWarning')}</p>
				</div>
			)}

			<div className='r-card r-md-help'>
				<p className={helpOpen ? '' : 'r-md-help-clamp'}>{activeHelpText}</p>
				<button type='button' className='r-md-more' onClick={() => setHelpOpen((v) => !v)}>
					{helpOpen ? t('massDelete:readLess') : t('massDelete:readMore')}
				</button>
			</div>

			<div className='r-section-h'>{t('massDelete:configuration')}</div>
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
							{panelOpen ? t('massDelete:hide') : t('massDelete:edit')}
						</span>
					</button>
					{panelDirty && (
						<button type='button' className='r-ctr-config-clear' onClick={resetPanel}>
							{t('massDelete:reset')}
						</button>
					)}
				</div>

				{panelOpen && (
					<div className='r-ctr-panel'>
						{mode === 'meta' && (
							<>
								<p className='r-ctr-cond-hint r-md-knobs-subtitle'>{t('massDelete:metaKnobsSubtitle')}</p>
								<div className='r-md-knobs-grid r-md-knobs-grid--4up'>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/great.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{gameTranslator(GameTranslatorKeys.GreatLeagueLong, gl)}</i>
											<i className='r-md-knob-short'>{gameTranslator(GameTranslatorKeys.GreatLeagueShort, gl)}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopGreat')}
											value={trashGreat}
											onChange={setTrashGreat}
											count={2000}
										/>
									</div>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/ultra.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{gameTranslator(GameTranslatorKeys.UltraLeagueLong, gl)}</i>
											<i className='r-md-knob-short'>{gameTranslator(GameTranslatorKeys.UltraLeagueShort, gl)}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopUltra')}
											value={trashUltra}
											onChange={setTrashUltra}
											count={2000}
										/>
									</div>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/master.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{gameTranslator(GameTranslatorKeys.MasterLeagueLong, gl)}</i>
											<i className='r-md-knob-short'>{gameTranslator(GameTranslatorKeys.MasterLeagueShort, gl)}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopMaster')}
											value={trashMaster}
											onChange={setTrashMaster}
											count={2000}
										/>
									</div>
									<div className='r-md-knob r-md-raid-inline'>
										<span>
											<img src='/images/tx_raid_coin.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{t('massDelete:knobs.raidAttackers.full', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}</i>
											<i className='r-md-knob-short'>{t('massDelete:knobs.raidAttackers.short', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopRaid')}
											value={trashRaid}
											onChange={setTrashRaid}
											count={2000}
										/>
									</div>
								</div>
								{/* Row 2: Wide has CP + Toggle. Narrow has CP + Raid + Toggle */}
								<div className='r-md-row-2'>
									<div className='r-md-knob'>
										<span>{t('massDelete:knobs.saveCp', { cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })}</span>
										<select
											className='r-md-select'
											aria-label={t('massDelete:knobs.saveCp', { cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })}
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
									<div className='r-md-knob r-md-raid-cp'>
										<span>
											<img src='/images/tx_raid_coin.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{t('massDelete:knobs.raidAttackers.full', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}</i>
											<i className='r-md-knob-short'>{t('massDelete:knobs.raidAttackers.short', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopRaid')}
											value={trashRaid}
											onChange={setTrashRaid}
											count={2000}
										/>
									</div>
									<div className='r-md-knob'>
										<span>{t('massDelete:knobs.simplifiedMode')}</span>
										<button
											type='button'
											className='r-ctr-toggle'
											data-on={simplifiedTrash ? '' : undefined}
											aria-pressed={simplifiedTrash}
											title={t('massDelete:simplifiedTrashTooltip')}
											onClick={() => setSimplifiedTrash((v) => !v)}
										>
											<span className='r-ss-box' aria-hidden='true' />
											{simplifiedTrash ? t('massDelete:toggleOn') : t('massDelete:toggleOff')}
										</button>
									</div>
								</div>
							</>
						)}

						{mode === 'badIv' && (
							<>
								<p className='r-ctr-cond-hint r-md-knobs-subtitle'>{t('massDelete:badIvKnobsSubtitle')}</p>
								<div className='r-md-knobs-grid r-md-knobs-grid--2up'>
									<div className='r-md-knob'>
										<span>{t('massDelete:knobs.saveCp', { cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })}</span>
										<select
											className='r-md-select'
											aria-label={t('massDelete:knobs.saveCp', { cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })}
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
									<div className='r-md-knob'>
										<span>{t('massDelete:knobs.simplifiedMode')}</span>
										<button
											type='button'
											className='r-ctr-toggle'
											data-on={simplifiedBadIv ? '' : undefined}
											aria-pressed={simplifiedBadIv}
											title={t('massDelete:simplifiedBadIvTooltip')}
											onClick={() => setSimplifiedBadIv((v) => !v)}
										>
											<span className='r-ss-box' aria-hidden='true' />
											{simplifiedBadIv ? t('massDelete:toggleOn') : t('massDelete:toggleOff')}
										</button>
									</div>
								</div>
							</>
						)}

						{isTrade && (
							<>
								<p className='r-ctr-cond-hint r-md-knobs-subtitle'>{t('massDelete:tradeKnobsSubtitle')}</p>
								<div className='r-md-knobs-grid r-md-knobs-grid--4up'>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/great.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{gameTranslator(GameTranslatorKeys.GreatLeagueLong, gl)}</i>
											<i className='r-md-knob-short'>{gameTranslator(GameTranslatorKeys.GreatLeagueShort, gl)}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopGreat')}
											value={trashGreat}
											onChange={setTrashGreat}
											count={2000}
										/>
									</div>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/ultra.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{gameTranslator(GameTranslatorKeys.UltraLeagueLong, gl)}</i>
											<i className='r-md-knob-short'>{gameTranslator(GameTranslatorKeys.UltraLeagueShort, gl)}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopUltra')}
											value={trashUltra}
											onChange={setTrashUltra}
											count={2000}
										/>
									</div>
									<div className='r-md-knob'>
										<span>
											<img src='/images/leagues/master.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{gameTranslator(GameTranslatorKeys.MasterLeagueLong, gl)}</i>
											<i className='r-md-knob-short'>{gameTranslator(GameTranslatorKeys.MasterLeagueShort, gl)}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopMaster')}
											value={trashMaster}
											onChange={setTrashMaster}
											count={2000}
										/>
									</div>
									<div className='r-md-knob r-md-raid-inline'>
										<span>
											<img src='/images/tx_raid_coin.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{t('massDelete:knobs.raidAttackers.full', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}</i>
											<i className='r-md-knob-short'>{t('massDelete:knobs.raidAttackers.short', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopRaid')}
											value={trashRaid}
											onChange={setTrashRaid}
											count={2000}
										/>
									</div>
								</div>
								{/* Row 2: Wide has CP + Toggle. Narrow has CP + Raid + Toggle */}
								<div className='r-md-row-2'>
									<div className='r-md-knob'>
										<span>{t('massDelete:knobs.saveCp', { cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })}</span>
										<select
											className='r-md-select'
											aria-label={t('massDelete:knobs.saveCp', { cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl) })}
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
									<div className='r-md-knob r-md-raid-cp'>
										<span>
											<img src='/images/tx_raid_coin.png' alt='' width={20} height={20} />
											<i className='r-md-knob-full'>{t('massDelete:knobs.raidAttackers.full', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}</i>
											<i className='r-md-knob-short'>{t('massDelete:knobs.raidAttackers.short', { raid: gameTranslator(GameTranslatorKeys.RaidDisplay, gl) })}</i>
										</span>
										<NumSelect
											label={t('massDelete:knobs.ariaKeepTopRaid')}
											value={trashRaid}
											onChange={setTrashRaid}
											count={2000}
										/>
									</div>
									<div className='r-md-knob'>
										<span>{t('massDelete:knobs.keep3StarPokemon')}</span>
										<button
											type='button'
											className='r-ctr-toggle'
											data-on={tradeOnlyLowIv ? '' : undefined}
											aria-pressed={tradeOnlyLowIv}
											title={t('massDelete:tradeOnlyLowIvTooltip')}
											onClick={() => setTradeOnlyLowIv((v) => !v)}
										>
											<span className='r-ss-box' aria-hidden='true' />
											{tradeOnlyLowIv ? t('massDelete:toggleOn') : t('massDelete:toggleOff')}
										</button>
									</div>
								</div>
							</>
						)}

						<div className='r-section-h' style={{ marginTop: 4 }}>
							{isTrade ? t('massDelete:neverSuggestCategory') : t('massDelete:neverDeleteCategory')}
						</div>
						<div className='r-md-protect-grid'>
							{protectionMeta.map((m) => {
								// Trading a Shadow or Mythical Pokémon isn't something the
								// game allows at all, regardless of its IVs —
								// computeTradeableString excludes every Shadow and Mythical
								// catch unconditionally, so these two toggles have nothing
								// left to control there and are locked on to reflect that,
								// rather than implying they're optional.
								const lockedOn = isTrade && (m.key === 'shadow' || m.key === 'mythical');
								return (
									<button
										key={m.key}
										type='button'
										className='r-ctr-toggle r-md-protect-chip'
										data-on={lockedOn || protect[m.key] ? '' : undefined}
										aria-pressed={lockedOn || protect[m.key]}
										disabled={lockedOn}
										title={lockedOn ? t('massDelete:lockedOnTitle', { label: m.label }) : m.description}
										onClick={lockedOn ? undefined : () => setProtectFlag(m.key)}
									>
										<span className='r-ss-box' aria-hidden='true' />
										{m.label}
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>

			<div className='r-section-h'>
				{isTrade ? t('massDelete:neverSuggestPokemon') : t('massDelete:neverDeletePokemon')}
			</div>
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
							{wlOpen ? t('massDelete:hide') : t('massDelete:edit')}
						</span>
					</button>
				</div>
				{wlOpen && (
					<div className='r-ctr-panel'>
						<WhitelistSearch
							gamemasterPokemon={gamemasterPokemon}
							exclude={whitelistSearchExclude}
							onPick={addToWhitelist}
							placeholder={
								isTrade
									? t('massDelete:whitelist.searchPlaceholderTrade')
									: t('massDelete:whitelist.searchPlaceholderMeta')
							}
						/>
						<div className='r-md-wl-chips'>
							{whitelistChipsManual.length === 0 && whitelistChipsAuto.length === 0 && (
								<p className='r-muted' style={{ margin: 0 }}>
									{isTrade ? t('massDelete:whitelist.emptyTrade') : t('massDelete:whitelist.emptyMeta')}
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
				disabled={activeCalculating}
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
				{activeCalculating ? t('massDelete:computing') : t('massDelete:compute')}
			</button>

			<textarea
				ref={outRef}
				className='r-md-out'
				readOnly
				value={activeCalculating ? t('massDelete:computingMessage') : activeResult}
				placeholder={isTrade ? t('massDelete:outputPlaceholderTrade') : t('massDelete:outputPlaceholderMeta')}
				onClick={copy}
			/>
			{activeResult && !activeCalculating && (
				<p className={`r-md-length-hint${activeResult.length > 5000 ? ' r-md-length-hint--warn' : ''}`}>
					{t('massDelete:characterCount', {
						count: activeResult.length,
						formatted: activeResult.length.toLocaleString(),
					})}
					{activeResult.length > 5000 &&
						(isTrade ? t('massDelete:lengthWarningTrade') : t('massDelete:lengthWarningMeta'))}
				</p>
			)}
			{activeResult && (
				<button type='button' className='r-md-copy' onClick={copy}>
					{copied ? t('massDelete:copied') : t('massDelete:copySearchString')}
				</button>
			)}
		</div>
	);
};

export default MassDelete;

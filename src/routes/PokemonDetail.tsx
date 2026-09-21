import type { TFunction } from 'i18next';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { IvPicker, type IVs } from '../components/IvPicker';
import { ShadowMark } from '../components/ShadowMark';
import { goSpriteUrl, handleSpriteError, Sprite, spriteUrl } from '../components/Sprite';
import { Stepper } from '../components/Stepper';
import { useBestBuddy } from '../contexts/best-buddy-context';
import { useImageSource } from '../contexts/imageSource-context';
import { useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IIvPercents } from '../DTOs/ivs';
import { useBestIvs } from '../hooks/useBestIvs';
import useComputeIVs from '../hooks/useComputeIVs';
import { fmtMult, isDoubleMult, typeMatchups } from '../lib/effectiveness';
import { cleanName, dec1, dexNo, ordinal, rankPerfection, sentenceCase } from '../lib/format';
import { R } from '../lib/nav';
import { fmtRaidMetric, RAID_METRIC_LABEL, raidRankOf } from '../lib/raid-metric';
import { accentStyle, typeKey, typeVar } from '../lib/types';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { type DPSEntry, useRaidRanker } from '../queries/raid-ranker';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../utils/GameTranslator';
import {
	calculateCP,
	computeDPSEntry,
	fetchPokemonFamily,
	fetchReachablePokemonIncludingSelf,
	levelToLevelIndex,
	MAX_LEVEL,
	type RankEntry,
	sortByFamilyLine,
} from '../utils/pokemon-helper';
import CountersTab from './pokemon/CountersTab';
import IvTableTab from './pokemon/IvTableTab';
import MovesTab from './pokemon/MovesTab';
import SearchStringsTab from './pokemon/SearchStringsTab';

/** Just the layout facts (id/colour) — display text is translated inside the
 *  component (see LEAGUES there) since it needs the t() hook. */
const LEAGUE_META = [
	{ id: 0, cssVar: 'var(--lg-great)' },
	{ id: 1, cssVar: 'var(--lg-ultra)' },
	{ id: 2, cssVar: 'var(--lg-master)' },
	{ id: 3, cssVar: 'var(--lg-raid)' },
] as const;
type LeagueId = 0 | 1 | 2 | 3;
type PvpLeague = 0 | 1 | 2;

/** `?lg=` on the URL — set when you arrive from a league / raid ranking. */
const LG_PARAM: Record<string, LeagueId> = { great: 0, ultra: 1, master: 2, raid: 3 };
const LG_SLUG: Record<LeagueId, string> = { 0: 'great', 1: 'ultra', 2: 'master', 3: 'raid' };
const LG_ICON: Record<LeagueId, string> = {
	0: '/images/leagues/great.png',
	1: '/images/leagues/ultra.png',
	2: '/images/leagues/master.png',
	3: '/images/raids/tier-5.png',
};
/** PvP CP cap per `PvpLeague` — Master has none. */
const PVP_CP_CAP: Record<PvpLeague, number> = { 0: 1500, 1: 2500, 2: Number.MAX_VALUE };

const TABS = [
	['Ranks', 'ranks'],
	['Moves', 'moves'],
	['Counters', 'counters'],
	['IV Table', 'iv-table'],
	['Strings', 'strings'],
] as const;
type TabLabel = (typeof TABS)[number][0];
const SLUG_TO_TAB = Object.fromEntries(TABS.map(([label, slug]) => [slug, label])) as Record<string, TabLabel>;

// Renders a t() call with one or more of its interpolated values wrapped in
// a colored <b>, regardless of where the translated sentence actually places
// them (word order varies per locale — see bestSpreadFor/bestSpreadsForCount
// call sites below). Works by interpolating a unique sentinel for each
// colored param, then splitting the RESULT string on those sentinels — so
// this never needs to know/guess the sentence's own structure per locale.
const renderWithColoredParams = (
	t: TFunction,
	key: string,
	colored: Record<string, { value: string; color: string }>
): Array<ReactNode> => {
	const sentinelValues = Object.fromEntries(Object.keys(colored).map((k) => [k, `\u0001${k}\u0001`]));
	const raw = t(key, sentinelValues);
	// A literal U+0001 sentinel can't collide with real translation text — the
	// control character itself is the point (see the doc comment above).
	// eslint-disable-next-line no-control-regex
	const parts = raw.split(/\u0001(\w+)\u0001/);
	// `<span>`, not `<b>` — `.r-readout b` (and similar sibling rules) style
	// any bold element by tag, not class, so a `<b>` here would silently pick
	// up whatever unrelated bold styling (e.g. the big Fredoka rank-number
	// font) happens to apply in that container, not just the color this is
	// actually here to add.
	return parts.map((part, i) =>
		i % 2 === 1 ? (
			<span key={i} style={{ color: colored[part].color, fontWeight: 700 }}>
				{colored[part].value}
			</span>
		) : (
			part
		)
	);
};

const leagueSlice = (ivp: IIvPercents | undefined, id: PvpLeague) => {
	if (!ivp) return undefined;
	switch (id) {
		case 0:
			return {
				rank: ivp.greatLeagueRank,
				cp: ivp.greatLeagueCP,
				lvl: ivp.greatLeagueLvl,
				battle: { A: ivp.greatLeagueAttack, D: ivp.greatLeagueDefense, S: ivp.greatLeagueHP },
				perfect: ivp.greatLeaguePerfect,
				perfectCP: ivp.greatLeaguePerfectCP,
				perfectLvl: ivp.greatLeaguePerfectLevel,
				perfectBattle: ivp.greatLeaguePerfectBattle,
			};
		case 1:
			return {
				rank: ivp.ultraLeagueRank,
				cp: ivp.ultraLeagueCP,
				lvl: ivp.ultraLeagueLvl,
				battle: { A: ivp.ultraLeagueAttack, D: ivp.ultraLeagueDefense, S: ivp.ultraLeagueHP },
				perfect: ivp.ultraLeaguePerfect,
				perfectCP: ivp.ultraLeaguePerfectCP,
				perfectLvl: ivp.ultraLeaguePerfectLevel,
				perfectBattle: ivp.ultraLeaguePerfectBattle,
			};
		default:
			return {
				rank: ivp.masterLeagueRank,
				cp: ivp.masterLeagueCP,
				lvl: ivp.masterLeagueLvl,
				battle: { A: ivp.masterLeagueAttack, D: ivp.masterLeagueDefense, S: ivp.masterLeagueHP },
				perfect: ivp.masterLeaguePerfect,
				perfectCP: ivp.masterLeaguePerfectCP,
				perfectLvl: ivp.masterLeaguePerfectLevel,
				perfectBattle: ivp.masterLeaguePerfectBattle,
			};
	}
};

const PokemonDetail = () => {
	const { t } = useTranslation(['pokemonDetail']);
	const { speciesId = '', tab: tabParam } = useParams();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const { imageSource } = useImageSource();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { moves, movesFetchCompleted } = useMoves();
	const { currentGameLanguage: gl, currentLanguage } = useLanguage();
	// which figure (DPS/TDO) ranks raid attackers — the same device-wide
	// setting Rankings' raid tab and the Counters tab use.
	const { raidMetric } = useRaidMetric();
	const { maxLevel, maxLevelIndex } = useBestBuddy();

	// Display text for the four league/mode segments — LEAGUE_META (module
	// scope) carries the stable id/colour. League names track the player's
	// in-game language (GameLanguage), not the website UI's.
	const LEAGUES = [
		{
			...LEAGUE_META[0],
			label: gameTranslator(GameTranslatorKeys.GreatLeagueShort, gl),
			full: gameTranslator(GameTranslatorKeys.GreatLeagueLong, gl),
		},
		{
			...LEAGUE_META[1],
			label: gameTranslator(GameTranslatorKeys.UltraLeagueShort, gl),
			full: gameTranslator(GameTranslatorKeys.UltraLeagueLong, gl),
		},
		{
			...LEAGUE_META[2],
			label: gameTranslator(GameTranslatorKeys.MasterLeagueShort, gl),
			full: gameTranslator(GameTranslatorKeys.MasterLeagueLong, gl),
		},
		{
			...LEAGUE_META[3],
			label: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
			full: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
		},
	];
	// Visible tab text, keyed by the (stable, English, comparison-only) slug —
	// TABS/SLUG_TO_TAB/TabLabel above stay untouched since `tab === 'Moves'`
	// etc. is used as an internal state key throughout this component, not
	// display text.
	const TAB_LABEL: Record<string, string> = {
		'ranks': t('pokemonDetail:tabs.ranks'),
		'moves': t('pokemonDetail:tabs.moves'),
		'counters': t('pokemonDetail:tabs.counters'),
		'iv-table': t('pokemonDetail:tabs.ivTable'),
		'strings': t('pokemonDetail:tabs.strings'),
	};

	const pokemon = fetchCompleted ? gamemasterPokemon[speciesId] : undefined;
	const tab: TabLabel = SLUG_TO_TAB[tabParam ?? 'ranks'] ?? 'Ranks';

	const lgParam = searchParams.get('lg') ?? '';
	// Never actually shown — `heroReady` keeps the picker/CP/level hidden behind
	// a spinner until the real best-reachable spread lands — but pick the least
	// misleading placeholder anyway, for the instant between mount and the
	// first render/layout-effect pass.
	const [iv, setIv] = useState<IVs>({ atk: 0, def: 0, hp: 0 });
	const [level, setLevel] = useState(maxLevel);
	// Best Buddy toggled off mid-session with the picker above the old ceiling —
	// clamp back down rather than leaving it at an unreachable level.
	useEffect(() => setLevel((l) => Math.min(l, maxLevel)), [maxLevel]);
	// The league lives in `?lg=`, not local state — reloading (or sharing/
	// bookmarking the URL) lands back on whichever league you were last
	// looking at, not always Great. Arriving from a league/raid ranking sets
	// this the same way (it's the same param), and any in-page switch (tabs,
	// leaderboard rows, cycling the sprite type on a raid row…) just rewrites
	// it via `setLeague` below instead of touching separate component state.
	const league: LeagueId = LG_PARAM[lgParam] ?? 0;
	const setLeague = (id: LeagueId) => {
		const next = new URLSearchParams(searchParams);
		next.set('lg', LG_SLUG[id]);
		setSearchParams(next, { replace: true });
	};
	const [heroSpriteIdx, setHeroSpriteIdx] = useState(0);
	// Default (and re-sync point) for the hero carousel: whichever sprite the
	// "Sprites" setting prefers, not always the official artwork — landing on a
	// new Pokémon, or flipping the setting while already here, both snap the
	// hero (and its mini topbar echo, and the hint dots below it, which just
	// track this same index) back to that preference. A manual tap/swipe still
	// freely cycles from there. Guarded for `pokemon` still being undefined
	// mid-fetch — `fetchCompleted` in the deps re-fires this once it lands.
	useLayoutEffect(() => {
		if (!pokemon) return;
		const sprites = [
			...new Set(
				[pokemon.imageUrl, goSpriteUrl(pokemon.goImageUrl), goSpriteUrl(pokemon.shinyGoImageUrl)].filter(Boolean)
			),
		];
		setHeroSpriteIdx(Math.max(0, sprites.indexOf(spriteUrl(pokemon, imageSource))));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [speciesId, imageSource, fetchCompleted]);
	const isRaid = league === 3;

	// IV percents for the whole reachable family — the "Your IVs" card shows whichever
	// member the league carousel is on (best reachable by default, not the URL mon).
	const [ivPercents, , ivStale] = useComputeIVs({
		pokemon: pokemon as never,
		attackIV: iv.atk,
		defenseIV: iv.def,
		hpIV: iv.hp,
	});

	// Whole evolution family for the picker — same rule as the legacy site:
	// predecessors + the full line, restricted to this Pokémon's shadow-ness —
	// ordered like the evolution chain reads (see `sortByFamilyLine`'s own doc
	// comment for the full "why" — branches, depth, Megas-last, the Wooper/
	// Clodsire shared-dex edge case).
	const family = useMemo(() => {
		if (!pokemon) return [];
		return sortByFamilyLine([...fetchPokemonFamily(pokemon, gamemasterPokemon)], gamemasterPokemon);
	}, [pokemon, gamemasterPokemon]);

	// Forward-reachable only (you can't devolve) — what "best reachable" means.
	const reachablePvp = useMemo(
		() => (pokemon ? Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon)) : []),
		[pokemon, gamemasterPokemon]
	);
	const reachableRaid = useMemo(
		() => (pokemon ? Array.from(fetchReachablePokemonIncludingSelf(pokemon, gamemasterPokemon, undefined, true)) : []),
		[pokemon, gamemasterPokemon]
	);

	// Ordered "best reachable" candidates per league/raid — same idea as the legacy site.
	const boardData = useMemo(() => {
		const self = pokemon?.speciesId ?? '';
		const pvpList = (idx: number) =>
			[...reachablePvp]
				.filter((p) => p.speciesId === self || rankLists[idx]?.[p.speciesId]?.rank != null)
				.sort((a, b) => {
					const ra = rankLists[idx]?.[a.speciesId]?.rank;
					const rb = rankLists[idx]?.[b.speciesId]?.rank;
					if (ra == null && rb == null) return a.speciesId.localeCompare(b.speciesId);
					if (ra == null) return 1;
					if (rb == null) return -1;
					return ra - rb;
				});

		// every attacking-type list this species is ranked in, best rank first
		// under whichever figure (DPS/TDO) is currently chosen — dex-server
		// bakes in both per entry precisely so this doesn't have to re-rank
		// the list itself just to switch metrics (see `raidRankOf`).
		// `raidDPS` never has a 'normal' entry at all any more (see useRaidRanker:
		// Normal is the only type with zero super-effective matchups against
		// anything, so dex-server doesn't generate that ranking), so no explicit
		// filtering for it is needed here.
		const rankedTypes = (p: IGamemasterPokemon) =>
			Object.entries(raidDPS)
				.filter(([t]) => t !== '')
				.map(([type, list]) => ({ type, entry: list[p.speciesId] as DPSEntry | undefined }))
				.filter((x): x is { type: string; entry: DPSEntry } => !!x.entry)
				.map((x) => ({ ...x, rank: raidRankOf(x.entry, raidMetric) ?? Number.POSITIVE_INFINITY }))
				.sort((a, b) => a.rank - b.rank);

		const raid = [...reachableRaid]
			.map((p) => ({ p, types: rankedTypes(p) }))
			.sort((a, b) => {
				const ra = a.types[0]?.rank ?? Number.POSITIVE_INFINITY;
				const rb = b.types[0]?.rank ?? Number.POSITIVE_INFINITY;
				return ra - rb || a.p.speciesId.localeCompare(b.p.speciesId);
			});

		return { pvp: [pvpList(0), pvpList(1), pvpList(2)], raid };
	}, [pokemon, reachablePvp, reachableRaid, rankLists, raidDPS, raidMetric]);

	// Carousel positions: p = which reachable Pokémon, t = which raid type,
	// m[type] = which fast+charged combo for that type.
	type Cpos = { p: number; t: number; m: Record<string, number> };
	const [carousel, setCarousel] = useState<Record<number, Cpos>>({});
	useEffect(() => setCarousel({}), [speciesId]);
	const cpos = (id: number): Cpos => carousel[id] ?? { p: 0, t: 0, m: {} };
	const candLen = (id: number) => (id === 3 ? boardData.raid.length : (boardData.pvp[id]?.length ?? 0));

	// "Your IVs" follows the PvP carousel (best reachable by default), not the URL mon.
	// Index with `pvpLeague`, not `league` — while on the raid tab `league` is 3,
	// which would index into `pvpCandidates` (always a PvP league's list) with
	// whatever position the *raid* carousel happens to be on, picking an
	// unrelated species out of the PvP list.
	const pvpLeague: PvpLeague = isRaid ? 0 : (league as PvpLeague);
	const pvpCandidates = boardData.pvp[pvpLeague] ?? [];
	const pvpMember = pvpCandidates[Math.min(cpos(pvpLeague).p, Math.max(0, pvpCandidates.length - 1))] ?? pokemon;
	const slice = !isRaid ? leagueSlice(ivPercents[pvpMember?.speciesId ?? ''], pvpLeague) : undefined;
	// All 4,096 spreads, brute-forced locally (same computation IvTableTab's
	// own list uses) — `slice.perfect` above is only ever ONE rank-1 spread
	// from the precomputed server dataset, but several spreads can genuinely
	// tie for rank 1 (same rounded stat product); this is what lets the
	// summary below list every one of them instead of picking just one.
	const bestIvRows = useBestIvs(pvpMember, PVP_CP_CAP[pvpLeague], !isRaid);
	const tiedBestSpreads = useMemo(() => {
		if (bestIvRows.length === 0) return [];
		const prodOf = (r: RankEntry) => Math.round(r.battle.A * r.battle.D * r.battle.S);
		const topProd = prodOf(bestIvRows[0]);
		return bestIvRows.filter((r) => prodOf(r) === topProd);
	}, [bestIvRows]);
	// Viewing a Shadow whose best reachable candidate isn't one: the picker
	// asks for *this Shadow's own* IVs, not the target's — so the IV/CP/rank
	// math already assumes the +2-per-stat purification bonus (see the worker),
	// and the default/preset spread has to subtract it back out, or "the
	// Shadow's IVs to reach a 100% target" would show the target's own IVs.
	const purifyOffset = pokemon?.isShadow && pvpMember && !pvpMember.isShadow ? 2 : 0;
	// A target IV of 15 is still reached by a Shadow IV of 13, 14, *or* 15 —
	// purification caps at 15, it doesn't overflow past it. Showing 15 (not 13)
	// in that case reads as "needs max", which is what's actually true, instead
	// of implying 13 is the one exact value required.
	const purifiedIv = (v: number) => (v >= 15 ? 15 : Math.max(0, v - purifyOffset));

	// Once the user has dragged the IV picker or the level stepper themselves,
	// their spread wins from then on — switching league, cycling "best
	// reachable", or hopping to another family member no longer overwrites it.
	// Only landing here fresh from a genuinely different page (Rankings, the
	// Pokédex, search, …) re-arms the auto-pick; family-line/shadow-toggle
	// navigation suppresses that reset via `suppressIvResetRef`, set right
	// before those specific `navigate()`/`Link` calls.
	const ivTouchedRef = useRef(false);
	const suppressIvResetRef = useRef(false);
	const prevSpeciesIdRef = useRef(speciesId);
	useLayoutEffect(() => {
		if (prevSpeciesIdRef.current === speciesId) return;
		prevSpeciesIdRef.current = speciesId;
		if (suppressIvResetRef.current) {
			suppressIvResetRef.current = false;
		} else {
			ivTouchedRef.current = false;
		}
	}, [speciesId]);

	// On load and whenever the league (or carouseled member) changes, snap the IV
	// spread to that league's rank-1 spread AND the level that hits its CP cap with
	// that spread (the "… CP at LX" from the readout) — unless the user's already
	// picked their own spread (see `ivTouchedRef` above). A layout effect, not a
	// plain one: `heroReady` below turns on the instant `slice.perfect` exists,
	// and a plain effect only runs after that frame has already painted — so
	// updating `iv`/`level` here has to happen before paint too, or "ready"
	// would show one frame of the still-stale spread before this catches up.
	const perfectKey = slice ? `${slice.perfect.A}-${slice.perfect.D}-${slice.perfect.S}-${slice.perfectLvl}` : '';
	useLayoutEffect(() => {
		if (!slice?.perfect || ivTouchedRef.current) return;
		setIv({
			atk: purifiedIv(slice.perfect.A),
			def: purifiedIv(slice.perfect.D),
			hp: purifiedIv(slice.perfect.S),
		});
		if (slice.perfectLvl) setLevel(slice.perfectLvl);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [league, pvpMember?.speciesId, perfectKey, purifyOffset]);

	const onManualIvChange = (v: IVs) => {
		ivTouchedRef.current = true;
		setIv(v);
	};
	const onManualLevelChange = (v: number) => {
		ivTouchedRef.current = true;
		setLevel(v);
	};

	// Switching to a different league always lands on its rank-1 (best reachable)
	// candidate — any carousel position cycled into on a *previous* visit to
	// that league gets cleared, not just the currently active one, so nothing
	// stale carries over regardless of which control (leaderboard row, or the
	// league tabs below) you use to switch.
	const selectLeague = (id: LeagueId) => {
		setCarousel({});
		setLeague(id);
	};
	const cycleRow = (id: LeagueId) => {
		if (league === id) {
			const len = candLen(id);
			setCarousel((c) => ({ ...c, [id]: { p: len ? ((c[id]?.p ?? 0) + 1) % len : 0, t: 0, m: {} } }));
		} else {
			selectLeague(id);
		}
	};
	// leaving a raid type resets its fast+charged combo back to the best one
	const withTypeLeft = (cur: Cpos, nextT: number): Record<string, number> => {
		const types = boardData.raid[cur.p]?.types ?? [];
		if (!types.length) return cur.m;
		const leftIdx = Math.min(cur.t, types.length - 1);
		const nextIdx = Math.min(nextT, types.length - 1);
		const left = types[leftIdx]?.type;
		return left && leftIdx !== nextIdx ? { ...cur.m, [left]: 0 } : cur.m;
	};
	const cycleType = (e: ReactMouseEvent, id: LeagueId) => {
		e.stopPropagation();
		if (id !== 3) return;
		if (league !== 3) {
			setCarousel({});
			setLeague(3);
			return;
		}
		const len = boardData.raid[cpos(3).p]?.types.length ?? 0;
		setCarousel((c) => {
			const cur = c[3] ?? { p: 0, t: 0, m: {} };
			const nextT = len ? (cur.t + 1) % len : 0;
			return { ...c, [3]: { ...cur, t: nextT, m: withTypeLeft(cur, nextT) } };
		});
	};
	// mobile-only: `.r-board-type`'s medallion is a ~20px target — enough for a
	// mouse pointer, uncomfortably small for a fingertip. On a touch/no-hover
	// device, treat a tap anywhere on the sprite circle around it the same as
	// tapping the medallion; a mouse still only hits it directly, since the rest
	// of the sprite is still the row's own "cycle member" target there.
	const spriteClick = (e: ReactMouseEvent, id: LeagueId) => {
		if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
		cycleType(e, id);
	};
	const selectType = (i: number) => {
		if (league !== 3) setLeague(3);
		setCarousel((c) => {
			const cur = c[3] ?? { p: 0, t: 0, m: {} };
			return { ...c, [3]: { ...cur, t: i, m: withTypeLeft(cur, i) } };
		});
	};
	const cycleMove = (type: string, len: number) => {
		setCarousel((c) => {
			const cur = c[3] ?? { p: 0, t: 0, m: {} };
			return { ...c, [3]: { ...cur, m: { ...cur.m, [type]: len ? ((cur.m[type] ?? 0) + 1) % len : 0 } } };
		});
	};

	// fast+charged combos per attacking type for the carouseled raid member,
	// best-first by whichever metric is chosen.
	const comboLists = useMemo(() => {
		const out: Record<string, Array<{ f: string; c: string; dps: number; tdo: number }>> = {};
		const raid = boardData.raid;
		const sel = raid[Math.min(carousel[3]?.p ?? 0, Math.max(0, raid.length - 1))];
		if (!sel?.p || !movesFetchCompleted || Object.keys(moves).length === 0) return out;
		const member = sel.p;
		const charged = [...new Set([...member.chargedMoves, ...(member.extraChargedMoves ?? [])])];
		for (const { type } of sel.types) {
			const tc = charged.filter((id) => moves[id]?.type?.toLowerCase() === type);
			out[type] = member.fastMoves
				.flatMap((f) =>
					tc.map((c) => {
						const e = computeDPSEntry(member, gamemasterPokemon, moves, 15, maxLevelIndex, '', undefined, [f, c]);
						return { f, c, dps: e.dps, tdo: e.tdo };
					})
				)
				.sort((a, b) => b[raidMetric] - a[raidMetric])
				// only the best few combos — enough to compare, without an unreadable pip strip
				.slice(0, 5);
		}
		return out;
	}, [boardData, carousel, moves, movesFetchCompleted, gamemasterPokemon, raidMetric, maxLevelIndex]);

	const heroCp = useMemo(() => {
		if (!pokemon) return 0;
		return calculateCP(
			pokemon.baseStats.atk,
			iv.atk,
			pokemon.baseStats.def,
			iv.def,
			pokemon.baseStats.hp,
			iv.hp,
			levelToLevelIndex(level)
		);
	}, [pokemon, iv, level]);

	const matchups = useMemo(
		() => (pokemon ? typeMatchups(pokemon.types.map((t) => String(t))) : { weak: [], resist: [] }),
		[pokemon]
	);

	// Collapsing hero → a compact bar fades in under the app bar once you've
	// almost finished scrolling past the *whole* hero card, and fades back out
	// if you scroll back up past it. Plain boolean crossing of a single line
	// (the hero's bottom edge vs. the app bar), applied via a `data-visible`
	// attribute — the actual fade is a CSS transition, not JS interpolation.
	// That's deliberate: a value that only flips at one edge and lets CSS own
	// the animation can't flicker the way live 1:1 scroll-tracking could (a
	// tiny extra scroll right at the boundary used to interrupt an in-flight
	// tween and snap instead of finishing it) — restarting a CSS transition
	// mid-flight just reverses it smoothly, and if the page is too short to
	// ever cross the line, `data-visible` simply never flips and the bar never
	// renders at all, with no extra "is this page tall enough" check needed.
	const heroRef = useRef<HTMLElement>(null);
	const heroMiniRef = useRef<HTMLDivElement>(null);
	// The bar's JSX default is `data-visible='false'`, so the very first paint
	// is always hidden — the first real `update()` call is deliberately
	// deferred a frame (see below) rather than run synchronously, so nothing
	// ever overwrites that first paint before the browser has actually shown
	// it. `useLayoutEffect`, not `useEffect`, for the *listener setup*: this
	// component instance is reused across Pokémon (same route, React Router
	// doesn't remount it), and the bar's visibility lives on the DOM node
	// itself (`dataset.visible`, set imperatively — React never learns about
	// that mutation, so its own reconciliation never resets it), so the sooner
	// the scroll listener is attached the sooner a stale value from a previous
	// page gets corrected.
	useLayoutEffect(() => {
		const heroEl = heroRef.current;
		const miniEl = heroMiniRef.current;
		if (!heroEl || !miniEl) return;
		const isDesktop = () => window.innerWidth >= 900;

		let raf = 0;
		const update = () => {
			raf = 0;
			const appbarH = document.querySelector('.r-appbar')?.getBoundingClientRect().height ?? 60;
			const gap = isDesktop() ? 10 : 0;
			miniEl.style.top = `${appbarH + gap}px`;
			// Hard floor, unconditionally, before anything else: below this
			// depth the bar never renders, full stop — no matter what the
			// hero's measured position claims. A tiny scrollY blip (a mobile
			// browser's chrome collapsing on load, a leftover restoration
			// stub, whatever) is comfortably under this; a page genuinely
			// scrolled down past the whole hero card is comfortably over it.
			// Reusing `appbarH` itself as that floor rather than a made-up
			// number — it's already the one other "how far down are we"
			// constant this component cares about.
			const heroShown = window.scrollY > appbarH && heroEl.getBoundingClientRect().bottom <= appbarH;
			miniEl.dataset.visible = String(heroShown);
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		// Deferred, not called synchronously: the JSX default (`data-visible=
		// 'false'`) always paints first this way, guaranteed — this only ever
		// *corrects* that a frame later, never replaces the very first paint.
		// The fade transition itself (see `[data-anim]` in components.css)
		// only gets switched on right after, in the same frame: that first
		// correction always lands with no transition capable of animating it,
		// no matter what the element's style briefly was before this ran —
		// every fade from here on is a real, deliberate scroll-driven one.
		raf = requestAnimationFrame(() => {
			update();
			miniEl.dataset.anim = 'true';
		});
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
		// `pokemon` (not just `speciesId`) matters: on a cold load this effect's
		// first run lands while the page is still showing the loading/"not found"
		// placeholder — none of the hero refs exist yet, so it bails out and,
		// since `speciesId` alone doesn't change once the real data arrives, it
		// would otherwise never retry and the whole thing would stay dead for
		// that visit. Re-running once `pokemon` itself shows up fixes that.
	}, [speciesId, pokemon]);
	const cycleLeague = () => setLeague(((league + 1) % LEAGUES.length) as LeagueId);

	if (!fetchCompleted) {
		return (
			<div className='r-loading'>
				<div className='r-spinner' />
				{t('pokemonDetail:loading.pokedex')}
			</div>
		);
	}
	if (!pokemon) {
		return (
			<div className='r-loading'>
				<p>{t('pokemonDetail:loading.notFound', { speciesId })}</p>
			</div>
		);
	}

	const self = pokemon.speciesId;
	const primary = pokemon.types[0];
	const isShadow = pokemon.isShadow;
	// Direct field read either way (precomputed by dex-server's own
	// `family-relations-calculator.ts`) — no speciesId string surgery. A
	// Shadow's own toggle target is always its non-Shadow base; a non-Shadow's
	// is its own Shadow form when one exists, absent otherwise.
	const shadowToggleTarget = isShadow ? pokemon.nonShadowSpecies : pokemon.shadowSpecies;
	const hasShadow = shadowToggleTarget !== undefined;
	// the topbar sprite/name double as "next in the family line" — same cyclic
	// order the family-line strip itself is rendered in
	const familyIdx = family.findIndex((m) => m.speciesId === self);
	const nextFamilyMember = family.length > 1 ? family[(familyIdx + 1) % family.length] : undefined;
	const goToNextFamilyMember = () => {
		if (!nextFamilyMember) return;
		suppressIvResetRef.current = true;
		void navigate(`${R.pokemon(nextFamilyMember.speciesId, tabParam)}${lgParam ? `?lg=${lgParam}` : ''}`);
	};

	// Raid card follows the raid carousel (which Pokémon + which type + which combo), not the URL mon.
	const raidSel = boardData.raid[Math.min(cpos(3).p, Math.max(0, boardData.raid.length - 1))];
	const raidMember = raidSel?.p ?? pokemon;
	const raidSelTypeIdx = Math.min(cpos(3).t, Math.max(0, (raidSel?.types.length ?? 1) - 1));
	const moveName = (id: string) => moves[id]?.moveName[gl] ?? cleanName(id);
	const raidElite = new Set(raidMember.eliteMoves);
	const raidLegacy = new Set(raidMember.legacyMoves);
	const raidMoveTag = (id: string) =>
		raidLegacy.has(id)
			? t('pokemonDetail:moves.legacy')
			: raidElite.has(id)
				? gameTranslator(moves[id]?.isFast ? GameTranslatorKeys.EliteFastTm : GameTranslatorKeys.EliteChargedTm, gl)
				: null;
	const raidRows = (raidSel?.types ?? []).map(({ type, entry, rank }, i) => {
		const combos = comboLists[type] ?? [];
		const mIdx = Math.min(cpos(3).m[type] ?? 0, Math.max(0, combos.length - 1));
		return { t: type, e: entry, rank, on: i === raidSelTypeIdx, combos, mIdx, combo: combos[mIdx] };
	});
	const raidSelRow = raidRows[raidSelTypeIdx];

	// Hero sprite carousel — cycle the official / GO / shiny-GO artwork by tapping
	// (mouse) or swiping left/right (touch). `heroSpriteIdx` can go negative
	// (swipe-right/previous), hence the double-mod wrap instead of a plain `%`.
	const heroSprites = [
		...new Set(
			[pokemon.imageUrl, goSpriteUrl(pokemon.goImageUrl), goSpriteUrl(pokemon.shinyGoImageUrl)].filter(Boolean)
		),
	];
	const heroIdx = heroSprites.length
		? ((heroSpriteIdx % heroSprites.length) + heroSprites.length) % heroSprites.length
		: 0;

	// `iv`/`level` (and so `heroCp`) start at their plain defaults and only snap
	// to the real best-reachable spread once its data lands (see the auto-pick
	// effect above) — showing them before then flashes a CP/level that's about
	// to change right in front of you. Checked via `slice` itself, not
	// `ivLoading`: `useComputeIVs` keeps showing the *previous* species' result
	// while a new one computes (`placeholderData: keepPreviousData`, so sliders
	// update in place instead of flashing a loader) — which also means
	// `ivLoading` goes false again immediately on a brand-new species, well
	// before `ivPercents` actually has an entry for it. `slice` doesn't have
	// that problem: it's only ever non-empty once `ivPercents` genuinely
	// contains this exact `pvpMember`. Raids don't use `slice` at all (IVs
	// barely matter there — see the raid tab's own note), so they're always
	// "ready". Once the user's picked their own spread, `iv`/`level` are theirs
	// and done changing on their own — never hide them again just because
	// something else reloads.
	const heroReady = isRaid || ivTouchedRef.current || !!slice?.perfect;

	// `heroReady` alone isn't quite enough for the numeric readout below
	// (rank/percentile/CP): `slice` being non-empty only means `ivPercents`
	// has *some* entry for this species — not that it's the entry for the
	// `iv` currently on screen. Right when `slice.perfect` first appears
	// (still for the transient `iv: 0/0/0` default, before the auto-pick
	// layout effect snaps `iv` to the real rank-1 spread), `heroReady` flips
	// true and briefly shows that spread's own — wrong — rank/percentile.
	// `ivStale` (react-query's `isPlaceholderData`) catches exactly that: true
	// whenever the shown data was computed for a previous `iv` and
	// `keepPreviousData` is filling in while the real result for the current
	// one is still computing. Only gated during auto-tracking, not after the
	// user's touched the picker themselves — once they have, showing the
	// previous spread's numbers while a drag's new value recomputes is the
	// deliberate, smoother UX `keepPreviousData` exists for in the first
	// place; only the initial snap-to-rank-1 settling should ever show "…".
	const readoutReady = isRaid || (ivTouchedRef.current ? !!slice : !!slice?.perfect && !ivStale);

	// Each leaderboard row = the currently-carouseled "best reachable" for that league.
	const boardRows = LEAGUES.map((l) => {
		const raidRow = l.id === 3;
		const ready = raidRow ? raidDPSFetchCompleted : pvpFetchCompleted;
		const { p, t } = cpos(l.id);
		let member: IGamemasterPokemon | undefined;
		let rank: number | undefined;
		let metric = '';
		let bestType: string | undefined;
		let typeCount = 0;
		let typeIdx = 0;
		let rankChange = 0;
		const total = raidRow ? boardData.raid.length : (boardData.pvp[l.id]?.length ?? 0);
		const pIdx = total ? Math.min(p, total - 1) : 0;

		// Before its ranking data lands, `boardData` still only "knows" about
		// this Pokémon itself (see `pvpList`/`raid` above) — showing that as the
		// row's member would flash the wrong species/sprite for a moment before
		// the real best-reachable stage swaps in. Leaving it unset renders the
		// existing "Loading…" fallback instead until `ready`.
		if (ready) {
			if (raidRow) {
				const cand = boardData.raid[pIdx];
				member = cand?.p;
				typeCount = cand?.types.length ?? 0;
				typeIdx = typeCount ? Math.min(t, typeCount - 1) : 0;
				const tr = cand?.types[typeIdx];
				if (tr) {
					rank = tr.rank;
					metric = `${fmtRaidMetric(tr.entry[raidMetric], raidMetric)} ${RAID_METRIC_LABEL[raidMetric]}`;
					bestType = tr.type;
				}
			} else {
				member = boardData.pvp[l.id]?.[pIdx];
				const e = member ? rankLists[l.id]?.[member.speciesId] : undefined;
				if (e) {
					rank = e.rank;
					metric = `${e.score.toFixed(1)} pts`;
					rankChange = e.rankChange ?? 0;
				}
			}
		}
		// This row's own IV rank/percentage — always computed (not just for
		// whichever league happens to be selected), same "always there, only
		// painted when active" treatment `.r-board-lg` already gets. Raid has
		// no IV-rank concept at all (its `rank` above is already the species'
		// raid-attacker rank); `leagueSlice` only ever handles 0/1/2, so it's
		// never called for it.
		const ivSlice = !raidRow ? leagueSlice(ivPercents[member?.speciesId ?? ''], l.id as PvpLeague) : undefined;
		return { l, ready, member, rank, metric, bestType, total, pIdx, typeCount, typeIdx, rankChange, ivSlice };
	});

	return (
		<div className='r-shell'>
			{/* ---- collapsed hero: sits under the app bar (search stays put) — the sprite
			    below physically flies in as you scroll (see the effect above); name /
			    types / CP are simple, always-there text that cross-fades with the bar
			    itself (a flown/scaled clone of a whole paragraph of text read badly —
			    blurry at a shrunk size, and it can't ellipsis since its box never
			    actually resizes, only its transform does) ---- */}
			{/* decorative echo of the hero above — screen readers get the real thing.
			    Sprite+name double as "go to the next Pokémon in the family line",
			    as one combined target — hovering either half highlights the name. */}
			<div className='r-hero-mini' ref={heroMiniRef} data-visible='false' style={accentStyle(primary)}>
				<button
					type='button'
					className='r-hero-mini-id'
					onClick={goToNextFamilyMember}
					disabled={!nextFamilyMember}
					aria-label={
						nextFamilyMember
							? t('pokemonDetail:hero.nextFamilyMemberAriaLabel', {
									current: cleanName(pokemon.speciesName),
									next: cleanName(nextFamilyMember.speciesName),
								})
							: undefined
					}
				>
					<span className='r-hero-mini-sprite'>
						{isShadow && <ShadowMark className='r-shadow-mark' />}
						<img
							src={heroSprites[heroIdx] || spriteUrl(pokemon, imageSource)}
							alt=''
							aria-hidden='true'
							onError={handleSpriteError(pokemon)}
						/>
					</span>
					<span className='r-hero-mini-name'>{cleanName(pokemon.speciesName)}</span>
				</button>
				<button
					type='button'
					className='r-hero-mini-lg'
					style={{ ['--seg-c' as string]: LEAGUES[league].cssVar }}
					onClick={cycleLeague}
					aria-label={t('pokemonDetail:hero.switchLeagueAriaLabel', { league: LEAGUES[league].full })}
				>
					<img src={LG_ICON[league]} alt='' aria-hidden='true' />
					{league !== 3 ? LEAGUES[league].full : LEAGUES[league].label}
				</button>
			</div>

			{/* ---- HERO (the only place the primary-type colour leaks) ---- */}
			<header className='r-hero' ref={heroRef} style={accentStyle(primary)}>
				<div className='r-hero-top'>
					<Sprite
						pokemon={pokemon}
						src={heroSprites[heroIdx]}
						onTap={() => setHeroSpriteIdx((i) => i + 1)}
						onSwipeLeft={() => setHeroSpriteIdx((i) => i + 1)}
						onSwipeRight={() => setHeroSpriteIdx((i) => i - 1)}
						hint={{ count: heroSprites.length, active: heroIdx }}
					/>
					<div style={{ flex: 1 }}>
						<div className='r-dexno'>{dexNo(pokemon.dex)}</div>
						<h1 className='r-name'>{cleanName(pokemon.speciesName)}</h1>
						<div className='r-cp'>
							<b>{heroReady ? heroCp.toLocaleString() : '…'}</b>
							<span>{gameTranslator(GameTranslatorKeys.CPDisplay, gl)}</span>
						</div>
						<div className='r-types' style={{ justifyContent: 'flex-start', marginTop: 10 }}>
							{pokemon.types.map((t) => (
								<span key={String(t)} className='r-type' style={{ ['--tc' as string]: typeVar(t) }}>
									{gameTypeDisplayTranslator(typeKey(t), gl) || String(t)}
								</span>
							))}
						</div>
					</div>
				</div>

				<div className='r-stats'>
					<div className='r-stat'>
						<i>{t('pokemonDetail:hero.stats.atk')}</i>
						<b>{pokemon.baseStats.atk}</b>
					</div>
					<div className='r-stat'>
						<i>{t('pokemonDetail:hero.stats.def')}</i>
						<b>{pokemon.baseStats.def}</b>
					</div>
					<div className='r-stat'>
						<i>{t('pokemonDetail:hero.stats.hp')}</i>
						<b>{pokemon.baseStats.hp}</b>
					</div>
				</div>

				<div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
					{heroReady ? (
						<Stepper
							value={level}
							min={1}
							max={maxLevel}
							step={0.5}
							onChange={onManualLevelChange}
							// Best Buddy's level 51 is a flat +1 past 50, not another half-level —
							// skip the nonexistent 50.5 rung right below it either direction.
							nextValue={(cur, dir) => {
								if (dir > 0) return cur === MAX_LEVEL && maxLevel > MAX_LEVEL ? maxLevel : cur + 0.5;
								return cur === maxLevel && maxLevel > MAX_LEVEL ? MAX_LEVEL : cur - 0.5;
							}}
							format={(v) => `${t('pokemonDetail:hero.level.prefix')} ${Number.isInteger(v) ? v : v.toFixed(1)}`}
						/>
					) : (
						<div className='r-toggle r-stepper' aria-hidden='true'>
							<span>{t('pokemonDetail:hero.level.loading')}</span>
						</div>
					)}
					{hasShadow && (
						<button
							type='button'
							className='r-toggle r-toggle--shadow'
							data-on={isShadow}
							onClick={() => {
								if (!shadowToggleTarget) return;
								suppressIvResetRef.current = true;
								void navigate(`${R.pokemon(shadowToggleTarget, tabParam)}${lgParam ? `?lg=${lgParam}` : ''}`);
							}}
						>
							<ShadowMark className='r-toggle-flame' />
							{gameTranslator(GameTranslatorKeys.ShadowDisplay, gl)}
						</button>
					)}
				</div>
			</header>

			{/* ---- FAMILY LINE (shared across every tab — click to open that Pokémon) ----
			    skipped entirely when it's just this one mon on its own — nothing to switch to */}
			{family.length > 1 && (
				<>
					<div className='r-section-h'>
						{t('pokemonDetail:familyLine.heading', { name: cleanName(pokemon.speciesName) })}
					</div>
					<div className='r-reach'>
						{family.map((m) => (
							<Link
								key={m.speciesId}
								to={`${R.pokemon(m.speciesId, tabParam)}${lgParam ? `?lg=${lgParam}` : ''}`}
								className='r-reach-chip'
								data-active={m.speciesId === self}
								style={{ ['--tc' as string]: typeVar(m.types[0]) }}
								onClick={() => {
									suppressIvResetRef.current = true;
								}}
							>
								{m.isShadow && <ShadowMark />}
								<span className='r-reach-art'>
									<img
										src={spriteUrl(m, imageSource)}
										alt=''
										loading='lazy'
										decoding='async'
										onError={handleSpriteError(m)}
									/>
								</span>
								<span>{cleanName(m.speciesName)}</span>
							</Link>
						))}
					</div>
				</>
			)}

			{/* ---- LEAGUE + TABS ---- */}
			<div
				className='r-seg r-seg--league'
				role='tablist'
				aria-label={t('pokemonDetail:tablist.ariaLabel')}
				style={{ ['--seg-count' as string]: LEAGUES.length }}
			>
				{LEAGUES.map((l) => (
					<button
						key={l.id}
						type='button'
						data-active={league === l.id}
						style={{ ['--seg-c' as string]: l.cssVar }}
						onClick={() => selectLeague(l.id as LeagueId)}
					>
						{l.label}
					</button>
				))}
			</div>

			<nav className='r-tabs'>
				{TABS.map(([label, slug]) => (
					<button
						key={slug}
						type='button'
						aria-current={tab === label ? 'page' : undefined}
						onClick={() => void navigate(`${R.pokemon(speciesId, slug)}${lgParam ? `?lg=${lgParam}` : ''}`)}
					>
						{TAB_LABEL[slug]}
					</button>
				))}
			</nav>

			{tab === 'Moves' ? (
				<MovesTab pokemon={pokemon} league={league} />
			) : tab === 'IV Table' ? (
				<IvTableTab pokemon={pokemon} league={league} />
			) : tab === 'Strings' ? (
				<SearchStringsTab pokemon={pokemon} league={league} />
			) : tab === 'Counters' ? (
				<CountersTab pokemon={pokemon} league={league} />
			) : tab !== 'Ranks' ? (
				<div className='r-card' style={{ marginTop: 24, textAlign: 'center' }}>
					<p className='r-muted'>{t('pokemonDetail:tabs.comingSoon', { tab })}</p>
				</div>
			) : (
				<>
					{/* ---- LEADERBOARD — best reachable per league; click active row to cycle ---- */}
					<div className='r-section-h'>{t('pokemonDetail:board.sectionHeading')}</div>
					<div className='r-board'>
						{boardRows.map(
							({ l, ready, member, rank, metric, bestType, total, pIdx, typeCount, typeIdx, rankChange, ivSlice }) => {
								const active = league === l.id;
								return (
									<div
										key={l.id}
										className='r-board-row'
										role='button'
										tabIndex={0}
										aria-pressed={active}
										data-active={active}
										style={{ ['--lg' as string]: l.cssVar }}
										onClick={() => cycleRow(l.id as LeagueId)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												cycleRow(l.id as LeagueId);
											}
										}}
									>
										{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events --
											   touch-only convenience wrapper enlarging `.r-board-type`'s tap target; that
											   button (and the row itself) already carry full keyboard support, so this
											   isn't a new independent interactive element to make focusable. */}
										<span
											className='r-board-sprite'
											onClick={bestType ? (e) => spriteClick(e, l.id as LeagueId) : undefined}
										>
											{member?.isShadow && <ShadowMark />}
											{member && (
												<img
													src={spriteUrl(member, imageSource)}
													alt=''
													loading='lazy'
													decoding='async'
													onError={handleSpriteError(member)}
												/>
											)}
											{bestType && (
												<span
													className='r-board-type'
													role='button'
													tabIndex={0}
													title={t('pokemonDetail:board.nextTypeTitle', {
														type: gameTypeDisplayTranslator(bestType, gl) || bestType,
													})}
													onClick={(e) => cycleType(e, l.id as LeagueId)}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															cycleType(e as unknown as ReactMouseEvent, l.id as LeagueId);
														}
													}}
												>
													<img
														src={`/images/types/${bestType}.png`}
														alt={gameTypeDisplayTranslator(bestType, gl) || bestType}
													/>
												</span>
											)}
										</span>
										<span className='r-board-id'>
											<span className='r-board-lg'>
												{l.full}
												{bestType &&
													` · ${t('pokemonDetail:board.attackersSuffix', {
														type: gameTypeDisplayTranslator(bestType, gl) || bestType,
													})}`}
											</span>
											<span className='r-board-name'>
												{member
													? cleanName(member.speciesName)
													: ready
														? t('pokemonDetail:board.notRanked')
														: t('pokemonDetail:board.loading')}
											</span>
											{/* Raid has no IV-rank concept at all (its `rank` above is
											    already the raid-attacker rank, not an IV percentile), so it
											    never generates one here — the type-carousel pips (which
											    league rows have no equivalent of) take this slot instead. */}
											{l.id === 3 ? (
												typeCount > 1 && (
													<span className='r-board-typepips' aria-hidden='true'>
														{Array.from({ length: typeCount }, (_, i) => (
															<i key={i} data-on={i === typeIdx} />
														))}
													</span>
												)
											) : (
												<span className='r-board-ivrank'>
													{ivSlice ? `#${ivSlice.rank.toLocaleString()} · ${dec1(rankPerfection(ivSlice.rank))}%` : '—'}
												</span>
											)}
										</span>
										<span className='r-board-fig'>
											<span className='r-board-rank'>
												{rank != null ? ordinal(rank, currentLanguage) : '—'}
												{l.id !== 3 && rankChange !== 0 && (
													<span className='r-delta' data-dir={rankChange > 0 ? 'up' : 'down'}>
														{rankChange > 0 ? '▲' : '▼'}
														{Math.abs(rankChange)}
													</span>
												)}
											</span>
											{metric && <span className='r-board-metric'>{metric}</span>}
										</span>
										{total > 1 && (
											<span className='r-board-pips' aria-hidden='true'>
												{Array.from({ length: total }, (_, i) => (
													<i key={i} data-on={i === pIdx} />
												))}
											</span>
										)}
									</div>
								);
							}
						)}
					</div>

					{isRaid ? (
						/* ---- RAID PERFORMANCE ---- */
						<>
							<div className='r-section-h'>
								{raidMember.speciesId === self
									? raidMember.isShadow
										? t('pokemonDetail:raid.performanceHeading.selfShadow', {
												name: cleanName(raidMember.speciesName),
												raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
												shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl),
											})
										: t('pokemonDetail:raid.performanceHeading.self', {
												name: cleanName(raidMember.speciesName),
												raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
											})
									: raidMember.isShadow
										? t('pokemonDetail:raid.performanceHeading.asShadow', {
												name: cleanName(raidMember.speciesName),
												raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
												shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl),
											})
										: t('pokemonDetail:raid.performanceHeading.as', {
												name: cleanName(raidMember.speciesName),
												raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
											})}
							</div>
							<div className='r-card' style={{ ['--accent' as string]: 'var(--lg-raid)' }}>
								{raidSelRow ? (
									<div className='r-readout'>
										<div>
											<i>
												{t('pokemonDetail:raid.rank', {
													type: gameTypeDisplayTranslator(raidSelRow.t, gl) || raidSelRow.t,
												})}
											</i>
											<b className='hi' style={{ ['--tc' as string]: typeVar(raidSelRow.t) }}>
												{ordinal(raidSelRow.rank, currentLanguage)}
											</b>
										</div>
										<div>
											<i>{RAID_METRIC_LABEL[raidMetric]}</i>
											<b>{fmtRaidMetric(raidSelRow.combo?.[raidMetric] ?? raidSelRow.e[raidMetric], raidMetric)}</b>
										</div>
										<div>
											<i>{t('pokemonDetail:raid.baseAtk')}</i>
											<b>{raidMember.baseStats.atk}</b>
										</div>
									</div>
								) : (
									<p className='r-muted'>
										{t('pokemonDetail:raid.notRankedAttacker', {
											raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
										})}
									</p>
								)}

								{raidRows.length > 0 && (
									<>
										<div className='r-section-h' style={{ marginTop: 16 }}>
											{t('pokemonDetail:raid.bestMovesetByType')}
										</div>
										<div className='r-raidtypes'>
											{raidRows.map(({ t: rt, e, rank, on, combos, mIdx, combo }, i) => {
												const activate = () => (on ? cycleMove(rt, combos.length) : selectType(i));
												return (
													<div
														key={rt}
														className='r-raidtype'
														role='button'
														tabIndex={0}
														data-active={on ? '' : undefined}
														aria-pressed={on}
														title={
															on ? t('pokemonDetail:raid.nextMovesetTitle') : t('pokemonDetail:raid.selectTypeTitle')
														}
														style={{ ['--tc' as string]: `var(--t-${rt})` }}
														onClick={activate}
														onKeyDown={(ev) => {
															if (ev.key === 'Enter' || ev.key === ' ') {
																ev.preventDefault();
																activate();
															}
														}}
													>
														<span className='r-raidtype-head'>
															<span className='r-move-type'>{gameTypeDisplayTranslator(rt, gl) || rt}</span>
															<b>{ordinal(rank, currentLanguage)}</b>
															<em>
																{fmtRaidMetric(combo?.[raidMetric] ?? e[raidMetric], raidMetric)}{' '}
																{RAID_METRIC_LABEL[raidMetric]}
															</em>
														</span>
														{combo && (
															<span className='r-raidtype-moves'>
																<span className='r-raidtype-mv'>
																	<Link to={R.move(combo.f)} onClick={(ev) => ev.stopPropagation()}>
																		{moveName(combo.f)}
																	</Link>
																	<i>+</i>
																	<Link to={R.move(combo.c)} onClick={(ev) => ev.stopPropagation()}>
																		{moveName(combo.c)}
																	</Link>
																</span>
																{[...new Set([raidMoveTag(combo.f), raidMoveTag(combo.c)])]
																	.filter((tg): tg is string => !!tg)
																	.map((tg) => (
																		<i key={tg} className='r-move-tag r-raidtype-tag'>
																			{tg}
																		</i>
																	))}
																{combos.length > 1 && (
																	<span className='r-raidtype-pips' aria-hidden='true'>
																		{combos.map((_, j) => (
																			<i key={j} data-on={j === mIdx} />
																		))}
																	</span>
																)}
															</span>
														)}
													</div>
												);
											})}
										</div>
									</>
								)}

								{raidSelRow && (
									<p className='r-muted' style={{ marginTop: 14 }}>
										{t('pokemonDetail:raid.ivsBarelyMatterPrefix', {
											raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
										})}{' '}
										<b>{t('pokemonDetail:raid.attackWord')}</b>.
									</p>
								)}
							</div>
						</>
					) : (
						<>
							{/* ---- IV PICKER ---- */}
							<div className='r-section-h'>
								{(() => {
									const m = pvpMember ?? pokemon;
									const name = cleanName(m.speciesName);
									if (purifyOffset > 0)
										return t('pokemonDetail:pvp.percentileHeading.purified', {
											name,
											purified: gameTranslator(GameTranslatorKeys.PurifiedDisplay, gl),
										});
									const isSelf = m.speciesId === self;
									if (isSelf) {
										return m.isShadow
											? t('pokemonDetail:pvp.percentileHeading.selfShadow', {
													name,
													shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl),
												})
											: t('pokemonDetail:pvp.percentileHeading.self', { name });
									}
									return m.isShadow
										? t('pokemonDetail:pvp.percentileHeading.asShadow', {
												name,
												shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl),
											})
										: t('pokemonDetail:pvp.percentileHeading.as', { name });
								})()}
							</div>
							<div className='r-card' style={{ ['--accent' as string]: LEAGUES[league].cssVar }}>
								{/* Only the picker itself (the one thing that can show a literal IV
								    number) waits on `heroReady` — the readout/paragraphs below it
								    already fall back to "…" off `slice` alone, so gating the whole
								    card on `heroReady` too was reserving space for text that was
								    never actually the problem, on top of the picker's own space:
								    that's the "way too big while loading" of it. The picker's real
								    DOM still always renders — `visibility: hidden`, not a conditional
								    skip — so this reserves exactly its own real height (bars + preset
								    row only, nothing else) and never reflows once the spinner drops
								    away; the overlay sits on it via this wrapper's own `position:
								    relative`. */}
								<div style={{ position: 'relative' }}>
									<div style={{ visibility: heroReady ? 'visible' : 'hidden' }}>
										<IvPicker
											value={iv}
											onChange={onManualIvChange}
											presets={[
												[t('pokemonDetail:pvp.presets.zero'), { atk: 0, def: 0, hp: 0 }],
												[t('pokemonDetail:pvp.presets.hundo'), { atk: 15, def: 15, hp: 15 }],
												...(league !== 2 && slice
													? [
															[
																t('pokemonDetail:pvp.presets.rank1', { league: LEAGUES[league].full }),
																{
																	atk: purifiedIv(slice.perfect.A),
																	def: purifiedIv(slice.perfect.D),
																	hp: purifiedIv(slice.perfect.S),
																},
																// Unlike every other preset, this one isn't "jump to
																// this fixed value and stay there" — it's "go back to
																// following rank 1, whatever that is right now and
																// from now on." Re-arming `ivTouchedRef` (rather than
																// setting it, like `onManualIvChange` does) means the
																// next league switch, carousel move, or family-member
																// hop resumes auto-tracking instead of staying pinned
																// to today's league's rank-1 spread.
																() => {
																	ivTouchedRef.current = false;
																	setIv({
																		atk: purifiedIv(slice.perfect.A),
																		def: purifiedIv(slice.perfect.D),
																		hp: purifiedIv(slice.perfect.S),
																	});
																	if (slice.perfectLvl) setLevel(slice.perfectLvl);
																},
																// Toggled-looking second border while still actively
																// tracking rank 1 - gone the moment the user drags a
																// bar or the level stepper themselves.
																!ivTouchedRef.current,
															] as [string, IVs, () => void, boolean],
														]
													: []),
											]}
										/>
									</div>
									{!heroReady && (
										<div
											className='r-loading'
											style={{ position: 'absolute', inset: 0, minHeight: 0, background: 'var(--surface)' }}
										>
											<div className='r-spinner' style={{ width: 28, height: 28 }} />
										</div>
									)}
								</div>
								{/* Gated on `readoutReady`, not just `!slice` — see its own doc
								    comment above for exactly why `slice` alone isn't enough to
								    guarantee these numbers match the `iv` actually on screen. */}
								<div className='r-readout'>
									<div>
										<i>
											{renderWithColoredParams(t, 'pokemonDetail:pvp.ivRank', {
												league: { value: LEAGUES[league].full, color: LEAGUES[league].cssVar },
											})}
										</i>
										<b className='hi'>{!readoutReady || !slice ? '…' : `#${slice.rank.toLocaleString()}`}</b>
									</div>
									<div>
										<i>{t('pokemonDetail:pvp.perfection')}</i>
										<b>{!readoutReady || !slice ? '…' : `${dec1(rankPerfection(slice.rank))}%`}</b>
									</div>
									<div>
										<i>
											{readoutReady && slice
												? t('pokemonDetail:pvp.cpAtLevel', {
														level: slice.lvl,
														cp: gameTranslator(GameTranslatorKeys.CPDisplay, gl),
													})
												: gameTranslator(GameTranslatorKeys.CPDisplay, gl)}
										</i>
										<b>{!readoutReady || !slice ? '…' : slice.cp.toLocaleString()}</b>
									</div>
								</div>
								{/* The rank-1 spread itself is already shown above (IV rank / CP @
								    level) — this only ever needs to add whatever ELSE ties it,
								    never repeat it. */}
								{readoutReady && slice && tiedBestSpreads.length > 1 && (
									<p className='r-muted' style={{ marginTop: 12 }}>
										{renderWithColoredParams(t, 'pokemonDetail:pvp.additionalBestSpreadFor', {
											league: { value: LEAGUES[league].full, color: LEAGUES[league].cssVar },
										})}{' '}
										<span className='r-bestspreads-list'>
											{tiedBestSpreads.slice(1).map((r, i) => (
												<span key={i} className='r-bestspreads-item'>
													{r.IVs.A}/{r.IVs.D}/{r.IVs.S}{' '}
													{t('pokemonDetail:pvp.bestSpreadResult', { cp: r.CP.toLocaleString(), level: r.L })}
												</span>
											))}
										</span>
									</p>
								)}
								{purifyOffset > 0 && (
									<p className='r-muted' style={{ marginTop: 8 }}>
										{t('pokemonDetail:pvp.purifyWarning')}
									</p>
								)}
								{purifyOffset > 0 && slice && (slice.perfect.A < 2 || slice.perfect.D < 2 || slice.perfect.S < 2) && (
									<p className='r-muted' style={{ marginTop: 8 }}>
										{t('pokemonDetail:pvp.purifyUnreachableWarning', {
											shadow: gameTranslator(GameTranslatorKeys.ShadowDisplay, gl),
										})}
									</p>
								)}
							</div>
						</>
					)}

					{/* ---- EFFECTIVENESS ---- */}
					<div className='r-section-h'>
						{t('pokemonDetail:effectiveness.heading', { name: cleanName(pokemon.speciesName) })}
					</div>
					<div className='r-card'>
						<div className='r-eff'>
							<div className='r-eff-col'>
								<b>{t('pokemonDetail:effectiveness.weakTo')}</b>
								<div className='r-eff-list'>
									{matchups.weak.map(({ type, mult }) => (
										<span
											key={type}
											className='r-eff-t'
											data-double={isDoubleMult(mult) ? '' : undefined}
											style={{ ['--tc' as string]: `var(--t-${type})` }}
										>
											{gameTypeDisplayTranslator(type, gl)}
											<span className='r-eff-mult'>{fmtMult(mult)}</span>
										</span>
									))}
									{matchups.weak.length === 0 && (
										<span className='r-muted'>{t('pokemonDetail:effectiveness.nothing')}</span>
									)}
								</div>
							</div>
							<div className='r-eff-col'>
								<b>{t('pokemonDetail:effectiveness.resists')}</b>
								<div className='r-eff-list'>
									{matchups.resist.map(({ type, mult }) => (
										<span
											key={type}
											className='r-eff-t'
											data-double={isDoubleMult(mult) ? '' : undefined}
											style={{ ['--tc' as string]: `var(--t-${type})` }}
										>
											{gameTypeDisplayTranslator(type, gl)}
											<span className='r-eff-mult'>{fmtMult(mult)}</span>
										</span>
									))}
									{matchups.resist.length === 0 && (
										<span className='r-muted'>{t('pokemonDetail:effectiveness.nothing')}</span>
									)}
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default PokemonDetail;

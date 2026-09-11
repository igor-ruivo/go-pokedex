import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { IvPicker, type IVs } from '../components/IvPicker';
import { ShadowMark } from '../components/ShadowMark';
import { goSpriteUrl, Sprite, spriteUrl } from '../components/Sprite';
import { Stepper } from '../components/Stepper';
import { useImageSource } from '../contexts/imageSource-context';
import { useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IIvPercents } from '../DTOs/ivs';
import useComputeIVs from '../hooks/useComputeIVs';
import { fmtMult, isDoubleMult, typeMatchups } from '../lib/effectiveness';
import { cleanName, dexNo, ordinal } from '../lib/format';
import { R } from '../lib/nav';
import { fmtRaidMetric, RAID_METRIC_LABEL } from '../lib/raid-metric';
import { accentStyle, TYPE_LABEL, typeKey, typeVar } from '../lib/types';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { usePvp } from '../queries/pvp';
import { type DPSEntry, useRaidRanker } from '../queries/raid-ranker';
import {
	calculateCP,
	computeDPSEntry,
	fetchPokemonFamily,
	fetchReachablePokemonIncludingSelf,
	levelToLevelIndex,
	MAX_LEVEL,
	MAX_LEVEL_INDEX,
} from '../utils/pokemon-helper';
import CountersTab from './pokemon/CountersTab';
import IvTableTab from './pokemon/IvTableTab';
import MovesTab from './pokemon/MovesTab';
import SearchStringsTab from './pokemon/SearchStringsTab';

const LEAGUES = [
	{ id: 0, label: 'Great', full: 'Great League', cssVar: 'var(--lg-great)' },
	{ id: 1, label: 'Ultra', full: 'Ultra League', cssVar: 'var(--lg-ultra)' },
	{ id: 2, label: 'Master', full: 'Master League', cssVar: 'var(--lg-master)' },
	{ id: 3, label: 'Raids', full: 'Raids', cssVar: 'var(--lg-raid)' },
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

const TABS = [
	['Ranks', 'ranks'],
	['Moves', 'moves'],
	['Counters', 'counters'],
	['IV Table', 'iv-table'],
	['Strings', 'strings'],
] as const;
type TabLabel = (typeof TABS)[number][0];
const SLUG_TO_TAB = Object.fromEntries(TABS.map(([label, slug]) => [slug, label])) as Record<string, TabLabel>;

const leagueSlice = (ivp: IIvPercents | undefined, id: PvpLeague) => {
	if (!ivp) return undefined;
	switch (id) {
		case 0:
			return {
				rank: ivp.greatLeagueRank,
				cp: ivp.greatLeagueCP,
				lvl: ivp.greatLeagueLvl,
				perfect: ivp.greatLeaguePerfect,
				perfectCP: ivp.greatLeaguePerfectCP,
				perfectLvl: ivp.greatLeaguePerfectLevel,
			};
		case 1:
			return {
				rank: ivp.ultraLeagueRank,
				cp: ivp.ultraLeagueCP,
				lvl: ivp.ultraLeagueLvl,
				perfect: ivp.ultraLeaguePerfect,
				perfectCP: ivp.ultraLeaguePerfectCP,
				perfectLvl: ivp.ultraLeaguePerfectLevel,
			};
		default:
			return {
				rank: ivp.masterLeagueRank,
				cp: ivp.masterLeagueCP,
				lvl: ivp.masterLeagueLvl,
				perfect: ivp.masterLeaguePerfect,
				perfectCP: ivp.masterLeaguePerfectCP,
				perfectLvl: ivp.masterLeaguePerfectLevel,
			};
	}
};

const PokemonDetail = () => {
	const { speciesId = '', tab: tabParam } = useParams();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const { imageSource } = useImageSource();
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	const { moves, movesFetchCompleted } = useMoves();
	const { currentGameLanguage: gl } = useLanguage();
	// which figure (DPS/TDO/eDPS) ranks raid attackers — the same device-wide
	// setting Rankings' raid tab and the Counters tab use.
	const { raidMetric } = useRaidMetric();

	const pokemon = fetchCompleted ? gamemasterPokemon[speciesId] : undefined;
	const tab: TabLabel = SLUG_TO_TAB[tabParam ?? 'ranks'] ?? 'Ranks';

	const lgParam = searchParams.get('lg') ?? '';
	const [iv, setIv] = useState<IVs>({ atk: 15, def: 15, hp: 15 });
	const [level, setLevel] = useState(MAX_LEVEL);
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
	useEffect(() => setHeroSpriteIdx(0), [speciesId]);
	const isRaid = league === 3;

	// IV percents for the whole reachable family — the "Your IVs" card shows whichever
	// member the league carousel is on (best reachable by default, not the URL mon).
	const [ivPercents, ivLoading] = useComputeIVs({
		pokemon: pokemon as never,
		attackIV: iv.atk,
		defenseIV: iv.def,
		hpIV: iv.hp,
	});

	// Whole evolution family for the picker — same rule as the legacy site:
	// predecessors + the full line, restricted to this Pokémon's shadow-ness.
	//
	// Ordered like the evolution chain reads — base stage first, then each
	// next evolution, form variants (e.g. a regional form) sitting alongside
	// their stage rather than after the whole line, Megas always last — not by
	// dex number, which interleaves unrelated regional dex ranges.
	const family = useMemo(() => {
		if (!pokemon) return [];
		const members = fetchPokemonFamily(pokemon, gamemasterPokemon);

		const depthCache = new Map<string, number>();
		const depthOf = (m: IGamemasterPokemon): number => {
			const cached = depthCache.get(m.speciesId);
			if (cached != null) return cached;
			let depth = 0;
			let cur: IGamemasterPokemon | undefined = m;
			const seen = new Set<string>();
			while (cur?.family?.parent && !seen.has(cur.speciesId)) {
				seen.add(cur.speciesId);
				cur = gamemasterPokemon[cur.family.parent];
				if (cur) depth++;
			}
			depthCache.set(m.speciesId, depth);
			return depth;
		};

		return [...members].sort(
			(a, b) =>
				(a.isMega ? 1 : 0) - (b.isMega ? 1 : 0) || // Megas always last
				depthOf(a) - depthOf(b) || // then by evolutionary stage
				(a.isShadow ? 1 : 0) - (b.isShadow ? 1 : 0) || // non-shadow before shadow
				a.speciesName.localeCompare(b.speciesName) // ties: alphabetical
		);
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

		// The dataset's baked-in `rank` is DPS-only — re-rank each type's list by
		// whichever metric is chosen so switching it actually reorders things
		// (the raid tab, "best moveset by type coverage", all of it).
		const metricRankByType: Record<string, Record<string, number>> = {};
		for (const [type, list] of Object.entries(raidDPS)) {
			if (type === '') continue;
			const ranks: Record<string, number> = {};
			Object.values(list)
				.sort((a, b) => b[raidMetric] - a[raidMetric])
				.forEach((entry, i) => {
					ranks[entry.speciesId] = i + 1;
				});
			metricRankByType[type] = ranks;
		}

		// every attacking-type list this species is ranked in, best rank first
		const rankedTypes = (sid: string) =>
			Object.entries(raidDPS)
				.filter(([t]) => t !== '')
				.map(([type, list]) => ({ type, entry: list[sid] as DPSEntry | undefined }))
				.filter((x): x is { type: string; entry: DPSEntry } => !!x.entry)
				.map((x) => ({ ...x, rank: metricRankByType[x.type]?.[sid] ?? x.entry.rank }))
				.sort((a, b) => a.rank - b.rank);

		const raid = [...reachableRaid]
			.map((p) => ({ p, types: rankedTypes(p.speciesId) }))
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

	// On load and whenever the league (or carouseled member) changes, snap the IV
	// spread to that league's rank-1 spread AND the level that hits its CP cap with
	// that spread (the "… CP at LX" from the readout). The user can still drag both.
	const perfectKey = slice ? `${slice.perfect.A}-${slice.perfect.D}-${slice.perfect.S}-${slice.perfectLvl}` : '';
	useEffect(() => {
		if (!slice?.perfect) return;
		setIv({
			atk: purifiedIv(slice.perfect.A),
			def: purifiedIv(slice.perfect.D),
			hp: purifiedIv(slice.perfect.S),
		});
		if (slice.perfectLvl) setLevel(slice.perfectLvl);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [league, pvpMember?.speciesId, perfectKey, purifyOffset]);

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
		const out: Record<string, Array<{ f: string; c: string; dps: number; tdo: number; edps: number }>> = {};
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
						const e = computeDPSEntry(member, gamemasterPokemon, moves, 15, MAX_LEVEL_INDEX, '', undefined, [f, c]);
						return { f, c, dps: e.dps, tdo: e.tdo, edps: e.edps };
					})
				)
				.sort((a, b) => b[raidMetric] - a[raidMetric])
				// only the best few combos — enough to compare, without an unreadable pip strip
				.slice(0, 5);
		}
		return out;
	}, [boardData, carousel, moves, movesFetchCompleted, gamemasterPokemon, raidMetric]);

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
			// `window.scrollY > 0` first, unconditionally: whatever the hero's
			// measured position says, the bar has no business showing while the
			// page hasn't actually scrolled at all.
			const heroShown = window.scrollY > 0 && heroEl.getBoundingClientRect().bottom <= appbarH;
			miniEl.dataset.visible = String(heroShown);
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		// Deferred, not called synchronously: the JSX default (`data-visible=
		// 'false'`) always paints first this way, guaranteed — this only ever
		// *corrects* that a frame later, never replaces the very first paint.
		raf = requestAnimationFrame(update);
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
				Loading Pokédex…
			</div>
		);
	}
	if (!pokemon) {
		return (
			<div className='r-loading'>
				<p>No Pokémon “{speciesId}”.</p>
			</div>
		);
	}

	const self = pokemon.speciesId;
	const primary = pokemon.types[0];
	const baseId = self.replace('_shadow', '');
	const hasShadow = !!gamemasterPokemon[`${baseId}_shadow`];
	const isShadow = self.endsWith('_shadow');
	// the topbar sprite/name double as "next in the family line" — same cyclic
	// order the family-line strip itself is rendered in
	const familyIdx = family.findIndex((m) => m.speciesId === self);
	const nextFamilyMember = family.length > 1 ? family[(familyIdx + 1) % family.length] : undefined;
	const goToNextFamilyMember = () => {
		if (!nextFamilyMember) return;
		void navigate(`${R.pokemon(nextFamilyMember.speciesId, tabParam)}${lgParam ? `?lg=${lgParam}` : ''}`);
	};

	// Raid card follows the raid carousel (which Pokémon + which type + which combo), not the URL mon.
	const raidSel = boardData.raid[Math.min(cpos(3).p, Math.max(0, boardData.raid.length - 1))];
	const raidMember = raidSel?.p ?? pokemon;
	const raidSelTypeIdx = Math.min(cpos(3).t, Math.max(0, (raidSel?.types.length ?? 1) - 1));
	const moveName = (id: string) => moves[id]?.moveName[gl] ?? cleanName(id);
	const raidElite = new Set(raidMember.eliteMoves);
	const raidLegacy = new Set(raidMember.legacyMoves);
	const raidMoveTag = (id: string) => (raidLegacy.has(id) ? 'Legacy' : raidElite.has(id) ? 'Elite' : null);
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
		return { l, ready, member, rank, metric, bestType, total, pIdx, typeCount, typeIdx, rankChange };
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
							? `${cleanName(pokemon.speciesName)} — next: ${cleanName(nextFamilyMember.speciesName)}`
							: undefined
					}
				>
					<span className='r-hero-mini-sprite'>
						{isShadow && <ShadowMark className='r-shadow-mark' />}
						<img src={heroSprites[heroIdx] || spriteUrl(pokemon, imageSource)} alt='' aria-hidden='true' />
					</span>
					<span className='r-hero-mini-name'>{cleanName(pokemon.speciesName)}</span>
				</button>
				<button
					type='button'
					className='r-hero-mini-lg'
					style={{ ['--seg-c' as string]: LEAGUES[league].cssVar }}
					onClick={cycleLeague}
					aria-label={`Currently showing ${LEAGUES[league].full}. Tap to switch league.`}
				>
					<img src={LG_ICON[league]} alt='' aria-hidden='true' />
					{LEAGUES[league].label}
					{league !== 3 && ' League'}
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
							<b>{heroCp.toLocaleString()}</b>
							<span>CP</span>
						</div>
						<div className='r-types' style={{ justifyContent: 'flex-start', marginTop: 10 }}>
							{pokemon.types.map((t) => (
								<span key={String(t)} className='r-type' style={{ ['--tc' as string]: typeVar(t) }}>
									{TYPE_LABEL[typeKey(t)] ?? String(t)}
								</span>
							))}
						</div>
					</div>
				</div>

				<div className='r-stats'>
					<div className='r-stat'>
						<i>ATK</i>
						<b>{pokemon.baseStats.atk}</b>
					</div>
					<div className='r-stat'>
						<i>DEF</i>
						<b>{pokemon.baseStats.def}</b>
					</div>
					<div className='r-stat'>
						<i>HP</i>
						<b>{pokemon.baseStats.hp}</b>
					</div>
				</div>

				<div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
					<Stepper
						value={level}
						min={1}
						max={MAX_LEVEL}
						step={0.5}
						onChange={setLevel}
						format={(v) => `Lvl ${Number.isInteger(v) ? v : v.toFixed(1)}`}
					/>
					{hasShadow && (
						<button
							type='button'
							className='r-toggle r-toggle--shadow'
							data-on={isShadow}
							onClick={() =>
								void navigate(
									`${R.pokemon(isShadow ? baseId : `${baseId}_shadow`, tabParam)}${lgParam ? `?lg=${lgParam}` : ''}`
								)
							}
						>
							<ShadowMark className='r-toggle-flame' />
							Shadow
						</button>
					)}
				</div>
			</header>

			{/* ---- FAMILY LINE (shared across every tab — click to open that Pokémon) ----
			    skipped entirely when it's just this one mon on its own — nothing to switch to */}
			{family.length > 1 && (
				<>
					<div className='r-section-h'>{cleanName(pokemon.speciesName)}’s family line</div>
					<div className='r-reach'>
						{family.map((m) => (
							<Link
								key={m.speciesId}
								to={`${R.pokemon(m.speciesId, tabParam)}${lgParam ? `?lg=${lgParam}` : ''}`}
								className='r-reach-chip'
								data-active={m.speciesId === self}
								style={{ ['--tc' as string]: typeVar(m.types[0]) }}
							>
								{m.isShadow && <ShadowMark />}
								<span className='r-reach-art'>
									<img src={spriteUrl(m, imageSource)} alt='' loading='lazy' decoding='async' />
								</span>
								<span>{cleanName(m.speciesName)}</span>
							</Link>
						))}
					</div>
				</>
			)}

			{/* ---- LEAGUE + TABS ---- */}
			<div className='r-seg r-seg--league' role='tablist' aria-label='League / mode'>
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
						{label}
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
					<p className='r-muted'>“{tab}” is next in the revamp.</p>
				</div>
			) : (
				<>
					{/* ---- LEADERBOARD — best reachable per league; click active row to cycle ---- */}
					<div className='r-section-h'>Leaderboard · best reachable</div>
					<div className='r-board'>
						{boardRows.map(
							({ l, ready, member, rank, metric, bestType, total, pIdx, typeCount, typeIdx, rankChange }) => {
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
											{member && <img src={spriteUrl(member, imageSource)} alt='' loading='lazy' decoding='async' />}
											{bestType && (
												<span
													className='r-board-type'
													role='button'
													tabIndex={0}
													title={`${TYPE_LABEL[bestType] ?? bestType} — tap for next type`}
													onClick={(e) => cycleType(e, l.id as LeagueId)}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															cycleType(e as unknown as ReactMouseEvent, l.id as LeagueId);
														}
													}}
												>
													<img src={`/images/types/${bestType}.png`} alt={TYPE_LABEL[bestType] ?? bestType} />
												</span>
											)}
										</span>
										<span className='r-board-id'>
											<span className='r-board-lg'>
												{l.full}
												{bestType && ` · ${TYPE_LABEL[bestType] ?? bestType} attackers`}
											</span>
											{l.id === 3 && typeCount > 1 && (
												<span className='r-board-typepips' aria-hidden='true'>
													{Array.from({ length: typeCount }, (_, i) => (
														<i key={i} data-on={i === typeIdx} />
													))}
												</span>
											)}
											<span className='r-board-name'>
												{member ? cleanName(member.speciesName) : ready ? 'Not ranked' : 'Loading…'}
											</span>
										</span>
										<span className='r-board-fig'>
											<span className='r-board-rank'>
												{rank != null ? ordinal(rank) : '—'}
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
								Raid performance
								{raidMember.speciesId !== self && ` · ${cleanName(raidMember.speciesName)}`}
							</div>
							<div className='r-card' style={{ ['--accent' as string]: 'var(--lg-raid)' }}>
								{raidSelRow ? (
									<div className='r-readout'>
										<div>
											<i>{TYPE_LABEL[raidSelRow.t] ?? raidSelRow.t} rank</i>
											<b className='hi'>{ordinal(raidSelRow.rank)}</b>
										</div>
										<div>
											<i>{RAID_METRIC_LABEL[raidMetric]}</i>
											<b>{fmtRaidMetric(raidSelRow.combo?.[raidMetric] ?? raidSelRow.e[raidMetric], raidMetric)}</b>
										</div>
										<div>
											<i>Base ATK</i>
											<b>{raidMember.baseStats.atk}</b>
										</div>
									</div>
								) : (
									<p className='r-muted'>Not ranked as a raid attacker.</p>
								)}

								{raidRows.length > 0 && (
									<>
										<div className='r-section-h' style={{ marginTop: 16 }}>
											Best moveset by type coverage
										</div>
										<div className='r-raidtypes'>
											{raidRows.map(({ t, e, rank, on, combos, mIdx, combo }, i) => {
												const activate = () => (on ? cycleMove(t, combos.length) : selectType(i));
												return (
													<div
														key={t}
														className='r-raidtype'
														role='button'
														tabIndex={0}
														data-active={on ? '' : undefined}
														aria-pressed={on}
														title={on ? 'Tap for the next moveset' : 'Tap to select this type'}
														style={{ ['--tc' as string]: `var(--t-${t})` }}
														onClick={activate}
														onKeyDown={(ev) => {
															if (ev.key === 'Enter' || ev.key === ' ') {
																ev.preventDefault();
																activate();
															}
														}}
													>
														<span className='r-raidtype-head'>
															<span className='r-move-type'>{TYPE_LABEL[t] ?? t}</span>
															<b>{ordinal(rank)}</b>
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

								<p className='r-muted' style={{ marginTop: 14 }}>
									IVs barely matter in raids — chase the highest <b>Attack</b>.
								</p>
							</div>
						</>
					) : (
						<>
							{/* ---- IV PICKER ---- */}
							<div className='r-section-h'>
								{purifyOffset > 0
									? `Shadow ${cleanName(pokemon.speciesName)} IVs to reach ${cleanName((pvpMember ?? pokemon).speciesName)}`
									: `Your IVs · ${cleanName((pvpMember ?? pokemon).speciesName)}`}
							</div>
							<div className='r-card' style={{ ['--accent' as string]: LEAGUES[league].cssVar }}>
								<IvPicker
									value={iv}
									onChange={setIv}
									presets={[
										['0 / 0 / 0', { atk: 0, def: 0, hp: 0 }],
										['Hundo', { atk: 15, def: 15, hp: 15 }],
										...(league !== 2 && slice
											? [
													[
														`Rank 1 ${LEAGUES[league].label}`,
														{
															atk: purifiedIv(slice.perfect.A),
															def: purifiedIv(slice.perfect.D),
															hp: purifiedIv(slice.perfect.S),
														},
													] as [string, { atk: number; def: number; hp: number }],
												]
											: []),
									]}
								/>
								<div className='r-readout'>
									<div>
										<i>{LEAGUES[league].label} IV rank</i>
										<b className='hi'>{ivLoading || !slice ? '…' : `#${(slice.rank + 1).toLocaleString()}`}</b>
									</div>
									<div>
										<i>Percentile</i>
										<b>{ivLoading || !slice ? '…' : `${(((4095 - slice.rank) / 4095) * 100).toFixed(1)}%`}</b>
									</div>
									<div>
										<i>CP{slice ? ` @ L${slice.lvl}` : ''}</i>
										<b>{ivLoading || !slice ? '…' : slice.cp.toLocaleString()}</b>
									</div>
								</div>
								{slice && (
									<p className='r-muted' style={{ marginTop: 12 }}>
										Best spread for {LEAGUES[league].label}:{' '}
										<b>
											{slice.perfect.A}/{slice.perfect.D}/{slice.perfect.S}
										</b>{' '}
										→ {slice.perfectCP.toLocaleString()} CP at L{slice.perfectLvl}.
									</p>
								)}
								{purifyOffset > 0 && (
									<p className='r-muted' style={{ marginTop: 8 }}>
										⚠️ Be aware that purifying gains you +2 IVs on each stat.
									</p>
								)}
								{purifyOffset > 0 && slice && (slice.perfect.A < 2 || slice.perfect.D < 2 || slice.perfect.S < 2) && (
									<p className='r-muted' style={{ marginTop: 8 }}>
										⚠️ That rank-1 spread itself is unreachable by purifying — purification always raises every stat to
										at least 2, so a Shadow can never land below that no matter its own IVs.
									</p>
								)}
							</div>
						</>
					)}

					{/* ---- EFFECTIVENESS ---- */}
					<div className='r-section-h'>Type effectiveness · {cleanName(pokemon.speciesName)}</div>
					<div className='r-card'>
						<div className='r-eff'>
							<div className='r-eff-col'>
								<b>Weak to</b>
								<div className='r-eff-list'>
									{matchups.weak.map(({ type, mult }) => (
										<span
											key={type}
											className='r-eff-t'
											data-double={isDoubleMult(mult) ? '' : undefined}
											style={{ ['--tc' as string]: `var(--t-${type})` }}
										>
											{TYPE_LABEL[type]}
											<span className='r-eff-mult'>{fmtMult(mult)}</span>
										</span>
									))}
									{matchups.weak.length === 0 && <span className='r-muted'>Nothing</span>}
								</div>
							</div>
							<div className='r-eff-col'>
								<b>Resists</b>
								<div className='r-eff-list'>
									{matchups.resist.map(({ type, mult }) => (
										<span
											key={type}
											className='r-eff-t'
											data-double={isDoubleMult(mult) ? '' : undefined}
											style={{ ['--tc' as string]: `var(--t-${type})` }}
										>
											{TYPE_LABEL[type]}
											<span className='r-eff-mult'>{fmtMult(mult)}</span>
										</span>
									))}
									{matchups.resist.length === 0 && <span className='r-muted'>Nothing</span>}
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

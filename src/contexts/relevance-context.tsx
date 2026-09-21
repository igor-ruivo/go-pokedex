import { createContext, useContext, useMemo } from 'react';

import { raidRankOf } from '../lib/raid-metric';
import type { RelevanceSets } from '../lib/relevance';
import { usePvp } from '../queries/pvp';
import { useRaidRanker } from '../queries/raid-ranker';
import { ConfigKeys, readPersistentValue } from '../utils/persistent-configs-handler';
import { useRaidMetric } from './raid-metric-context';

const cfgNum = (key: ConfigKeys, fallback: number): number => {
	const raw = readPersistentValue(key);
	const n = raw == null ? NaN : Number(raw);
	return Number.isFinite(n) && n > 0 ? n : fallback;
};

const EMPTY: RelevanceSets = {
	great: new Set(),
	ultra: new Set(),
	master: new Set(),
	raid: new Set(),
	ready: false,
};

const RelevanceSetsContext = createContext<RelevanceSets | undefined>(undefined);

/**
 * Every league/raid dot badge across the site (`PokeMini`, Calendar's Rocket
 * grunts, Move Detail's chip lists) needs this same set of "which species are
 * relevant" data, and computing it means walking every entry in every PvP
 * rank list plus every type-specific raid attacker list — thousands of rows.
 * Doing that as a plain per-component `useMemo` (the old `useRelevanceSets`)
 * meant EVERY chip/card recomputed it independently, since React's memo cache
 * is scoped to the calling component instance, not shared across siblings —
 * on a page with dozens of chips (Rockets' grunt grids especially) that was
 * the same thousands-of-rows scan repeated dozens of times per render. This
 * provider computes it exactly once per relevant-inputs change, shared by
 * every consumer via context.
 */
export const RelevanceSetsProvider = (props: React.PropsWithChildren<object>) => {
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { raidDPS, raidDPSFetchCompleted } = useRaidRanker();
	// Which figure (DPS/TDO) counts as "top N" for raids — the same
	// device-wide setting Rankings' raid tab ranks by, not the feed's own
	// baked-in `rank` field (always DPS-ordered regardless of this choice).
	const { raidMetric } = useRaidMetric();

	// Read fresh every render so edits on /trash take effect on the next navigation.
	const greatCut = cfgNum(ConfigKeys.TrashGreat, 50);
	const ultraCut = cfgNum(ConfigKeys.TrashUltra, 50);
	const masterCut = cfgNum(ConfigKeys.TrashMaster, 110);
	const raidCut = cfgNum(ConfigKeys.TrashRaid, 5);

	const sets = useMemo(() => {
		if (!pvpFetchCompleted || !raidDPSFetchCompleted) return EMPTY;
		const pvpSet = (list: Record<string, { speciesId: string; rank: number }> | undefined, cutoff: number) => {
			const s = new Set<string>();
			for (const r of Object.values(list ?? {})) if (r.rank <= cutoff) s.add(r.speciesId);
			return s;
		};
		const raid = new Set<string>();
		for (const [key, list] of Object.entries(raidDPS)) {
			if (key === '') continue; // the '' key is the type-agnostic overall list; we want "top N of any type"
			for (const e of Object.values(list)) {
				const rank = raidRankOf(e, raidMetric);
				if (rank != null && rank <= raidCut) raid.add(e.speciesId);
			}
		}
		return {
			great: pvpSet(rankLists[0], greatCut),
			ultra: pvpSet(rankLists[1], ultraCut),
			master: pvpSet(rankLists[2], masterCut),
			raid,
			ready: true,
		};
	}, [
		rankLists,
		raidDPS,
		raidMetric,
		pvpFetchCompleted,
		raidDPSFetchCompleted,
		greatCut,
		ultraCut,
		masterCut,
		raidCut,
	]);

	return <RelevanceSetsContext.Provider value={sets}>{props.children}</RelevanceSetsContext.Provider>;
};

/** Species ids that are directly relevant for each league / raids — shared,
 *  site-wide, computed once by `RelevanceSetsProvider` (see its doc comment). */
export const useRelevanceSets = (): RelevanceSets => {
	const context = useContext(RelevanceSetsContext);
	if (!context) {
		throw new Error('useRelevanceSets must be used within a RelevanceSetsProvider');
	}
	return context;
};

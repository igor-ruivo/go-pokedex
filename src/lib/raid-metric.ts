import type { SortOption } from '../components/SortBar';
import type { DPSEntry } from '../queries/raid-ranker';

/** Which figure a raid ranking is sorted/displayed by — one shared choice across
 * the site (Rankings' raid tab, a Pokémon's Counters tab, its "best moveset by
 * type coverage" panel…), not a per-page setting. See `useRaidMetric`. */
export type RaidMetric = 'dps' | 'tdo' | 'edps';

export const RAID_METRICS: ReadonlyArray<RaidMetric> = ['dps', 'tdo', 'edps'];

export const RAID_METRIC_LABEL: Record<RaidMetric, string> = {
	dps: 'DPS',
	tdo: 'TDO',
	edps: 'eDPS',
};

export const RAID_METRIC_BLURB: Record<RaidMetric, string> = {
	dps: 'Damage per second while alive. Ignores bulk and downtime — favours glass cannons.',
	tdo: 'Total damage one copy deals before fainting (DPS × survival). Rewards bulk; ignores boss HP and lobby time.',
	edps:
		'Damage per real second vs this exact boss, counting faints and the walk back from the lobby. ' +
		'The “will I beat the timer” number.',
};

export const RAID_METRIC_SORTS: ReadonlyArray<SortOption> = RAID_METRICS.map((key) => ({
	key,
	label: RAID_METRIC_LABEL[key],
	defaultDir: 'desc',
}));

/** Same formatting convention used everywhere a raid metric is displayed:
 * TDO is a big whole-number damage total, DPS/eDPS keep one decimal. */
export const fmtRaidMetric = (value: number, metric: RaidMetric): string =>
	metric === 'tdo' ? Math.round(value).toLocaleString() : value.toFixed(1);

/**
 * `entry`'s rank within its attacking-type list under whichever figure the
 * site is currently ranking by (see `useRaidMetric`) — dex-server bakes in
 * all three (`dpsRank`/`tdoRank`/`edpsRank`) precisely because a single
 * `rank` could only ever reflect one of them, silently misleading anyone
 * reading it under a different metric. `undefined` for a live-computed entry
 * (a specific boss's counters, a moveset combo's DPS) that was never part of
 * that pre-ranked feed to begin with.
 */
export const raidRankOf = (entry: DPSEntry, metric: RaidMetric): number | undefined =>
	metric === 'tdo' ? entry.tdoRank : metric === 'edps' ? entry.edpsRank : entry.dpsRank;

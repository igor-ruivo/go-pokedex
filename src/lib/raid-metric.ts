import type { SortOption } from '../components/SortBar';

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

import type { UseQueryResult } from '@tanstack/react-query';
import { useQueries } from '@tanstack/react-query';

import { PokemonTypes } from '../DTOs/PokemonTypes';
import { dpsUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

export type DPSEntry = {
	/** Weave DPS with the comprehensive / energy-from-damage corrections. */
	dps: number;
	/** Total damage output = dps × time-on-field (bulk-weighted). */
	tdo: number;
	/** Effective DPS: bossHP ÷ time-to-win, incl. faints + relobby downtime. */
	edps: number;
	fastMove: string;
	fastMoveDmg: number;
	chargedMove: string;
	chargedMoveDmg: number;
	speciesId: string;
	rank: number;
};

type DPSRank = Record<string, DPSEntry>;

interface RaidRankerData {
	/** Keyed by lowercased type name, plus '' for the overall (type-agnostic) ranking. */
	raidDPS: Record<string, DPSRank>;
	raidDPSFetchCompleted: boolean;
	raidDPSErrors: string;
}

const EMPTY: DPSRank = {};

const TYPE_KEYS = Object.values(PokemonTypes)
	.filter((v): v is string => typeof v === 'string')
	.map((t) => t.toLocaleLowerCase());

// One list per attacking type. The old generic "" list was dropped — a raid
// ranking only means something once you pick a type.
const RAID_DPS_KEYS = TYPE_KEYS;
const RAID_DPS_URLS = TYPE_KEYS.map((t) => dpsUrl(t));

const combine = (results: Array<UseQueryResult<DPSRank, Error>>): RaidRankerData => {
	const raidDPS: Record<string, DPSRank> = {};
	RAID_DPS_KEYS.forEach((key, i) => {
		raidDPS[key] = results[i]?.data ?? EMPTY;
	});
	return {
		raidDPS,
		raidDPSFetchCompleted: results.every((r) => r.isSuccess || r.isError),
		raidDPSErrors: results.map((r) => (r.error ? String(r.error) : '')).join(''),
	};
};

/** Pre-computed raid DPS/TDO/eDPS rankings, one list per attacking type. */
export const useRaidRanker = (): RaidRankerData =>
	useQueries({
		queries: RAID_DPS_URLS.map((url) => ({
			queryKey: ['raid-dps', url] as const,
			queryFn: ({ signal }: { signal: AbortSignal }) => fetchJson<DPSRank>(url, signal),
		})),
		combine,
	});

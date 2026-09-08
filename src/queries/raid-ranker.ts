import type { UseQueryResult } from '@tanstack/react-query';
import { useQueries } from '@tanstack/react-query';

import { PokemonTypes } from '../DTOs/PokemonTypes';
import { dpsUrl } from '../utils/Configs';
import { fetchJson } from '../utils/fetch-json';

export type DPSEntry = {
	dps: number;
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

// The overall ranking lives under the '' key and is served by `default-raid-dps-rank.json`.
const RAID_DPS_KEYS = [...TYPE_KEYS, ''];
const RAID_DPS_URLS = [...TYPE_KEYS.map((t) => dpsUrl(t)), dpsUrl('default')];

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

/** Pre-computed raid DPS rankings, one list per attacking type plus an overall list. */
export const useRaidRanker = (): RaidRankerData =>
	useQueries({
		queries: RAID_DPS_URLS.map((url) => ({
			queryKey: ['raid-dps', url] as const,
			queryFn: ({ signal }: { signal: AbortSignal }) => fetchJson<DPSRank>(url, signal),
		})),
		combine,
	});

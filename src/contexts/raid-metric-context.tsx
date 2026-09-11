import { createContext, useCallback, useContext, useState } from 'react';

import { RAID_METRICS, type RaidMetric } from '../lib/raid-metric';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

interface RaidMetricContextType {
	raidMetric: RaidMetric;
	updateRaidMetric: (next: RaidMetric) => void;
}

const RaidMetricContext = createContext<RaidMetricContextType | undefined>(undefined);

/**
 * Which raid figure (DPS / TDO / eDPS) the whole site ranks and displays by —
 * one persisted, device-wide choice. Every consumer (Rankings' raid tab, a
 * Pokémon's Counters tab, its "best moveset by type coverage" panel, the
 * Settings menu) reads and writes this same value, so switching it in one
 * place changes it everywhere else too.
 */
export const useRaidMetric = (): RaidMetricContextType => {
	const context = useContext(RaidMetricContext);
	if (!context) {
		throw new Error('useRaidMetric must be used within a RaidMetricProvider');
	}
	return context;
};

export const RaidMetricProvider = (props: React.PropsWithChildren<object>) => {
	const getDefaultRaidMetric = useCallback((): RaidMetric => {
		const cached = readPersistentValue(ConfigKeys.RaidMetric);
		return cached && (RAID_METRICS as ReadonlyArray<string>).includes(cached) ? (cached as RaidMetric) : 'dps';
	}, []);

	const [raidMetric, setRaidMetric] = useState(getDefaultRaidMetric);

	const updateRaidMetric = useCallback((next: RaidMetric) => {
		writePersistentValue(ConfigKeys.RaidMetric, next);
		setRaidMetric(next);
	}, []);

	return (
		<RaidMetricContext.Provider value={{ raidMetric, updateRaidMetric }}>{props.children}</RaidMetricContext.Provider>
	);
};

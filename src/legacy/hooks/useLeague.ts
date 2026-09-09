import { useCallback, useEffect, useState } from 'react';

import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';

export enum LeagueType {
	GREAT_LEAGUE,
	ULTRA_LEAGUE,
	MASTER_LEAGUE,
	CUSTOM_CUP,
	RAID,
}

const getDefaultLeagueType = () => {
	const cachedValue = readSessionValue(ConfigKeys.LastLeague);
	if (!cachedValue) {
		return undefined;
	}

	const typedValue = +cachedValue as LeagueType;

	return typedValue;
};

const useLeague = () => {
	const [league, setLeague] = useState<LeagueType>(getDefaultLeagueType() ?? LeagueType.RAID);

	useEffect(() => {
		writeSessionValue(ConfigKeys.LastLeague, JSON.stringify(league));
	}, [league]);

	const handleSetLeague = useCallback(
		(newLeague: LeagueType) => {
			setLeague(newLeague);
		},
		[setLeague]
	);

	return {
		league,
		handleSetLeague,
	};
};

export default useLeague;

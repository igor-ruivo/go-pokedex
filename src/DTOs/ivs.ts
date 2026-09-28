export interface ILeaguePerfectStats {
	A: number;
	D: number;
	S: number;
}

/** One league tier's full IV readout for a species. */
export interface ILeagueIvBlock {
	rank: number;
	lvl: number;
	cp: number;
	battle: ILeaguePerfectStats;
	perfect: ILeaguePerfectStats;
	perfectLvl: number;
	perfectCP: number;
	perfectBattle: ILeaguePerfectStats;
	worstBattle: ILeaguePerfectStats;
}

// One block per CP-cap tier, not 44 individually-optional `great*`/`ultra*`/
// `master*` fields — `great`/`ultra` are simply omitted (not present, not
// "present but undefined") whenever a species has no legal spread at all in
// that tier: its CP floor (level 1, 0/0/0 IVs) already exceeds the cap,
// which a Mega in Great/Ultra League hits routinely. Master is always
// uncapped (`league: Number.MAX_VALUE`), so it can never actually be
// missing and stays required.
export interface IIvPercents {
	great?: ILeagueIvBlock;
	ultra?: ILeagueIvBlock;
	master: ILeagueIvBlock;
}

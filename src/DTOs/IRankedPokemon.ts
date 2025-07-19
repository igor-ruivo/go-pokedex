export interface IRankedPokemon {
	speciesId: string;
	moveset: Array<string>;
	score: number;
	matchups: Array<MatchUp>;
	counters: Array<MatchUp>;
	lead: number;
	switch: number;
	charger: number;
	closer: number;
	consistency: number;
	attacker: number;
	rank: number;
	rankChange: number;
}

export type MatchUp = {
	opponent: string;
	rating: number;
};

export interface IRankedPokemon {
    speciesId: string;
    moveset: string[];
    score: number;
    matchups: MatchUp[];
    counters: MatchUp[];
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
}
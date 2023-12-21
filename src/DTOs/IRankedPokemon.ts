export interface IRankedPokemon {
    speciesId: string;
    rating: number;
    moveset: string[];
    matchups: MatchUp[];
    counters: MatchUp[];
    lead: number;
    switch: number;
    charger: number;
    closer: number;
    consistency: number;
    attacker: number;
    score: number;
    rank: number;
    rankChange: number;
}

export type MatchUp = {
    speciesId: string;
    rating: number;
}
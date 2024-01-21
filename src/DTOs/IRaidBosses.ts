import Dictionary from "../utils/Dictionary";

export interface IRaidBosses {
    bossesPerTier: Dictionary<Boss>;
}

interface Boss {
    speciesId: string;
    shiny: boolean;
}
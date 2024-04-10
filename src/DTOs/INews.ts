import Dictionary from "../utils/Dictionary";

export interface IEntry {
    speciesId: string;
    shiny: boolean;
    kind?: string;
    comment?: string;
}

export interface RocketGrunt {
    trainerId: string;
    type: string | undefined;
    phrase: string;
    tier1: string[];
    tier2: string[];
    tier3: string[];
    catchableTiers: number[];
}

export interface IPostEntry {
    title: string,
    subtitle?: string,
    imgUrl?: string,
    date: number,
    dateEnd?: number,
    raids?: IEntry[],
    wild?: IEntry[],
    bonuses?: string,
    researches?: IEntry[],
    eggs?: IEntry[],
    isSeason?: boolean,
    comment?: string
}

export interface IRaidEntry {
    date: string,
    entries: Dictionary<IEntry[]>
}
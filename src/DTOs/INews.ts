import Dictionary from "../utils/Dictionary";
import { IGamemasterPokemon } from "./IGamemasterPokemon";

export interface IEntry {
    speciesId: string;
    shiny: boolean;
    kind?: string;
    comment?: string;
}

export interface IRocketGrunt {
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



export const sortPosts = (e1: IPostEntry, e2: IPostEntry) => {
    if (e1.date.valueOf() === e2.date.valueOf()) {
        return (e1.dateEnd?.valueOf() ?? 0) - (e2.dateEnd?.valueOf() ?? 0);
    }

    return e1.date.valueOf() - e2.date.valueOf();
}

export const sortEntries = (e1: IEntry, e2: IEntry, gamemasterPokemon: Dictionary<IGamemasterPokemon>) => {
    if (gamemasterPokemon[e1.speciesId].isShadow && !gamemasterPokemon[e2.speciesId].isShadow) {
        return 1;
    }

    if (gamemasterPokemon[e1.speciesId].isShadow && !gamemasterPokemon[e2.speciesId].isShadow) {
        return -1;
    }

    if (e1.kind === e2.kind) {
        return gamemasterPokemon[e1.speciesId].dex - gamemasterPokemon[e2.speciesId].dex;
    }

    if (!e1.kind) {
        return -1;
    }

    if (!e2.kind) {
        return 1;
    }

    return e1.kind.localeCompare(e2.kind);
}
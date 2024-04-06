import Dictionary from "../utils/Dictionary";

export interface IEntry {
    speciesId: string;
    shiny: boolean;
    kind?: string;
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
    eggs?: IEntry[]
}

export interface IRaidEntry {
    date: string,
    entries: Dictionary<IEntry[]>
}
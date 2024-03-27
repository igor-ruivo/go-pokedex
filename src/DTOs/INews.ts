import Dictionary from "../utils/Dictionary";

export interface IEntry {
    speciesId: string;
    shiny: boolean;
}

export interface IPostEntry {
    date: string,
    dateEnd?: string,
    entries: IEntry[],
    kind?: string
}

export interface IRaidEntry {
    date: string,
    entries: Dictionary<IEntry[]>
}

export interface ISeason {
    date: string,
    entries: IEntry[],
    eggs: IEntry[]
}
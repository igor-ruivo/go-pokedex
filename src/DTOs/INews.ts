import Dictionary from "../utils/Dictionary";

export interface IEntry {
    speciesId: string;
    shiny: boolean;
}

export interface IPostEntry {
    date: number,
    dateEnd: number,
    entries: IEntry[],
    kind?: string
    eggs?: IEntry[]
}

export interface IRaidEntry {
    date: string,
    entries: Dictionary<IEntry[]>
}
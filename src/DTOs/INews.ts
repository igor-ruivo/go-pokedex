import type { GameLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from './IGamemasterPokemon';

export interface IEntry {
	speciesId: string;
	shiny: boolean;
	kind?: string | undefined;
	comment?: Record<GameLanguage, string>;
}

export interface IRocketGrunt {
	trainerId: string;
	type: string | undefined;
	phrase: Record<GameLanguage, string>;
	tier1: Array<string>;
	tier2: Array<string>;
	tier3: Array<string>;
	catchableTiers: Array<number>;
}

export interface IPostEntry {
	id: string;
	url: string;
	title: Record<GameLanguage, string>;
	subtitle: Record<GameLanguage, string>;
	startDate: number;
	endDate: number;
	dateRanges: Array<{ start: number; end: number }>;
	imageUrl: string;
	wild: Array<IEntry>;
	raids: Array<IEntry>;
	eggs: Array<IEntry>;
	researches: Array<IEntry>;
	incenses: Array<IEntry>;
	lures: Array<IEntry>;
	bonuses: Record<GameLanguage, Array<string>>;
	isRelevant?: boolean;
	isSpotlight?: boolean;
}

export interface IRaidEntry {
	date: string;
	entries: Record<string, Array<IEntry>>;
}

export const sortPosts = (e1: IPostEntry, e2: IPostEntry) => {
	if (e1.startDate.valueOf() === e2.startDate.valueOf()) {
		return (e1.endDate.valueOf() ?? 0) - (e2.endDate.valueOf() ?? 0);
	}

	return e1.startDate.valueOf() - e2.startDate.valueOf();
};

export const sortEntries = (
	e1: IEntry,
	e2: IEntry,
	gamemasterPokemon: Record<string, IGamemasterPokemon>
) => {
	if (
		gamemasterPokemon[e1.speciesId].isShadow &&
		!gamemasterPokemon[e2.speciesId].isShadow
	) {
		return 1;
	}

	if (
		gamemasterPokemon[e1.speciesId].isShadow &&
		!gamemasterPokemon[e2.speciesId].isShadow
	) {
		return -1;
	}

	if (e1.kind === e2.kind) {
		return (
			gamemasterPokemon[e1.speciesId].dex - gamemasterPokemon[e2.speciesId].dex
		);
	}

	if (!e1.kind) {
		return -1;
	}

	if (!e2.kind) {
		return 1;
	}

	return e1.kind.localeCompare(e2.kind);
};

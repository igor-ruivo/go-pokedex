import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import type { IPostEntry } from '../DTOs/INews';
import { fetchReachablePokemonIncludingSelf, sortByFamilyLine } from '../utils/pokemon-helper';

export type SpecialDayKind = 'community' | 'spotlight';

export interface SpecialDay {
	kind: SpecialDayKind;
	post: IPostEntry;
}

/** Whether an event post is a Community Day (its id says so, or its English title does; the research posts about one are not). */
export const isCommunityDay = (post: Pick<IPostEntry, 'id' | 'title'>): boolean => {
	if (/^communityday-/i.test(post.id)) return true;
	const title = post.title.en ?? '';
	return /community day/i.test(title) && !/research/i.test(title);
};

/** The first instant of the month `offset` months from the one `time` is in (the event feed's encoded wall clock, so UTC fields). */
const monthStart = (time: number, offset: number): number => {
	const d = new Date(time);
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1);
};

/**
 * The Community Days and Spotlight Hours of this month and the next, in the order they start. Ones that are over are kept:
 * the months are what is shown, not what is still to come.
 */
export const specialDays = (
	events: ReadonlyArray<IPostEntry>,
	spotlights: ReadonlyArray<IPostEntry>,
	now: number
): Array<SpecialDay> => {
	const from = monthStart(now, 0);
	const to = monthStart(now, 2);
	const days: Array<SpecialDay> = [
		...events.filter(isCommunityDay).map((post): SpecialDay => ({ kind: 'community', post })),
		...spotlights.map((post): SpecialDay => ({ kind: 'spotlight', post })),
	];
	return days
		.filter(({ post }) => post.startDate >= from && post.startDate < to)
		.sort((a, b) => a.post.startDate - b.post.startDate || a.post.endDate - b.post.endDate);
};

/** The line a trainer can reach from a species: itself, what it evolves into, and the Megas last (not the whole family). */
export const reachableLine = (
	pokemon: IGamemasterPokemon,
	dex: Record<string, IGamemasterPokemon>
): Array<IGamemasterPokemon> =>
	sortByFamilyLine([...fetchReachablePokemonIncludingSelf(pokemon, dex, undefined, true)], dex);

/** The first stage of the line a species belongs to (a Mega counts as the species it comes from). */
export const baseForm = (pokemon: IGamemasterPokemon, dex: Record<string, IGamemasterPokemon>): IGamemasterPokemon => {
	let current = pokemon;
	const seen = new Set<string>();
	for (;;) {
		seen.add(current.speciesId);
		const parentId = current.isMega ? current.baseSpecies : current.family?.parent;
		const parent = parentId ? dex[parentId] : undefined;
		if (!parent || parent.isShadow !== current.isShadow || seen.has(parent.speciesId)) return current;
		current = parent;
	}
};

/** Whether an event post is a Raid Hour (its English title says so). */
export const isRaidHour = (post: Pick<IPostEntry, 'title'>): boolean => /raid hour/i.test(post.title.en ?? '');

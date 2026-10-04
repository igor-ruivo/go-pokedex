import type { GameLanguage } from '../contexts/language-context';
import type { IEntry, IPostEntry } from '../DTOs/INews';
import type { IRankedPokemon } from '../DTOs/IRankedPokemon';

/** The kinds of content an event brings, in the order the Home card shows them. */
export const HIGHLIGHT_KINDS = ['raids', 'wild', 'researches', 'eggs'] as const;
export type HighlightKind = (typeof HIGHLIGHT_KINDS)[number];

export interface EventHighlight {
	kind: HighlightKind;
	/** Distinct species, in the event's own order, at most `perKind` of them. */
	ids: Array<string>;
	/** How many more there are than shown. */
	more: number;
}

/** What an event brings, as a few species per kind: raids, spawns, research encounters, eggs. Empty kinds are left out. */
export const eventHighlights = (
	post: Pick<IPostEntry, HighlightKind>,
	isKnown: (speciesId: string) => boolean,
	perKind = 3
): Array<EventHighlight> => {
	const out: Array<EventHighlight> = [];
	for (const kind of HIGHLIGHT_KINDS) {
		const distinct = [...new Set((post[kind] as ReadonlyArray<IEntry>).map((e) => e.speciesId))].filter(isKnown);
		if (distinct.length === 0) continue;
		out.push({ kind, ids: distinct.slice(0, perKind), more: Math.max(0, distinct.length - perKind) });
	}
	return out;
};

/**
 * The events the Home page features: the ones that have not ended, in the player's language, the live ones first (those ending
 * soonest first) and then the coming ones in order of their start. A season-long post is left out, it is not news; one with a
 * picture is preferred over one without when two start together.
 */
export const featuredEvents = (
	posts: ReadonlyArray<IPostEntry>,
	now: number,
	gl: GameLanguage,
	limit: number,
	skipId?: string
): Array<IPostEntry> => {
	const usable = posts.filter(
		(p) => p && p.id !== skipId && p.endDate >= now && p.availableLocales.includes(gl) && !!(p.title[gl] || p.subtitle[gl])
	);
	const live = usable.filter((p) => p.startDate <= now).sort((a, b) => a.endDate - b.endDate);
	const coming = usable
		.filter((p) => p.startDate > now)
		.sort((a, b) => a.startDate - b.startDate || Number(!!b.imageUrl) - Number(!!a.imageUrl));
	return [...live, ...coming].slice(0, limit);
};

/** The `count` best-ranked species of a league's ranking (rank 1 first). */
export const topRanked = (rankList: Record<string, Pick<IRankedPokemon, 'rank'>>, count: number): Array<string> =>
	Object.entries(rankList)
		.sort((a, b) => a[1].rank - b[1].rank)
		.slice(0, count)
		.map(([speciesId]) => speciesId);

/** The first `count` distinct species of a list of entries that the game master knows. */
export const distinctSpecies = (
	entries: ReadonlyArray<Pick<IEntry, 'speciesId'>>,
	isKnown: (speciesId: string) => boolean,
	count: number
): Array<string> => [...new Set(entries.map((e) => e.speciesId))].filter(isKnown).slice(0, count);

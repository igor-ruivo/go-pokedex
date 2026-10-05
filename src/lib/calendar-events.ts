import { GameLanguage } from '../contexts/language-context';
import type { IEntry, IPostEntry } from '../DTOs/INews';
import type { IRichBlock } from '../DTOs/IRichText';
import type { ILeekduckMaxMonday, ILeekduckSpecialRaidBoss, ILeekduckSpotlightHour } from '../queries/calendar';

// LeekDuck (unlike pokemongo.com) has no per-locale URLs — every GameLanguage
// key just repeats the one English page. Same `Object.values` (not
// `Object.keys`) reasoning as the `bonuses` builder below applies here too.
export const everyLanguage = (value: string): Record<GameLanguage, string> =>
	Object.values(GameLanguage).reduce(
		(acc, key) => {
			acc[key] = value;
			return acc;
		},
		{} as Record<GameLanguage, string>
	);

/**
 * Leekduck Spotlight Hours behave like a tiny event of their own — the
 * legacy (pre-revamp) site folded them straight into the Events feed the
 * same way, rather than giving them a separate section, and `wild:
 * s.pokemons` is what lets them double as a "current spawn" on the Spawns
 * tab for free: it already scans every post's `wild` field, so a Spotlight
 * Hour's featured Pokémon show up there with zero extra plumbing.
 *
 * Exported from here (not Calendar.tsx) so useUnseenEventsCount can build
 * the exact same merged post list the Events tab itself shows — otherwise
 * the nav badge and the tab it's counting can silently disagree.
 */
export const spotlightToPost = (s: ILeekduckSpotlightHour): IPostEntry => ({
	id: s.rawUrl,
	url: everyLanguage(s.rawUrl),
	title: s.title,
	subtitle: s.title,
	startDate: s.date,
	endDate: s.dateEnd,
	dateRanges: [{ start: s.date, end: s.dateEnd }],
	imageUrl: s.imgUrl,
	wild: s.pokemons,
	raids: [],
	eggs: [],
	researches: [],
	incenses: [],
	lures: [],
	// `Object.values`, not `Object.keys` — GameLanguage's member *names* don't
	// all match their runtime string *values* (`ptbr` names the member whose
	// value is `'pt_br'`), and both `s.bonus` and the `Record<GameLanguage,
	// …>` being built here are keyed by the value. Keying this by the name
	// instead silently wrote/read a bogus `'ptbr'` key next to the real
	// `'en'`/`'pt_br'` ones — `pt_br` bonus text would never resolve.
	bonuses: Object.values(GameLanguage).reduce(
		(acc, key) => {
			const bonus = s.bonus?.[key];
			acc[key] = bonus ? [bonus] : [];
			return acc;
		},
		{} as Record<GameLanguage, Array<string>>
	),
	availableLocales: Object.values(GameLanguage),
	source: 'leekduck',
	isSpotlight: true,
});

/**
 * A Max Monday behaves like a Spotlight Hour of its own: a one-day event (it goes into the same Events feed) that brings its
 * Dynamax Pokémon to Max Battles. Its picture is LeekDuck's Max Battles one.
 */
export const maxMondayToPost = (m: ILeekduckMaxMonday): IPostEntry => ({
	id: m.rawUrl,
	url: everyLanguage(m.rawUrl),
	title: m.title,
	subtitle: m.title,
	startDate: m.date,
	endDate: m.dateEnd,
	dateRanges: [{ start: m.date, end: m.dateEnd }],
	imageUrl: m.imgUrl,
	wild: [],
	raids: [],
	eggs: [],
	researches: [],
	incenses: [],
	lures: [],
	maxBattles: m.pokemons,
	// the season post's text, in each language (English where a language has none)
	bonuses: Object.values(GameLanguage).reduce(
		(acc, key) => {
			acc[key] = m.bonuses?.[key] ?? m.bonuses?.[GameLanguage.en] ?? [];
			return acc;
		},
		{} as Record<GameLanguage, Array<string>>
	),
	bonusBlocks: Object.values(GameLanguage).reduce(
		(acc, key) => {
			acc[key] = m.bonusBlocks?.[key] ?? m.bonusBlocks?.[GameLanguage.en] ?? [];
			return acc;
		},
		{} as Record<GameLanguage, Array<IRichBlock>>
	),
	availableLocales: Object.values(GameLanguage),
	source: 'leekduck',
});

/** Everything LeekDuck adds to the Events feed as posts of its own: the Spotlight Hours and the Max Mondays. */
export const leekduckPosts = (
	spotlightHours: ReadonlyArray<ILeekduckSpotlightHour>,
	maxMondays: ReadonlyArray<ILeekduckMaxMonday>
): Array<IPostEntry> => [...spotlightHours.map(spotlightToPost), ...maxMondays.map(maxMondayToPost)];

/** Leekduck special-boss windows behave like tiny raid-only events. */
export const specialToPost = (s: ILeekduckSpecialRaidBoss): IPostEntry => ({
	id: s.rawUrl,
	url: everyLanguage(s.rawUrl),
	title: s.title,
	subtitle: s.title,
	startDate: s.date,
	endDate: s.dateEnd,
	dateRanges: [{ start: s.date, end: s.dateEnd }],
	imageUrl: '',
	wild: [],
	raids: s.raids,
	eggs: [],
	researches: [],
	incenses: [],
	lures: [],
	// `Object.values`, not `Object.keys` — GameLanguage's member *names*
	// don't all match their runtime string *values* (see spotlightToPost's
	// own note); harmless here since every value is just `[]` regardless of
	// which key name it lands on, but keyed consistently with the real
	// `GameLanguage` values all the same.
	bonuses: Object.values(GameLanguage).reduce(
		(acc, key) => {
			acc[key] = [];
			return acc;
		},
		{} as Record<GameLanguage, Array<string>>
	),
	availableLocales: Object.values(GameLanguage),
	source: 'leekduck',
});

/**
 * The raid bosses of the Raids tab's "Now" slot: the current rotation's bosses, then the bosses of every event or special
 * window that is on right now (a boss listed twice is kept once, with the rotation's entry first).
 */
export const nowRaidEntries = (input: {
	posts: ReadonlyArray<IPostEntry>;
	specialBosses: ReadonlyArray<ILeekduckSpecialRaidBoss>;
	currentBosses: ReadonlyArray<IEntry>;
	language: GameLanguage;
	now: number;
}): Array<IEntry> => {
	const raidPosts = [
		...input.posts.filter((p) => p && (p.raids?.length ?? 0) > 0 && p.availableLocales.includes(input.language)),
		...input.specialBosses.map(specialToPost),
	].filter((p) => p.endDate >= input.now);

	const seen = new Set<string>();
	const out: Array<IEntry> = [];
	const add = (e: IEntry) => {
		if (seen.has(e.speciesId)) return;
		seen.add(e.speciesId);
		out.push(e);
	};
	input.currentBosses.forEach(add);
	for (const p of raidPosts) {
		if (input.now >= p.startDate && input.now < p.endDate) p.raids.forEach(add);
	}
	return out;
};

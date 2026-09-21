import { GameLanguage } from '../contexts/language-context';
import type { IPostEntry } from '../DTOs/INews';
import type { ILeekduckSpotlightHour } from '../queries/calendar';

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
	isSpotlight: true,
});

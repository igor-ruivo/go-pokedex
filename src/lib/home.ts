import type { GameLanguage } from '../contexts/language-context';
import type { IEntry, IPostEntry } from '../DTOs/INews';
import type { IRankedPokemon } from '../DTOs/IRankedPokemon';

/** The kinds of content an event brings, in the order the Home card shows them. */
export const HIGHLIGHT_KINDS = ['raids', 'maxBattles', 'wild', 'researches', 'eggs'] as const;
export type HighlightKind = (typeof HIGHLIGHT_KINDS)[number];

export interface EventHighlight {
	kind: HighlightKind;
	/** Distinct species, in the event's own order, at most `perKind` of them. */
	ids: Array<string>;
	/** How many more there are than shown. */
	more: number;
}

/**
 * The events the Home page features: the ones that have not ended, in the player's language, the live ones first (those ending
 * soonest first) and then the coming ones in order of their start. A season-long post is left out, it is not news; one with a
 * picture is preferred over one without when two start together.
 */
export const featuredEvents = (
	posts: ReadonlyArray<IPostEntry>,
	now: number,
	gl: GameLanguage,
	skipId?: string
): Array<IPostEntry> => {
	const usable = posts.filter(
		(p) =>
			p && p.id !== skipId && p.endDate >= now && p.availableLocales.includes(gl) && !!(p.title[gl] || p.subtitle[gl])
	);
	const live = usable.filter((p) => p.startDate <= now).sort((a, b) => a.endDate - b.endDate);
	const coming = usable
		.filter((p) => p.startDate > now)
		.sort((a, b) => a.startDate - b.startDate || Number(!!b.imageUrl) - Number(!!a.imageUrl));
	return [...live, ...coming];
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

/** A species an event or a line-up brings, and whether it can be shiny. */
export interface ShinyEntry {
	speciesId: string;
	shiny: boolean;
	/** For a Max Battle Pokémon, its form: `dynamax` or `gigantamax`. */
	kind?: string;
}

/**
 * The first `limit` distinct species of a list of entries that the game master knows, each with its shiny flag (a species
 * listed twice is shiny if any of its entries is). `more` is how many were left out.
 */
export const speciesWithShiny = (
	entries: ReadonlyArray<Pick<IEntry, 'speciesId' | 'shiny' | 'kind'>>,
	isKnown: (speciesId: string) => boolean,
	limit: number
): { shown: Array<ShinyEntry>; more: number } => {
	const byId = new Map<string, { shiny: boolean; kind?: string | undefined }>();
	for (const e of entries) {
		if (!isKnown(e.speciesId)) continue;
		const before = byId.get(e.speciesId);
		// a Max Battle Pokémon keeps its form (Dynamax or Gigantamax), so that it can be drawn as one
		const maxForm = e.kind === 'dynamax' || e.kind === 'gigantamax' ? e.kind : undefined;
		byId.set(e.speciesId, {
			shiny: (before?.shiny ?? false) || !!e.shiny,
			...((before?.kind ?? maxForm) ? { kind: before?.kind ?? maxForm } : {}),
		});
	}
	const all = [...byId].map(([speciesId, { shiny, kind }]) => ({ speciesId, shiny, ...(kind ? { kind } : {}) }));
	return { shown: all.slice(0, limit), more: Math.max(0, all.length - limit) };
};

/** The `count` best attackers of a raid list under the metric in use (rank 1 first); entries without that rank come last. */
export const topAttackers = <T extends { speciesId: string }>(
	list: Record<string, T>,
	rankOf: (entry: T) => number | undefined,
	count: number
): Array<T> =>
	Object.values(list)
		.sort((a, b) => (rankOf(a) ?? Number.MAX_SAFE_INTEGER) - (rankOf(b) ?? Number.MAX_SAFE_INTEGER))
		.slice(0, count);

/** A random index in `[0, length)` other than `not` (when there is another to choose). */
export const randomIndexOtherThan = (
	length: number,
	not: number | undefined,
	random: () => number = Math.random
): number => {
	if (length <= 1) return 0;
	let index = Math.floor(random() * length);
	if (index === not) index = (index + 1 + Math.floor(random() * (length - 1))) % length;
	return index;
};

/**
 * The raid bosses of the Home page, in the order they fill the room: the higher tiers (5, Mega and any special kind) first, Shadow or not, so
 * they are always there; then tier 3, then tier 1, those two without their Shadow bosses.
 */
const HOME_RAID_TIERS: ReadonlyArray<{ match: (kind?: string) => boolean }> = [
	{ match: (k) => k !== '3' && k !== '1' },
	{ match: (k) => k === '3' },
	{ match: (k) => k === '1' },
];

export const homeRaidEntries = <T extends Pick<IEntry, 'speciesId' | 'kind'>>(entries: ReadonlyArray<T>): Array<T> =>
	HOME_RAID_TIERS.flatMap((tier) => {
		const matching = entries.filter((e) => tier.match(e.kind));

		return [
			...matching.filter((e) => !e.speciesId.includes('_shadow')),
			...matching.filter((e) => e.speciesId.includes('_shadow')),
		];
	});

const ROCKET_LEADERS = /giovanni|sierra|cliff|arlo/i;

/** The Shadow Pokémon of a Team GO Rocket line-up that can be caught after the battle: the leaders' first, then the grunts'. */
export const catchableRocketEntries = (
	grunts: ReadonlyArray<{
		trainerId: string;
		tier1: ReadonlyArray<string>;
		tier2: ReadonlyArray<string>;
		tier3: ReadonlyArray<string>;
		shinyPokemon?: ReadonlyArray<string> | undefined;
		catchableTiers: ReadonlyArray<number>;
	}>
): Array<ShinyEntry> => {
	const leaders = grunts.filter((g) => ROCKET_LEADERS.test(g.trainerId));
	const rest = grunts.filter((g) => !ROCKET_LEADERS.test(g.trainerId));
	return [...leaders, ...rest].flatMap((g) => {
		const tiers = [g.tier1, g.tier2, g.tier3];
		return g.catchableTiers.flatMap((i) =>
			(tiers[i] ?? []).map((speciesId) => ({ speciesId, shiny: !!g.shinyPokemon?.includes(speciesId) }))
		);
	});
};

/** Egg distances from the one people hatch for the most, down to the short ones. */
const EGG_ORDER = ['10', '12', '7', '5', '2', '1'];

export const orderedEggEntries = <T extends Pick<IEntry, 'kind'>>(entries: ReadonlyArray<T>): Array<T> =>
	[...entries].sort((a, b) => {
		const rank = (e: T) => {
			const i = EGG_ORDER.indexOf(e.kind ?? '');
			return i < 0 ? EGG_ORDER.length : i;
		};
		return rank(a) - rank(b);
	});

/** "2023–2026": from the year the project started to the current one (never earlier than 2026). */
export const copyrightYears = (now: Date = new Date()): string => {
	const year = Math.max(2026, now.getFullYear());
	return `2023–${year}`;
};

/**
 * How many faces a block of `rows` rows with `columns` columns shows, out of `total`, when the last cell is kept for the "+N"
 * (so a list that does not fit never ends on a face). All of them when they fit; never more than `max` faces.
 */
export const facesThatFit = (
	total: number,
	columns: number,
	rows: number,
	max: number
): { faces: number; more: number } => {
	const cells = Math.max(1, columns) * Math.max(1, rows);
	const capped = Math.min(total, max);
	if (capped <= cells && total <= max) return { faces: capped, more: 0 };
	const faces = Math.min(cells - 1, max);
	return { faces, more: total - faces };
};

/**
 * The one Pokémon each "in the game right now" card shows big. `speciesId` is what the game master is asked for, `shiny` marks the
 * sparkle, `kind` carries a Max Battle Pokémon's form (`dynamax` / `gigantamax`).
 */
export interface HeroPick {
	speciesId: string;
	shiny: boolean;
	kind?: string | undefined;
}

const heroOf = (e: Pick<IEntry, 'speciesId' | 'shiny' | 'kind'>): HeroPick => ({
	speciesId: e.speciesId,
	shiny: !!e.shiny,
	...(e.kind ? { kind: e.kind } : {}),
});

/**
 * The spawn the Spawns card shows: the first species of the most recent event that has spawns — an event that is on right now
 * (the one that started last) comes before any that is only coming (the one that starts first).
 */
export const spawnHero = (
	events: ReadonlyArray<Pick<IPostEntry, 'startDate' | 'wild'>>,
	now: number,
	isKnown: (speciesId: string) => boolean
): HeroPick | undefined => {
	const withSpawns = events.filter((e) => e.wild.some((w) => isKnown(w.speciesId)));
	const live = withSpawns.filter((e) => e.startDate <= now).sort((a, b) => b.startDate - a.startDate);
	const coming = withSpawns.filter((e) => e.startDate > now).sort((a, b) => a.startDate - b.startDate);
	const entry = (live[0] ?? coming[0])?.wild.find((w) => isKnown(w.speciesId));
	return entry && heroOf(entry);
};

/**
 * The raid boss the Raids card shows: the best (in the calendar's own order, `sort`) of the special tiers that are not Megas — the
 * five-star bosses and any other special kind; or else a Mega; or else whoever comes first. Within each of those a Shadow boss is
 * given no priority: it is chosen only when the group has nothing else.
 */
export const raidHero = <T extends Pick<IEntry, 'speciesId' | 'shiny' | 'kind'>>(
	entries: ReadonlyArray<T>,
	isKnown: (speciesId: string) => boolean,
	sort: (list: ReadonlyArray<T>) => Array<T>,
	isShadow: (speciesId: string) => boolean = () => false
): HeroPick | undefined => {
	const usable = entries.filter((e) => isKnown(e.speciesId));
	const best = (group: ReadonlyArray<T>): T | undefined => {
		const plain = group.filter((e) => !isShadow(e.speciesId));
		return sort(plain.length > 0 ? plain : group)[0];
	};
	const special = usable.filter((e) => e.kind !== 'mega' && e.kind !== '3' && e.kind !== '1');
	const pick = best(special) ?? best(usable.filter((e) => e.kind === 'mega')) ?? usable[0];
	return pick && heroOf(pick);
};

/** The Max Battle Pokémon the Max Battle card shows: a Gigantamax one, or else the one of the highest tier. */
export const maxBattleHero = <T extends Pick<IEntry, 'speciesId' | 'shiny' | 'kind' | 'tier'>>(
	entries: ReadonlyArray<T>,
	isKnown: (speciesId: string) => boolean
): HeroPick | undefined => {
	const usable = entries.filter((e) => isKnown(e.speciesId));
	const pick =
		usable.find((e) => e.kind === 'gigantamax') ??
		[...usable].sort((a, b) => Number(b.tier ?? 0) - Number(a.tier ?? 0))[0];
	return pick && heroOf(pick);
};

/** The Shadow Pokémon the Rockets card shows: the one Giovanni lets you catch, or else the first catchable of the line-ups. */
export const rocketHero = (
	grunts: Parameters<typeof catchableRocketEntries>[0],
	isKnown: (speciesId: string) => boolean
): HeroPick | undefined => {
	const giovanni = grunts.filter((g) => /giovanni/i.test(g.trainerId));
	const entry =
		catchableRocketEntries(giovanni).find((e) => isKnown(e.speciesId)) ??
		catchableRocketEntries(grunts).find((e) => isKnown(e.speciesId));
	return entry && heroOf(entry);
};

/**
 * The egg Pokémon the Eggs card shows, `count` of them (one, or more when its card is stretched wide): the best of the 10 km ones in the
 * calendar's own order (`sort`), then the next best of those, and when there are not enough of them the best of the other distances; or
 * else, with no 10 km egg at all, the first of the usual egg order. Each species once.
 */
export const eggHeroes = <T extends Pick<IEntry, 'speciesId' | 'shiny' | 'kind'>>(
	entries: ReadonlyArray<T>,
	isKnown: (speciesId: string) => boolean,
	sort: (list: ReadonlyArray<T>) => Array<T>,
	count: number
): Array<HeroPick> => {
	const usable = entries.filter((e) => isKnown(e.speciesId));
	const ten = usable.filter((e) => e.kind === '10');
	const rest = usable.filter((e) => e.kind !== '10');
	const ordered = (ten.length > 0 ? [...sort(ten), ...sort(rest)] : orderedEggEntries(usable)).sort(
		(a, b) => Number(a.speciesId === 'dratini') - Number(b.speciesId === 'dratini')
	); // dratini's sprite is too much to the right...
	const seen = new Set<string>();
	const picks: Array<HeroPick> = [];
	for (const e of ordered) {
		if (picks.length >= count) break;
		if (seen.has(e.speciesId)) continue;
		seen.add(e.speciesId);
		picks.push(heroOf(e));
	}
	return picks;
};

/** Every kind of content an event can bring (the Pokémon of `HIGHLIGHT_KINDS`, and the incenses and lures too). */
export const CONTENT_KINDS = [...HIGHLIGHT_KINDS, 'incenses', 'lures'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/** The kinds of content an event brings, in the card's order: the ones it has at least one entry of. */
export const eventContentKinds = (post: Partial<Pick<IPostEntry, ContentKind>>): Array<ContentKind> =>
	CONTENT_KINDS.filter((kind) => ((post[kind] ?? []) as ReadonlyArray<IEntry>).length > 0);

/** The raid tiers an event's egg icon can stand for, the one that outranks the others first: legendary, Mega, tier 3, tier 1. */
export const RAID_EGG_PRIORITY = ['5', 'mega', '3', '1'] as const;
export type RaidEggKind = (typeof RAID_EGG_PRIORITY)[number];

/**
 * The raid egg that stands for everything an event's raids bring: the highest tier it has (a legendary and a tier 1: the legendary;
 * a Mega and a tier 1: the Mega; only tier 3: tier 3). Any other kind of boss (a primal, an elite…) counts as the top tier.
 */
export const raidEggKind = (raids: ReadonlyArray<Pick<IEntry, 'kind'>>): RaidEggKind =>
	RAID_EGG_PRIORITY.find((tier) => raids.some((e) => e.kind === tier)) ?? '5';

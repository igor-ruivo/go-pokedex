import { useSyncExternalStore } from 'react';

import { isTeamLeague, type TeamLeague } from '../DTOs/ITeamBuilder';
import { idbGet, idbNotifyOtherTabs, idbSet, idbWatch, requestPersistentStorage } from '../utils/idb-store';
import { isSlotIvs, isSlotLevel, slotIdentityKey, type SlotIvs } from './team-analysis';

/**
 * Favorite teams, kept in IndexedDB (read once at startup — see `hydrateFavorites`). A favorite is stored as the species ids and the move ids of its three
 * Pokémon (moves by id, not name, so they survive translation changes), the IVs and level picked for any of them, the league
 * it was saved for, and when. Species, moves, picked IVs and picked level are all part of a team's identity — the same Pokémon
 * with other moves, IVs or level is another team — while the order they are listed in is not. Scores are never
 * stored — they are recomputed, so they stay right whenever the ratings change.
 *
 * Every storage access is guarded: storage can be missing or blocked (private windows, blocked site data), and
 * the page has to work the same without it (favorites then just last for the page's lifetime).
 */
const KEY = 'user:favorite-teams';

export interface FavoriteMember {
	speciesId: string;
	/** `[fast, charged 1, charged 2?]` as move ids. */
	moveset: Array<string>;
	/** IVs picked in the builder; absent: the league's best spread. */
	ivs?: SlotIvs;
	/** Level picked in the builder; absent: the highest the CP cap allows. */
	level?: number;
	/** A Best Buddy (level ceiling 51). */
	buddy?: true;
	/** A Super Max Mega (two more levels). */
	superMega?: true;
}

export interface FavoriteTeam {
	league: TeamLeague;
	members: Array<FavoriteMember>;
	/** `Date.now()` when it was favorited. */
	addedAt: number;
}

type Members = ReadonlyArray<{
	speciesId: string;
	moveset: ReadonlyArray<string>;
	ivs?: SlotIvs | undefined;
	level?: number | undefined;
	buddy?: true | undefined;
	superMega?: true | undefined;
}>;

/** Puts one member in its canonical form (see `canonicalSlot`), so picks that only restate a default don't make a team another team. */
type Canon = (member: Members[number]) => Members[number];
const asIs: Canon = (member) => member;

/**
 * The same three Pokémon with the same moves and the same IVs are the same team, whatever order they were listed
 * in. Each Pokémon's text carries its own moves and IVs, so sorting the texts keeps them attached to it.
 */
export const favoriteKey = (league: TeamLeague, members: Members, canon: Canon = asIs): string =>
	`${league}:${members
		.map((m) => slotIdentityKey(canon(m)))
		.sort()
		.join('|')}`;

const isMember = (value: unknown): value is FavoriteMember =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as FavoriteMember).speciesId === 'string' &&
	Array.isArray((value as FavoriteMember).moveset) &&
	(value as FavoriteMember).moveset.every((m) => typeof m === 'string') &&
	((value as FavoriteMember).ivs === undefined || isSlotIvs((value as FavoriteMember).ivs)) &&
	((value as FavoriteMember).level === undefined || isSlotLevel((value as FavoriteMember).level));

const parse = (stored: unknown): Array<FavoriteTeam> => {
	if (!Array.isArray(stored)) return [];
	return stored.flatMap((entry: unknown): Array<FavoriteTeam> => {
		if (typeof entry !== 'object' || entry === null) return [];
		const { league, members, addedAt } = entry as Partial<FavoriteTeam>;
		if (!isTeamLeague(league) || !Array.isArray(members) || members.length !== 3 || !members.every(isMember)) return [];
		return [{ league, members, addedAt: typeof addedAt === 'number' ? addedAt : 0 }];
	});
};

let favorites: Array<FavoriteTeam> = [];
const listeners = new Set<() => void>();

const load = (): Array<FavoriteTeam> => favorites;

const commit = (next: Array<FavoriteTeam>) => {
	favorites = next;
	void idbSet(KEY, next)
		.then(() => idbNotifyOtherTabs(KEY))
		.catch(() => {
			// storage unavailable — the favorites last for this page only
		});
	requestPersistentStorage();
	listeners.forEach((listener) => listener());
};

let watching = false;

/** Loads the favorites. Awaited at startup, before anything renders. */
export const hydrateFavorites = async (): Promise<void> => {
	favorites = parse(await idbGet<unknown>(KEY).catch(() => undefined));
	if (!watching) {
		watching = true;
		// Another tab changing the favorites.
		idbWatch(KEY, () => {
			void idbGet<unknown>(KEY)
				.then((changed) => {
					favorites = parse(changed);
					listeners.forEach((listener) => listener());
					return undefined;
				})
				.catch(() => undefined);
		});
	}
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => void listeners.delete(listener);
};

/** All favorites (every league), oldest first. Re-renders when one is added or removed, here or in another tab. */
export const useFavoriteTeams = (): ReadonlyArray<FavoriteTeam> => useSyncExternalStore(subscribe, load, () => []);

export const isFavoriteTeam = (
	all: ReadonlyArray<FavoriteTeam>,
	league: TeamLeague,
	members: Members,
	canon: Canon = asIs
): boolean => {
	const key = favoriteKey(league, members, canon);
	return all.some((f) => favoriteKey(f.league, f.members, canon) === key);
};

/** Adds the team to the favorites, or removes it if it is already there. */
export const toggleFavoriteTeam = (league: TeamLeague, members: Members, canon: Canon = asIs) => {
	const key = favoriteKey(league, members, canon);
	const current = load();
	if (current.some((f) => favoriteKey(f.league, f.members, canon) === key)) {
		commit(current.filter((f) => favoriteKey(f.league, f.members, canon) !== key));
		return;
	}
	commit([
		...current,
		{
			league,
			members: members.map(canon).map((m) => ({
				speciesId: m.speciesId,
				moveset: [...m.moveset],
				...(m.ivs ? { ivs: [...m.ivs] as SlotIvs } : {}),
				...(m.level !== undefined ? { level: m.level } : {}),
				...(m.buddy ? { buddy: true as const } : {}),
				...(m.superMega ? { superMega: true as const } : {}),
			})),
			addedAt: Date.now(),
		},
	]);
};

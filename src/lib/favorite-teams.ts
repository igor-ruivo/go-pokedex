import { useSyncExternalStore } from 'react';

import { isTeamLeague, type TeamLeague } from '../DTOs/ITeamBuilder';

/**
 * Favorite teams, kept in localStorage. A favorite is stored as the species ids and the move ids of its three
 * Pokémon (moves by id, not name, so they survive translation changes; and because moves can be changed in the
 * builder, the moves are part of the team's identity), the league it was saved for, and when. Scores are never
 * stored — they are recomputed, so they stay right whenever the ratings change.
 *
 * Every storage access is guarded: storage can be missing or blocked (private windows, blocked site data), and
 * the page has to work the same without it (favorites then just last for the page's lifetime).
 */
const KEY = 'go-pokedex:favorite-teams';

export interface FavoriteMember {
	speciesId: string;
	/** `[fast, charged 1, charged 2?]` as move ids. */
	moveset: Array<string>;
}

export interface FavoriteTeam {
	league: TeamLeague;
	members: Array<FavoriteMember>;
	/** `Date.now()` when it was favorited. */
	addedAt: number;
}

type Members = ReadonlyArray<{ speciesId: string; moveset: ReadonlyArray<string> }>;

/** The same three Pokémon with the same moves are the same team, whatever order they were listed in. */
export const favoriteKey = (league: TeamLeague, members: Members): string =>
	`${league}:${members
		.map((m) => [m.speciesId, ...m.moveset].join('-'))
		.sort()
		.join('|')}`;

const isMember = (value: unknown): value is FavoriteMember =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as FavoriteMember).speciesId === 'string' &&
	Array.isArray((value as FavoriteMember).moveset) &&
	(value as FavoriteMember).moveset.every((m) => typeof m === 'string');

const parse = (raw: string | null): Array<FavoriteTeam> => {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((entry: unknown): Array<FavoriteTeam> => {
			if (typeof entry !== 'object' || entry === null) return [];
			const { league, members, addedAt } = entry as Partial<FavoriteTeam>;
			if (!isTeamLeague(league) || !Array.isArray(members) || members.length !== 3 || !members.every(isMember)) return [];
			return [{ league, members, addedAt: typeof addedAt === 'number' ? addedAt : 0 }];
		});
	} catch {
		return [];
	}
};

let favorites: Array<FavoriteTeam> | undefined;
const listeners = new Set<() => void>();

const load = (): Array<FavoriteTeam> => {
	if (favorites === undefined) {
		try {
			favorites = parse(window.localStorage.getItem(KEY));
		} catch {
			favorites = [];
		}
	}
	return favorites;
};

const commit = (next: Array<FavoriteTeam>) => {
	favorites = next;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		// storage unavailable — the favorites last for this page only
	}
	listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	// Another tab changing the favorites.
	const onStorage = (event: StorageEvent) => {
		if (event.key !== KEY) return;
		favorites = parse(event.newValue);
		listener();
	};
	window.addEventListener('storage', onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener('storage', onStorage);
	};
};

/** All favorites (every league), oldest first. Re-renders when one is added or removed, here or in another tab. */
export const useFavoriteTeams = (): ReadonlyArray<FavoriteTeam> => useSyncExternalStore(subscribe, load, () => []);

export const isFavoriteTeam = (all: ReadonlyArray<FavoriteTeam>, league: TeamLeague, members: Members): boolean => {
	const key = favoriteKey(league, members);
	return all.some((f) => favoriteKey(f.league, f.members) === key);
};

/** Adds the team to the favorites, or removes it if it is already there. */
export const toggleFavoriteTeam = (league: TeamLeague, members: Members) => {
	const key = favoriteKey(league, members);
	const current = load();
	if (current.some((f) => favoriteKey(f.league, f.members) === key)) {
		commit(current.filter((f) => favoriteKey(f.league, f.members) !== key));
		return;
	}
	commit([
		...current,
		{
			league,
			members: members.map((m) => ({ speciesId: m.speciesId, moveset: [...m.moveset] })),
			addedAt: Date.now(),
		},
	]);
};

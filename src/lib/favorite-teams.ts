import { useSyncExternalStore } from 'react';

import { isTeamLeague, type TeamLeague } from '../DTOs/ITeamBuilder';
import { isSlotIvs, isSlotLevel, slotIdentityKey, type SlotIvs } from './team-analysis';

/**
 * Favorite teams, kept in localStorage. A favorite is stored as the species ids and the move ids of its three
 * Pokémon (moves by id, not name, so they survive translation changes), the IVs and level picked for any of them, the league
 * it was saved for, and when. Species, moves, picked IVs and picked level are all part of a team's identity — the same Pokémon
 * with other moves, IVs or level is another team — while the order they are listed in is not. Scores are never
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
	/** IVs picked in the builder; absent: the league's best spread. */
	ivs?: SlotIvs;
	/** Level picked in the builder; absent: the highest the CP cap allows. */
	level?: number;
	/** A Best Buddy (level ceiling 51). */
	buddy?: true;
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

const parse = (raw: string | null): Array<FavoriteTeam> => {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.flatMap((entry: unknown): Array<FavoriteTeam> => {
			if (typeof entry !== 'object' || entry === null) return [];
			const { league, members, addedAt } = entry as Partial<FavoriteTeam>;
			if (!isTeamLeague(league) || !Array.isArray(members) || members.length !== 3 || !members.every(isMember))
				return [];
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
			})),
			addedAt: Date.now(),
		},
	]);
};

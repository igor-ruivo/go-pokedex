import { useSyncExternalStore } from 'react';

import { isTeamLeague, type TeamLeague } from '../DTOs/ITeamBuilder';
import { isSlotIvs, isSlotLevel, slotIdentityKey, type SlotIvs } from './team-analysis';

export interface CollectionPokemon {
	id: string;
	speciesId: string;
	moveset: Array<string>;
	ivs?: SlotIvs;
	level?: number;
	/** A Best Buddy (level ceiling 51). */
	buddy?: true;
	/** A Super Max Mega (two more levels). */
	superMega?: true;
	nickname?: string;
	league: TeamLeague;
	addedAt: number;
}

/**
 * What makes two saved Pokémon the same one: species, moves, IVs and level. The Best Buddy flag is not part of it — it only
 * matters through the level above 50 it allows, and that level is already in the key. The nickname isn't either.
 */
export const collectionBuildKey = (entry: Pick<CollectionPokemon, 'speciesId' | 'moveset' | 'ivs' | 'level'>): string =>
	slotIdentityKey(entry);

const KEY = 'go-pokedex:team-pokemon-collection';
const listeners = new Set<() => void>();
let collection: Array<CollectionPokemon> | undefined;
let idCounter = 0;

const isEntry = (value: unknown): value is Omit<CollectionPokemon, 'id'> & { id?: string } => {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Partial<CollectionPokemon>;
	return (
		typeof entry.speciesId === 'string' &&
		Array.isArray(entry.moveset) &&
		entry.moveset.every((move) => typeof move === 'string') &&
		isTeamLeague(entry.league) &&
		typeof entry.addedAt === 'number' &&
		(entry.id === undefined || typeof entry.id === 'string') &&
		(entry.nickname === undefined || typeof entry.nickname === 'string') &&
		(entry.ivs === undefined || isSlotIvs(entry.ivs)) &&
		(entry.level === undefined || isSlotLevel(entry.level)) &&
		(entry.buddy === undefined || entry.buddy === true) &&
		(entry.superMega === undefined || entry.superMega === true)
	);
};

const createId = (used: ReadonlySet<string>) => {
	let id: string;
	do {
		id =
			typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
				? crypto.randomUUID()
				: `collection-${Date.now()}-${++idCounter}-${Math.random().toString(36).slice(2)}`;
	} while (used.has(id));
	return id;
};

const parse = (raw: string | null): Array<CollectionPokemon> => {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		const entries = parsed.filter(isEntry);
		const used = new Set<string>();
		return entries.map((entry) => {
			const id = typeof entry.id === 'string' && !used.has(entry.id) ? entry.id : createId(used);
			used.add(id);
			return { ...entry, id };
		});
	} catch {
		return [];
	}
};

const needsIdMigration = (raw: string | null) => {
	if (!raw) return false;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return false;
		const used = new Set<string>();
		for (const value of parsed) {
			if (!isEntry(value)) continue;
			if (typeof value.id !== 'string' || used.has(value.id)) return true;
			used.add(value.id);
		}
		return false;
	} catch {
		return false;
	}
};

const load = (): Array<CollectionPokemon> => {
	if (collection === undefined) {
		let raw: string | null = null;
		try {
			raw = window.localStorage.getItem(KEY);
			collection = parse(raw);
		} catch {
			collection = [];
		}
		if (needsIdMigration(raw)) {
			try {
				window.localStorage.setItem(KEY, JSON.stringify(collection));
			} catch {
				// Keep generated IDs available for the lifetime of this page if storage is blocked.
			}
		}
	}
	return collection;
};

const commit = (next: Array<CollectionPokemon>) => {
	collection = next;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		// Keep the collection available for the lifetime of this page if storage is blocked.
	}
	listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	const onStorage = (event: StorageEvent) => {
		if (event.key !== KEY) return;
		collection = parse(event.newValue);
		listener();
	};
	window.addEventListener('storage', onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener('storage', onStorage);
	};
};

export const usePokemonCollection = (): ReadonlyArray<CollectionPokemon> =>
	useSyncExternalStore(subscribe, load, () => []);

export const saveCollectionPokemon = (
	league: TeamLeague,
	pokemon: Omit<CollectionPokemon, 'id' | 'league' | 'addedAt'>,
	replaceId?: string
): boolean => {
	const current = load();
	// An exact replica of one already saved in this league (other than the one being replaced) is refused.
	const key = collectionBuildKey(pokemon);
	if (current.some((entry) => entry.league === league && entry.id !== replaceId && collectionBuildKey(entry) === key))
		return false;
	const replacedIndex = replaceId
		? current.findIndex((entry) => entry.league === league && entry.id === replaceId)
		: -1;
	const existing = replacedIndex < 0 ? undefined : current[replacedIndex];
	const next = current.filter((_, index) => index !== replacedIndex);
	// (the nickname is set below, trimmed: a blank one is none)
	const { nickname: rawNickname, ...rest } = pokemon;
	const saved: CollectionPokemon = {
		...rest,
		id: existing?.id ?? createId(new Set(current.map((entry) => entry.id))),
		moveset: [...pokemon.moveset],
		...(pokemon.ivs ? { ivs: [...pokemon.ivs] as SlotIvs } : {}),
		...(pokemon.buddy ? { buddy: true as const } : {}),
		...(pokemon.superMega ? { superMega: true as const } : {}),
		...(rawNickname?.trim() ? { nickname: rawNickname.trim().slice(0, 32) } : {}),
		league,
		addedAt: existing?.addedAt ?? Date.now(),
	};
	if (existing) next.splice(Math.min(replacedIndex, next.length), 0, saved);
	else next.push(saved);
	commit(next);
	return true;
};

export const removeCollectionPokemon = (league: TeamLeague, id: string) =>
	commit(load().filter((entry) => entry.league !== league || entry.id !== id));

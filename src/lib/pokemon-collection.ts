import { useSyncExternalStore } from 'react';

import { isTeamLeague, type TeamLeague } from '../DTOs/ITeamBuilder';
import { idbGet, idbNotifyOtherTabs, idbSet, idbWatch, requestPersistentStorage } from '../utils/idb-store';
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

const KEY = 'user:team-pokemon-collection';
const listeners = new Set<() => void>();
// Read from IndexedDB once, before the app renders (`hydrateCollection`, called at startup); from then on this copy is the
// one everything reads, and every change is written through to IndexedDB.
let collection: Array<CollectionPokemon> = [];
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

const parse = (stored: unknown): Array<CollectionPokemon> => {
	if (!Array.isArray(stored)) return [];
	const used = new Set<string>();
	return stored.filter(isEntry).map((entry) => {
		const id = typeof entry.id === 'string' && !used.has(entry.id) ? entry.id : createId(used);
		used.add(id);
		return { ...entry, id };
	});
};

const needsIdMigration = (stored: unknown) => {
	if (!Array.isArray(stored)) return false;
	const used = new Set<string>();
	for (const value of stored) {
		if (!isEntry(value)) continue;
		if (typeof value.id !== 'string' || used.has(value.id)) return true;
		used.add(value.id);
	}
	return false;
};

const load = (): Array<CollectionPokemon> => collection;

const persist = (next: Array<CollectionPokemon>) => {
	void idbSet(KEY, next)
		.then(() => idbNotifyOtherTabs(KEY))
		.catch(() => {
			// Keep the collection available for the lifetime of this page if storage is blocked.
		});
};

const commit = (next: Array<CollectionPokemon>) => {
	collection = next;
	persist(next);
	requestPersistentStorage();
	listeners.forEach((listener) => listener());
};

let watching = false;

/** Loads the saved collection. Awaited at startup, before anything renders. */
export const hydrateCollection = async (): Promise<void> => {
	const stored = await idbGet<unknown>(KEY).catch(() => undefined);
	collection = parse(stored);
	// Keep the generated ids, so the same entry has the same id from now on.
	if (needsIdMigration(stored)) persist(collection);
	if (!watching) {
		watching = true;
		// Another tab changing the collection.
		idbWatch(KEY, () => {
			void idbGet<unknown>(KEY)
				.then((changed) => {
					collection = parse(changed);
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

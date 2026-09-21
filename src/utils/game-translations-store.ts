import { useSyncExternalStore } from 'react';

import { gameTranslationsUrl } from './Configs';

export interface GameTypeTranslations {
	search: Partial<Record<string, string>>;
	display: Partial<Record<string, string>>;
}

export interface GameTranslationsPayload {
	translations: Record<string, Partial<Record<string, string>>>;
	types: Record<string, GameTypeTranslations>;
}

// A plain module-level cache, not TanStack Query — `gameTranslator()` /
// `gameTypeTranslator()` (src/utils/GameTranslator.ts) are called from
// synchronous, non-React code (e.g. `lib/search-string.ts`'s pure builder
// functions), which can't `await` a query or call a hook. This is fetched
// once, at app startup (`Shell.tsx` calls `useGameTranslationsData()` once,
// high enough in the tree that every route re-renders under it), and never
// refetched for the lifetime of the tab.
let cache: GameTranslationsPayload | null = null;
let fetchStarted = false;
const listeners = new Set<() => void>();

function notify(): void {
	listeners.forEach((listener) => {
		listener();
	});
}

function startLoad(): void {
	if (fetchStarted) {
		return;
	}
	fetchStarted = true;

	fetch(gameTranslationsUrl)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Network response was not ok for ${gameTranslationsUrl} (HTTP ${response.status})`);
			}
			return response.json() as Promise<GameTranslationsPayload>;
		})
		.then((data) => {
			cache = data;
			notify();
			return undefined;
		})
		.catch((error: unknown) => {
			// Left `cache` at `null` — `gameTranslator()`/`gameTypeTranslator()`
			// already treat "not loaded yet" as "show nothing" (see their own doc
			// comments), which is also the right behavior for "never going to
			// load this session" — there's nothing more specific to fall back to.
			console.error('[game-translations-store] failed to load game-translations.json', error);
		});
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot(): GameTranslationsPayload | null {
	return cache;
}

/** Synchronous read for non-React callers (e.g. `GameTranslator.ts`) — `null`
 *  until the fetch this same module kicks off (via `useGameTranslationsData`)
 *  resolves. */
export function getGameTranslationsSnapshot(): GameTranslationsPayload | null {
	return cache;
}

/** Test-only seam: `gameTranslator()`/`gameTypeTranslator()` read the cache
 *  synchronously, but the real load is an async `fetch` — a unit test
 *  exercising code that calls them (e.g. MassDelete's search-string
 *  builders) has no render/await point to wait on that fetch from, so it
 *  seeds the cache directly instead. Not used by app code. */
export function __setGameTranslationsForTests(data: GameTranslationsPayload | null): void {
	cache = data;
}

/** Call once per top-level component that renders anything sourced from
 *  `GameTranslator.ts` (currently just `Shell.tsx`, which wraps every route)
 *  so that subtree re-renders once the fetch this same call kicks off
 *  resolves. A component that reads `gameTranslator()`/`gameTypeTranslator()`
 *  directly in its render body doesn't need its own call — `Shell`'s
 *  re-render already re-renders it too, same as any other prop/context
 *  change, so its next call picks up the now-populated cache automatically.
 *
 *  A component that wraps a `gameTranslator()`/`gameTypeTranslator()` call
 *  inside `useMemo`/`useCallback`, though, DOES need its own call here, with
 *  the result added to that memo's dependency array — otherwise the memo
 *  itself doesn't know the underlying data changed and keeps returning
 *  whatever it computed on the first render (typically `''`, since the fetch
 *  hasn't resolved yet), even though the surrounding component re-rendered.
 *  This bit real: MassDelete's Shadow/Mega-Evolvable checkbox labels stayed
 *  blank until something unrelated (e.g. changing GameLanguage) forced their
 *  `useMemo` to recompute for its own reasons — see git blame on
 *  `PROTECTION_META_TRANSLATORS`'s call site for the fix. */
export function useGameTranslationsData(): GameTranslationsPayload | null {
	startLoad();
	return useSyncExternalStore(subscribe, getSnapshot);
}

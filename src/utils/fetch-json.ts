import { getComputeWorker } from '../workers/compute-client';

/**
 * Fetches a URL and parses it as JSON, throwing on a non-2xx response so that
 * TanStack Query can track it as an error. The AbortSignal is supplied by Query
 * (via the queryFn context) and cancels the request when the observer unmounts.
 */
export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
	const response = await fetch(url, signal ? { signal } : undefined);
	if (!response.ok) {
		throw new Error(`Network response was not ok for ${url} (HTTP ${response.status})`);
	}
	return (await response.json()) as T;
}

/**
 * Same contract as {@link fetchJson}, but the fetch *and* the JSON parse both
 * happen in the compute worker (see its own `fetchJson` doc comment) — worth
 * it for the handful of multi-MB dex-server payloads (PvP rankings, raid DPS
 * ranks, species-search-metadata) where the parse itself is a real chunk of
 * main-thread blocking time. Not worth it for small/persisted payloads
 * (game-master, moves) — plain {@link fetchJson} stays the default there.
 *
 * No `AbortSignal` support: Comlink doesn't proxy `AbortSignal` across the
 * worker boundary, and these are long-lived, heavily-cached queries (`gcTime`
 * measured in days) where an in-flight fetch surviving past a quick unmount
 * is harmless — unlike a per-keystroke query, there's nothing to cancel for.
 */
export async function fetchJsonInWorker<T>(url: string): Promise<T> {
	return (await getComputeWorker().fetchJson(url)) as T;
}

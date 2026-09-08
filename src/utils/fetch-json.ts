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

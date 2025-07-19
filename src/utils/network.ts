import { readEntry, writeEntry } from './resource-cache';

export interface FetchRequestConfig extends RequestInit {
	headers?: Record<string, string>;
}

/**
 * DataTransformer receives the data and the fetch Request object.
 */
type DataTransformer<T> = (data: unknown, request: Request) => T;

type PromiseFulfilledResultTyped<T> = {
	status: 'fulfilled';
	value: T;
};

type PromiseRejectedResultTyped = {
	status: 'rejected';
	reason: unknown;
};

type PromiseSettledResultTyped<T> =
	| PromiseFulfilledResultTyped<T>
	| PromiseRejectedResultTyped;

/**
 * fetchUrls supports passing a FetchRequestConfig, including an AbortSignal for cancellation.
 * The signal will be passed to each fetch request.
 */
export async function fetchUrls<T = unknown>(
	urls: Array<string>,
	cacheTtl = 0,
	withoutCache: boolean,
	fetchRequestConfig?: FetchRequestConfig,
	dataTransformer?: DataTransformer<T>
): Promise<Array<T>> {
	const fetchSingleUrl = async (url: string): Promise<T> => {
		const cacheKey = url;
		if (cacheTtl > 0) {
			const cachedData = readEntry(cacheKey);
			if (cachedData !== undefined) {
				return cachedData as T;
			}
		}

		let fetchUrl = url;
		if (withoutCache) {
			const separator = url.includes('?') ? '&' : '?';
			fetchUrl = `${url}${separator}timestamp=${new Date().getTime()}`;
		}

		// Ensure fetchRequestConfig is not mutated between requests
		const requestInit: RequestInit = fetchRequestConfig
			? { ...fetchRequestConfig }
			: {};

		// If headers is a plain object, convert to Headers
		if (
			fetchRequestConfig?.headers &&
			!(fetchRequestConfig.headers instanceof Headers)
		) {
			requestInit.headers = new Headers(fetchRequestConfig.headers);
		}

		const request = new Request(fetchUrl, requestInit);

		const response = await fetch(request);
		if (!response.ok) {
			throw new Error(`Network response was not ok for ${fetchUrl}`);
		}
		const data: unknown = await response.json();
		const transformedData: T = dataTransformer
			? dataTransformer(data, request)
			: (data as T);
		if (cacheTtl > 0) {
			writeEntry(cacheKey, transformedData, cacheTtl);
		}
		return transformedData;
	};

	const results: Array<PromiseSettledResultTyped<T>> = await Promise.allSettled(
		urls.map(fetchSingleUrl)
	);
	const fulfilledResults: Array<T> = [];
	for (const result of results) {
		if (result.status === 'fulfilled') {
			fulfilledResults.push(result.value);
		}
	}
	return fulfilledResults;
}

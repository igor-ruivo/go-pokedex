import { readEntry, writeEntry } from "./resource-cache";

export interface FetchRequestConfig extends RequestInit {
	headers?: Record<string, string>;
}

export const fetchUrls = async (
	urls: string[],
	cacheTtl: number = 0,
	withoutCache: boolean,
	fetchRequestConfig?: FetchRequestConfig,
	dataTransformer?: (data: any, request: Request) => any
): Promise<any[]> => {
	const promises = urls.map(url => new Promise(async (resolve, reject) => {
		try {
			let cachedData;
			const cacheKey = url;
			if (cacheTtl > 0 && (cachedData = readEntry(cacheKey))) {
				resolve(cachedData);
			} else {
				let fetchUrl = url;
				if (withoutCache) {
					const separator = url.includes('?') ? '&' : '?';
					fetchUrl = `${url}${separator}timestamp=${new Date().getTime()}`;
				}
				const request = new Request(fetchUrl, fetchRequestConfig);
				const response = await fetch(request);
				if (!response.ok) {
					throw new Error(`Network response was not ok for ${fetchUrl}`);
				}
				let data = await response.json();
				if (dataTransformer) {
					data = dataTransformer(data, request);
				}
				if (cacheTtl > 0) {
					writeEntry(cacheKey, data, cacheTtl);
				}
				resolve(data);
			}
		} catch (error) {
			reject(error);
		}
	}));

	const promiseValues = (await Promise.allSettled(promises))
		.filter(p => p.status === "fulfilled")
		.map(result => (result as PromiseFulfilledResult<any>).value);
	return promiseValues;
}
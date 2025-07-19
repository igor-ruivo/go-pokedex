import { useCallback, useState } from 'react';

import { type FetchRequestConfig, fetchUrls } from '../utils/network';

type DataTransformer<T> = (data: unknown, request: Request) => T;

type FetchDataCallback<T> = (
	urls: Array<string>,
	cacheTtl?: number,
	fetchRequestConfig?: FetchRequestConfig,
	dataTransformer?: DataTransformer<T>,
	withoutCache?: boolean
) => Promise<void>;

export type FetchData<T> = [Array<T>, FetchDataCallback<T>, boolean, string];

/**
 * A custom hook used to fetch data from a batch of urls.
 * The array of urls must be specified when calling the fetchUrlCallback function.
 * @returns the array with the received data, where the order of the data is maintained according to the order of the received urls,
 * the fetch data callback, that when invoked starts the fetch of the data,
 * a flag informing if the fetch has been completed, and an error message, that saves any errors that may occur.
 *
 * You can pass a native fetch RequestInit object (optionally with a signal for aborting) as fetchRequestConfig.
 */
export const useFetchUrls = <T = unknown>(): FetchData<T> => {
	const [data, setData] = useState<Array<T>>([]);
	const [fetchCompleted, setFetchCompleted] = useState(false);
	const [errorLoadingData, setErrorLoadingData] = useState('');

	const fetchUrlsCallback: FetchDataCallback<T> = useCallback(
		async (
			urls: Array<string>,
			cacheTtl = 0,
			fetchRequestConfig?: FetchRequestConfig,
			dataTransformer?: DataTransformer<T>,
			withoutCache = false
		) => {
			try {
				const response = await fetchUrls<T>(urls, cacheTtl, withoutCache, fetchRequestConfig, dataTransformer);
				setData(response);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.toString() : typeof error === 'string' ? error : 'Unknown error';
				console.error(errorMessage);
				setErrorLoadingData(errorMessage);
			} finally {
				setFetchCompleted(true);
			}
		},
		[setData, setErrorLoadingData, setFetchCompleted]
	);

	const response: FetchData<T> = [data, fetchUrlsCallback, fetchCompleted, errorLoadingData];
	return response;
};

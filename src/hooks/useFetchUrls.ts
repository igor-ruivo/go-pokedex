import { useCallback, useState } from "react";
import { AxiosRequestConfig } from "axios";
import { fetchUrls } from "../utils/network";

type FetchDataCallback<T> = (urls: string[], cacheTtl: number, axiosRequestConfig?: AxiosRequestConfig<any>, dataTransformer?: (data: any, request: any) => T, withoutCache?: boolean) => Promise<T>;
export type FetchData<T> = [T[], FetchDataCallback<T>, boolean, string, React.Dispatch<React.SetStateAction<T[]>>];

/**
 * A custom hook used to fetch data from a batch of urls.
 * The array of urls must be specified when calling the fetchUrlCallback function.
 * @returns the array with the received data, where the order of the data is maintained according to the order of the received urls,
 * the fetch data callback, that when invoked starts the fetch of the data,
 * a flag informing if the fetch has been completed, and an error message, that saves any errors that may occur.
 */
export const useFetchUrls = (): FetchData<any> => {
    const [data, setData] = useState<any[]>([]);
    const [fetchCompleted, setFetchCompleted] = useState(false);
    const [errorLoadingData, setErrorLoadingData] = useState("");
    
    const fetchUrlsCallback = useCallback(async (urls: string[], cacheTtl: number = 0, axiosRequestConfig?: AxiosRequestConfig<any>, dataTransformer?: (data: any, request: any) => any, withoutCache = false) => {
        try {
            const response = await fetchUrls(urls, cacheTtl, withoutCache, axiosRequestConfig, dataTransformer);
            setData(response);
        }
        catch(error) {
            console.error(error?.toString());
            setErrorLoadingData(error?.toString() ?? "");
        }
        finally {
            setFetchCompleted(true);
        }
    }, [setData, setErrorLoadingData, setFetchCompleted]);

    const response: FetchData<any> = [data, fetchUrlsCallback, fetchCompleted, errorLoadingData, setData];
    return response;
};


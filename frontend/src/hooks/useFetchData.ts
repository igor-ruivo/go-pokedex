import { SetStateAction, useEffect, useState } from "react";
import { axiosGet } from "../utils/axios-handler";
import { readEntry, writeEntry } from "../utils/localStorage-handler";
import { cacheTtlInMillis } from "../utils/Resources";

/**
 * A custom hook used to fetch data from the endpoint received in url.
 * It parses the response into the desired generic type T.
 * This response is cached in the localStorage by a specific configurable amount of time.
 * @param url the url of the endpoint from where the data is going to be fetched.
 * @returns the stateful value for what was received and a method to set it,
 * a stateful value for the number of fetches already performed,
 * and two other stateful values for the error and loading flags.
 */
export const useFetchData = <T extends object>(url: string, setError: React.Dispatch<SetStateAction<string>>, setLoading: React.Dispatch<SetStateAction<boolean>>) => {
    const [response, setResponse] = useState<T | null>(null);
    const [dataFetchCounter, setDataFetchCounter] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const cachedData = readEntry<T>(url);
                if (cachedData) {
                    setResponse(cachedData);
                } else {
                    const data = await axiosGet(url);
                    writeEntry(url, data, cacheTtlInMillis);
                    setResponse(data);
                }
                setDataFetchCounter((previousCount) => previousCount + 1);
            } catch(error) {
                let message;
                if (error instanceof Error) {
                    message = error.message;
                }
                else {
                    message = String(error);
                }
                setError(message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [url]);

    const returnValues: [
        T | null,
        React.Dispatch<SetStateAction<T | null>>,
        number
    ] = [response, setResponse, dataFetchCounter];

    return returnValues;
};
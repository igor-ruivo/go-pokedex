import { useEffect, useState } from "react";
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
export const useFetchData = (url: string) => {
    const [response, setResponse] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            const cachedData = readEntry(url);
            if (cachedData) {
                setResponse(cachedData);
            } else {
                const data = await axiosGet(url);
                writeEntry(url, data, cacheTtlInMillis);
                setResponse(data);
            }
        };
        fetchData();
    }, [url]);

    return response;
};
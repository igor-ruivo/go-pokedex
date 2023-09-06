import { useEffect, useState } from "react";
import { readEntry, writeEntry } from "../utils/localStorage-handler";
import { cacheTtlInMillis } from "../utils/Resources";
import axios from "axios";

/**
 * A custom hook used to fetch data from the endpoint received in url.
 * This response is cached in the localStorage by a specific configurable amount of time.
 * @param url the url of the endpoint from where the data is going to be fetched.
 * @returns the stateful value for the received data,
 * and two other stateful values for the error and loading flags.
 */
export const useFetchData = (url: string) => {
    const [data, setData] = useState<any>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [errorLoadingData, setErrorLoadingData] = useState("");
    
    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                const cachedData = readEntry(url);
                if (cachedData) {
                    setData(cachedData);
                } else {
                    const response = await axios.get(url, {
                        signal: controller.signal
                    });
                    writeEntry(url, response.data, cacheTtlInMillis);
                    setData(response.data);
                }
            }
            catch(error) {
                setErrorLoadingData(JSON.stringify(error));
            }
            finally{
                setLoadingData(false);
            }
        };
        fetchData();

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [url]);

    const response: [any, boolean, string] = [data, loadingData, errorLoadingData];
    return response;
};
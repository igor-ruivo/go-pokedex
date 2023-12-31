import axios, { AxiosRequestConfig } from "axios";
import { cacheTtlInMillis } from "./Configs";
import { readEntry, writeEntry } from "./resource-cache";

export const fetchUrls = async(urls: string[], useCache: boolean = false, axiosRequestConfig?: AxiosRequestConfig<any>, dataTransformer?: (data: any, request: any) => any): Promise<any[]> => {
    const axiosInstance = axios.create();

    if (dataTransformer) {
        axiosInstance.interceptors.response.use(
            (response) => {
                response.data = dataTransformer(response.data, response.request);
                return response;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }

    const promises = urls.map(url => new Promise(async (resolve, reject) => {
        try {
            let cachedData;
            if (useCache && (cachedData = readEntry(url))) {
                resolve(cachedData);
            } else {
                const response = await axiosInstance.get(url, axiosRequestConfig);
                if (useCache) {
                    writeEntry(url, response.data, cacheTtlInMillis);
                }
                resolve(response.data);
            }
        }
        catch (error) {
            reject(error);
        }
    }));

    const promiseValues = await Promise.all(promises);
    return promiseValues;
}
import axios, { AxiosRequestConfig } from "axios";
import { readEntry, writeEntry } from "./resource-cache";

export const fetchUrls = async(urls: string[], cacheTtl: number = 0, withoutCache: boolean, axiosRequestConfig?: AxiosRequestConfig<any>, dataTransformer?: (data: any, request: any) => any): Promise<any[]> => {
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
            if (cacheTtl > 0 && (cachedData = readEntry(url))) {
                resolve(cachedData);
            } else {
                const response = await axiosInstance.get(url + (withoutCache ? `?timestamp=${new Date().getTime()}` : ""), axiosRequestConfig);
                if (cacheTtl > 0) {
                    writeEntry(url, response.data, cacheTtl);
                }
                resolve(response.data);
            }
        }
        catch (error) {
            reject(error);
        }
    }));

    const promiseValues = (await Promise.allSettled(promises)).filter(p => p.status === "fulfilled").map(result => (result as PromiseFulfilledResult<any>).value);
    return promiseValues;
}
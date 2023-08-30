import axios from "axios";

/**
 *  A basic axios getter method to perform get operations.
 * @param url the url of the endpoint.
 * @returns a Promise with the response data of the request.
 */
export const axiosGet: (url: string) => Promise<any> = async (url: string) => {
    const response = await axios.get(url);
    return response.data;
};
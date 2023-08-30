import { useEffect, useState } from "react";
import { Buffer } from 'buffer';
import axios from "axios";

const useImageBatchLoader = (orderedImagesUrls: string[], lastSeenIndex: number, length: number) => {
    console.log("invoked lastseen = "+lastSeenIndex+" and length = " + length);
    const [imagesData, setImagesData] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            console.log("entered");
            if (!loading) {
                setLoading(true);
            }
            const promises = orderedImagesUrls.slice(lastSeenIndex, lastSeenIndex + length).map(async url => {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const base64Image = Buffer.from(response.data, 'binary').toString('base64');
                return base64Image;
            });
            const results = await Promise.all(promises);
            console.log(results.map(r => r.substring(0, 3)));
            setImagesData(results);
            setLoading(false);
        }
        fetchData();
    }, [lastSeenIndex]);

    const returnValues: [string[], boolean] = [imagesData, loading];
    return returnValues;
}

export default useImageBatchLoader;
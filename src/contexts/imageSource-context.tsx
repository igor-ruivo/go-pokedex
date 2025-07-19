import { createContext, useCallback, useContext, useState } from 'react';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

export enum ImageSource {
    Official,
    GO,
    Shiny
}

interface ImageSourceContextType {
    imageSource: ImageSource;
    updateImageSource: (newSource: ImageSource) => void;
}

const ImageSourceContext = createContext<ImageSourceContextType | undefined>(undefined);

export const useImageSource = (): ImageSourceContextType => {
    const context = useContext(ImageSourceContext);
    if (!context) {
        throw new Error("useImageSource must be used within a ImageSourceProvider");
    }
    return context;
};

export const ImageSourceProvider = (props: React.PropsWithChildren<{}>) => {
    const getDefaultImageSource = useCallback(() => {
        const cachedImageSource = readPersistentValue(ConfigKeys.ImageSource);
        if (!cachedImageSource) {
            return ImageSource.Official;
        }
    
        return +cachedImageSource as ImageSource;
    }, []);

    const [imageSource, setImageSource] = useState(getDefaultImageSource());

    const updateImageSource = useCallback((newImageSource: ImageSource) => {
        writePersistentValue(ConfigKeys.ImageSource, JSON.stringify(newImageSource));
        setImageSource(newImageSource);
    }, [setImageSource]);
  
    return (
        <ImageSourceContext.Provider value={{ imageSource, updateImageSource, }}>
            {props.children}
        </ImageSourceContext.Provider>
    );
}
import { createContext, useContext, useState } from 'react';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

export enum Language {
    English,
    Portuguese
}

interface LanguageContextType {
    currentLanguage: Language;
    updateCurrentLanguage: (newLanguage: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};

export const LanguageProvider = (props: React.PropsWithChildren<{}>) => {
    const getDefaultLanguage = () => {
        const cachedLanguage = readPersistentValue(ConfigKeys.Language);
        if (!cachedLanguage) {
            return Language.English;
        }
    
        return +cachedLanguage as Language;
    } 

    const [currentLanguage, setCurrentLanguage] = useState(getDefaultLanguage());

    const updateCurrentLanguage = (newInputText: Language) => {
        writePersistentValue(ConfigKeys.Language, JSON.stringify(newInputText));
        setCurrentLanguage(newInputText);
    }
  
    return (
        <LanguageContext.Provider value={{ currentLanguage, updateCurrentLanguage }}>
            {props.children}
        </LanguageContext.Provider>
    );
}
import { createContext, useContext, useState } from 'react';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

export enum Language {
    English,
    Portuguese,
    Bosnian
}

export enum GameLanguage {
    English,
    Portuguese
}

interface LanguageContextType {
    currentLanguage: Language;
    currentGameLanguage: GameLanguage;
    updateCurrentLanguage: (newLanguage: Language) => void;
    updateCurrentGameLanguage: (newLanguage: GameLanguage) => void;
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

    const getDefaultGameLanguage = () => {
        const cachedGameLanguage = readPersistentValue(ConfigKeys.GameLanguage);
        if (!cachedGameLanguage) {
            return GameLanguage.English;
        }
    
        return +cachedGameLanguage as GameLanguage;
    } 

    const [currentLanguage, setCurrentLanguage] = useState(getDefaultLanguage());
    const [currentGameLanguage, setCurrentGameLanguage] = useState(getDefaultGameLanguage());

    const updateCurrentLanguage = (newInputText: Language) => {
        writePersistentValue(ConfigKeys.Language, JSON.stringify(newInputText));
        setCurrentLanguage(newInputText);
    }

    const updateCurrentGameLanguage = (newInputText: GameLanguage) => {
        writePersistentValue(ConfigKeys.GameLanguage, JSON.stringify(newInputText));
        setCurrentGameLanguage(newInputText);
    }
  
    return (
        <LanguageContext.Provider value={{ currentLanguage, currentGameLanguage, updateCurrentLanguage, updateCurrentGameLanguage }}>
            {props.children}
        </LanguageContext.Provider>
    );
}
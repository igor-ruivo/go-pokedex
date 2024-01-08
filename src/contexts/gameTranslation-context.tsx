import { createContext, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { enTranslationsUrl, ptbrTranslationsUrl } from '../utils/Configs';
import Dictionary from '../utils/Dictionary';
import { ITranslatedMove } from '../DTOs/ITranslatedMove';
import { mapTranslatedMoves } from '../utils/conversions';
import { GameLanguage, useLanguage } from './language-context';

interface GameTranslationContextType {
    gameTranslation: Dictionary<ITranslatedMove>;
    gameTranslationFetchCompleted: boolean;
    gameTranslationErrors: string
}

const GameTranslationContext = createContext<GameTranslationContextType | undefined>(undefined);

const getGameLanguageResourceFromCurrentGameLanguage = (currentGameLanguage: GameLanguage) => {
    switch (currentGameLanguage) {
        case GameLanguage.English:
            return enTranslationsUrl;
        case GameLanguage.Portuguese:
            return ptbrTranslationsUrl;
        default: throw Error (`Missing game language url resource for ${currentGameLanguage}`);
    }
}

const useFetchAllData: () => [Dictionary<ITranslatedMove>, boolean, string] = () => {
    const {currentGameLanguage} = useLanguage();
    const [gameTranslation, fetchGameTranslation, fetchGameTranslationCompleted, errorLoadingGameTranslationData]: FetchData<Dictionary<ITranslatedMove>> = useFetchUrls();

    const gameLanguageResourceUrl = getGameLanguageResourceFromCurrentGameLanguage(currentGameLanguage);

    useEffect(() => {
        const controller = new AbortController();
        fetchGameTranslation([gameLanguageResourceUrl], true, {signal: controller.signal}, mapTranslatedMoves);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [gameLanguageResourceUrl, fetchGameTranslation]);

    return [gameTranslation[0], fetchGameTranslationCompleted, errorLoadingGameTranslationData];
}

export const useGameTranslation = (): GameTranslationContextType => {
    const context = useContext(GameTranslationContext);
    if (!context) {
        throw new Error("useGameTranslation must be used within a GameTranslationProvider");
    }
    return context;
};

export const GameTranslationProvider = (props: React.PropsWithChildren<{}>) => {
    const [gameTranslation, gameTranslationFetchCompleted, gameTranslationErrors]: [Dictionary<ITranslatedMove>, boolean, string] = useFetchAllData();

    return (
        <GameTranslationContext.Provider value={{
            gameTranslation: gameTranslation,
            gameTranslationFetchCompleted,
            gameTranslationErrors }}
        >
            {props.children}
        </GameTranslationContext.Provider>
    );
}
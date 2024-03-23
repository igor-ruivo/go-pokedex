import { createContext, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl, calendarCache, corsProxyUrl, pokemonGoBaseUrl, pokemonGoNewsUrl } from '../utils/Configs';
import { mapRaidBosses } from '../utils/conversions';
import Dictionary from '../utils/Dictionary';
import { IRaidBoss } from '../DTOs/IRaidBoss';
import { usePokemon } from './pokemon-context';

interface RaidBossesContextType {
    bossesPerTier: string;
    bossesFetchCompleted: boolean;
    bossesErrors: string;
}

const RaidBossesContext = createContext<RaidBossesContextType | undefined>(undefined);

const useFetchAllData: () => [string, boolean, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [news, fetchNews, newsFetchCompleted, errorLoadingnews]: FetchData<string> = useFetchUrls();
    const [posts, fetchPosts, postsFetchCompleted, errorLoadingPosts]: FetchData<Dictionary<any/*TODO*/>> = useFetchUrls();

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();
        fetchNews([corsProxyUrl + pokemonGoNewsUrl], 0, {signal: controller.signal}/*, (data: any, request: any) => mapRaidBosses(data, request, gamemasterPokemon)*/);
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchNews, fetchCompleted]);

    useEffect(() => {
        if (!fetchCompleted || !newsFetchCompleted) {
            return;
        }

        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(news[0], 'text/html');
        const entries = Array.from(htmlDoc.getElementsByClassName("blogList__post"));

        const controller = new AbortController();

        fetchPosts(entries.map(e => {
            const hrefValue = (e as HTMLAnchorElement).href;
            if (hrefValue.includes("incarnate"))
            window.alert(hrefValue)
            const relativeComponent = hrefValue.substring(hrefValue.lastIndexOf("/post/") + 1);
            return corsProxyUrl + encodeURIComponent(pokemonGoBaseUrl + relativeComponent);
        }), 0, {signal: controller.signal});

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchCompleted, newsFetchCompleted]);

    return [news[0], newsFetchCompleted, errorLoadingnews];
}

export const useRaidBosses = (): RaidBossesContextType => {
    const context = useContext(RaidBossesContext);
    if (!context) {
        throw new Error("useRaidBosses must be used within a RaidBossesProvider");
    }
    return context;
};

export const RaidBossesProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidBosses, fetchCompleted, errors]: [string, boolean, string] = useFetchAllData();

    return (
        <RaidBossesContext.Provider value={{
            bossesPerTier: raidBosses,
            bossesFetchCompleted: fetchCompleted,
            bossesErrors: errors
        }}
        >
            {props.children}
        </RaidBossesContext.Provider>
    );
}
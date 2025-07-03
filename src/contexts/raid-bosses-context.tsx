import { createContext, useCallback, useContext, useEffect } from 'react';
import { FetchData, useFetchUrls } from '../hooks/useFetchUrls';
import { bossesUrl, cacheTtlInMillis, calendarCache, corsProxyUrl, leekBaseUrl, leekEggsUrl, leekNewsUrl, leekRocketsUrl, pokemonGoBaseUrl, pokemonGoNewsUrl, pokemonGoSeasonRelativeUrl } from '../utils/Configs';
import { mapLeekEggs, mapLeekNews, mapLeekRockets, mapPosts, mapPostsPT, mapRaidBosses, mapSeason } from '../utils/conversions';
import { usePokemon } from './pokemon-context';
import { IPostEntry, IRocketGrunt } from '../DTOs/INews';
import { Language, useLanguage } from './language-context';

interface CalendarContextType {
    bossesPerTier: IPostEntry;
    posts: IPostEntry[][];
    postsPT: IPostEntry[][];
    season: IPostEntry;
    seasonPT: IPostEntry;
    leekPosts: IPostEntry[];
    leekEggs: IPostEntry;
    leekRockets: IRocketGrunt[];
    bossesFetchCompleted: boolean;
    postsFetchCompleted: boolean;
    postsPTFetchCompleted: boolean;
    seasonFetchCompleted: boolean;
    seasonPTFetchCompleted: boolean;
    leekPostsFetchCompleted: boolean;
    leekEggsFetchCompleted: boolean;
    leekRocketsFetchCompleted: boolean;
    bossesErrors: string;
    postsErrors: string;
    postsPTErrors: string;
    seasonErrors: string;
    seasonPTErrors: string;
    leekPostsErrors: string;
    leekEggsErrors: string;
    leekRocketsErrors: string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const useFetchAllData: () => [IPostEntry, IPostEntry[][], IPostEntry[][], IPostEntry, IPostEntry, IPostEntry[], IPostEntry, IRocketGrunt[], boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, string, string, string, string, string, string, string, string] = () => {
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const [news, fetchNews, newsFetchCompleted]: FetchData<string> = useFetchUrls();
    const [posts, fetchPosts, postsFetchCompleted, errorLoadingPosts, setPosts]: FetchData<IPostEntry[]> = useFetchUrls();
    const [postsPT, fetchPostsPT, postsPTFetchCompleted, errorLoadingPostsPT, setPostsPT]: FetchData<IPostEntry[]> = useFetchUrls();
    const [season, fetchSeason, seasonFetchCompleted, errorLoadingSeason]: FetchData<IPostEntry> = useFetchUrls();
    const [seasonPT, fetchSeasonPT, seasonPTFetchCompleted, errorLoadingSeasonPT]: FetchData<IPostEntry> = useFetchUrls();
    const [bosses, fetchBosses, bossesFetchCompleted, errorLoadingBosses]: FetchData<IPostEntry> = useFetchUrls();
    const [leekNews, fetchLeekNews, leekNewsFetchCompleted]: FetchData<string> = useFetchUrls();
    const [leekPosts, fetchLeekPosts, leekPostsFetchCompleted, errorLoadingLeekPosts]: FetchData<IPostEntry> = useFetchUrls();
    const [leekEggs, fetchLeekEggs, leekEggsFetchCompleted, errorLoadingLeekEggs]: FetchData<IPostEntry> = useFetchUrls();
    const [leekRockets, fetchLeekRockets, leekRocketsFetchCompleted, errorLoadingLeekRockets]: FetchData<IRocketGrunt[]> = useFetchUrls();
    const {currentLanguage} = useLanguage();
    
    const encodeProxyUrl = useCallback((relativeComponent: string) => corsProxyUrl + encodeURIComponent(pokemonGoBaseUrl + relativeComponent), []);

    useEffect(() => {
        if (!fetchCompleted) {
            return;
        }

        const controller = new AbortController();

        fetchBosses([bossesUrl], calendarCache, {signal: controller.signal}, (data: any) => mapRaidBosses(data, gamemasterPokemon));
        fetchLeekNews([leekNewsUrl], calendarCache, {signal: controller.signal}/*, (data: any) => mapLeekNews(data, gamemasterPokemon)*/);
        fetchNews([corsProxyUrl + pokemonGoNewsUrl], calendarCache, {signal: controller.signal}, undefined, true/*, (data: any, request: any) => mapRaidBosses(data, request, gamemasterPokemon)*/);
        fetchSeason([encodeProxyUrl(pokemonGoSeasonRelativeUrl)], cacheTtlInMillis, {signal: controller.signal}, (data: any, request: any) => mapSeason(data, gamemasterPokemon, request));
        fetchLeekEggs([leekEggsUrl], calendarCache, {signal: controller.signal}, (data: any) => mapLeekEggs(data, gamemasterPokemon));
        fetchLeekRockets([leekRocketsUrl], calendarCache, {signal: controller.signal}, (data: any) => mapLeekRockets(data, gamemasterPokemon));

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchNews, fetchSeason, fetchCompleted, gamemasterPokemon, encodeProxyUrl, fetchBosses, fetchLeekNews, fetchLeekEggs, fetchLeekRockets]);

    useEffect(() => {
        if (!fetchCompleted || !newsFetchCompleted) {
            return;
        }

        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(news[0], 'text/html');
        const postsEntries = Array.from(htmlDoc.querySelectorAll('.site-content a[href]')).map(e => e as HTMLElement).filter(e => !e.innerText.split('\n')[1].trim().startsWith("Welcome"));

        const controller = new AbortController();

        const urls = postsEntries
            .filter(e => {
                const hrefValue = (e as HTMLAnchorElement).href;
                return hrefValue.includes('/post/') || hrefValue.includes('/news/')
            })
            .map(e => {
                const hrefValue = (e as HTMLAnchorElement).href;
                const relativeComponent = hrefValue.includes('/post/') ? hrefValue.substring(hrefValue.lastIndexOf("/post/") + 1) : hrefValue.substring(hrefValue.lastIndexOf("/news/") + 1);
                return encodeProxyUrl(relativeComponent);
            })
        //filter unavailable events
        .filter(x => !x.includes('festival-of-lights-2024'))
        .slice(0, Math.ceil(postsEntries.length * 0.67));

        fetchPosts(urls, calendarCache, {signal: controller.signal}, (data: any, request: any) => mapPosts(data, gamemasterPokemon, request))
            .then(() => {
                setPosts(oldPosts => [...oldPosts, [{
                    title: 'July 2025 Community Day: Quaxly',
                    subtitle: 'July 2025 Community Day: Quaxly',
                    date: 1753016400000,
                    dateEnd: 1753027200000,
                    isRelevant: true,
                    comment: 'communityday-july-2025-quaxly/',
                    rawUrl: 'https://dex-server.vercel.app/api/proxy?targetUrl=https%3A%2F%2Fpokemongo.com%2Fnews%2Fcommunityday-july-2025-quaxly%2F',
                    imgUrl: 'https://lh3.googleusercontent.com/mTaxl778XzEFvST60TC4rvBPFQnrODlIgr98eY5mewqpz-NEnDe21UX60ZIQcyQKeg-rsauBunR9aznCuUjAyD37UIYpg5FL410r=e365-pa-nu-w1920',
                    bonuses: '3× Catch Stardust.\n2× Candy for catching Pokémon.\n2× chance for Trainers level 31 and up to receive Candy XL from catching Pokémon.\nLure Modules activated during the event will last for three hours.\nIncense (excluding Daily Adventure Incense) activated during the event will last for three hours.\nTake a few snapshots during Community Day for a surprise!\nOne additional Special Trade can be made for a maximum of three for the day.*\nTrades will require 50% less Stardust.*\n*While most bonuses are only active during the three-hour event period, these will be active from 2:00 p.m. to 10:00 p.m. local time.'
                },
                {
                    title: 'Hisuian Lilligant Raid Day',
                    subtitle: 'Hisuian Lilligant Raid Day',
                    date: 1752325200000,
                    dateEnd: 1752336000000,
                    isRelevant: true,
                    comment: 'hisuian-lilligant-raid-day-2025/',
                    rawUrl: 'https://dex-server.vercel.app/api/proxy?targetUrl=https%3A%2F%2Fpokemongo.com%2Fnews%2Fhisuian-lilligant-raid-day-2025%2F',
                    imgUrl: 'https://lh3.googleusercontent.com/lUDWzGohGO26tCXUbOHxdaB4ICaqRzqCU8hkCFS3wFEVX0CM-ZYrdSRqKLaisAp4ejT3eAeneqErSo6RuU3ftr9TvoWmpg2qgzE=e365-pa-nu-w1920',
                    bonuses: 'Remote Raid Pass limit increased to 20 from Friday, July 11, at 5:00 p.m. to Saturday, July 12, 2025, at 8:00 p.m. PDT.\nReceive up to five additional free Raid Passes from spinning Gym Photo Discs (for a total of six).\nIncreased chance of encountering Shiny Hisuian Lilligant from raids.'
                }]]);
            });

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchCompleted, newsFetchCompleted, fetchPosts, news, gamemasterPokemon, encodeProxyUrl, setPosts]);

    useEffect(() => {
        if (!fetchCompleted || !leekNewsFetchCompleted) {
            return;
        }

        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(leekNews[0], 'text/html');
        const postUrls = Array.from(new Set<string>([...Array.from(htmlDoc.getElementsByClassName("event-item-wrapper raid-battles")).map(e => (e.parentElement as HTMLAnchorElement).href), ...Array.from(htmlDoc.getElementsByClassName("event-item-wrapper elite-raids")).map(e => (e.parentElement as HTMLAnchorElement).href), ...Array.from(htmlDoc.getElementsByClassName("event-item-wrapper pokémon-spotlight-hour")).map(e => (e.parentElement as HTMLAnchorElement).href)]));
        
        const controller = new AbortController();

        const urls = postUrls.map(e => {
            const relativeComponent = e.substring(e.lastIndexOf("/events/") + 1);
            return leekBaseUrl + relativeComponent;
        });

        fetchLeekPosts(urls, calendarCache, {signal: controller.signal}, (data: any) => mapLeekNews(data, gamemasterPokemon));

        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [fetchCompleted, leekNewsFetchCompleted, fetchLeekPosts, leekNews, gamemasterPokemon]);

    useEffect(() => {
        if (!postsFetchCompleted || currentLanguage === Language.English) {
            return;
        }

        const controller = new AbortController();
        const ptbrUrls = posts.flat().filter(p => p.isRelevant && p.rawUrl).map(p => {
            const decodedUrl = decodeURIComponent(p.rawUrl!.split(corsProxyUrl)[1]);
            const postIndex = decodedUrl.indexOf('/post');

            if (postIndex === -1) {
                return p.rawUrl!;
            }

            const newPath = decodedUrl.substring(0, postIndex) + '/pt_br/' + decodedUrl.substring(postIndex + 1);
            
            // Encode the URL back to its encoded form
            const newEncodedUrl = encodeURIComponent(newPath);
            
            return corsProxyUrl + newEncodedUrl;
        });

        fetchPostsPT(ptbrUrls, calendarCache, {signal: controller.signal}, (data: any, request: any) => mapPostsPT(data, gamemasterPokemon, request)).then(() => {
            setPostsPT(oldPosts => [...oldPosts, [{
                title: 'Dia Comunitário de julho de 2025: Quaxly',
                subtitle: 'Dia Comunitário de julho de 2025: Quaxly',
                date: 1752328800,
                dateEnd: 1752339600,
                isRelevant: true,
                comment: 'communityday-july-2025-quaxly/',
                rawUrl: 'https://dex-server.vercel.app/api/proxy?targetUrl=https%3A%2F%2Fpokemongo.com%2Fnews%2Fcommunityday-july-2025-quaxly%2F',
                imgUrl: 'https://lh3.googleusercontent.com/mTaxl778XzEFvST60TC4rvBPFQnrODlIgr98eY5mewqpz-NEnDe21UX60ZIQcyQKeg-rsauBunR9aznCuUjAyD37UIYpg5FL410r=e365-pa-nu-w1920',
                bonuses: '3× Poeira Estelar por captura.\n2× mais doces por capturar Pokémon.\n2× mais chances de Treinadoras e Treinadores no nível 31 e acima receberem doces GG por capturar Pokémon.\nOs Módulos Atrair ativados durante o evento durarão três horas.\nO Incenso (exceto o Incenso de Aventura Diário) ativado durante o evento durará três horas.\nTirem fotos durante o Dia Comunitário para receberem uma surpresa!\nPode ser feita uma troca especial adicional (máximo de três por dia).*\nAs trocas exigirão 50% menos Poeira Estelar.*\n*Embora a maioria dos bônus só fique ativa durante as três horas do evento, esses bônus estarão ativos das 14h às 22h, horário local.'
            },
            {
                title: 'Dia de Reides com Liligant de Hisui',
                subtitle: 'Dia de Reides com Liligant de Hisui',
                date: 1752325200000,
                dateEnd: 1752336000000,
                isRelevant: true,
                comment: 'hisuian-lilligant-raid-day-2025/',
                rawUrl: 'https://dex-server.vercel.app/api/proxy?targetUrl=https%3A%2F%2Fpokemongo.com%2Fnews%2Fhisuian-lilligant-raid-day-2025%2F',
                imgUrl: 'https://lh3.googleusercontent.com/lUDWzGohGO26tCXUbOHxdaB4ICaqRzqCU8hkCFS3wFEVX0CM-ZYrdSRqKLaisAp4ejT3eAeneqErSo6RuU3ftr9TvoWmpg2qgzE=e365-pa-nu-w1920',
                bonuses: 'O limite de Passe de Reide a Distância aumentará para 20, de sexta-feira, 11 de julho, às 17h PDT (21h, no horário de Brasília), a sábado, 12 de julho de 2025, às 20h PDT (meia-noite de domingo, 4 de maio, no horário de Brasília).*\nReceba até cinco Passes de Reide gratuitos adicionais ao girar fotodiscos em Ginásios (até um total de seis).*\nMaior chance de encontrar Lilligant de Hisui Brilhante em Reides.'
            }]]);
        });
        fetchSeasonPT([encodeProxyUrl('pt_br/' + pokemonGoSeasonRelativeUrl)], calendarCache, {signal: controller.signal}, (data: any, request: any) => mapSeason(data, gamemasterPokemon, request, true));
        
        return () => {
            controller.abort("Request canceled by cleanup.");
        }
    }, [postsFetchCompleted, currentLanguage, gamemasterPokemon, posts, fetchPostsPT, fetchSeasonPT, encodeProxyUrl, setPostsPT]);

    return [bosses[0], posts, postsPT, season[0], seasonPT[0], leekPosts, leekEggs[0], leekRockets[0], bossesFetchCompleted, postsFetchCompleted, postsPTFetchCompleted, seasonFetchCompleted, seasonPTFetchCompleted, leekPostsFetchCompleted, leekEggsFetchCompleted, leekRocketsFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingPostsPT, errorLoadingSeason, errorLoadingSeasonPT, errorLoadingLeekPosts, errorLoadingLeekEggs, errorLoadingLeekRockets];
}

export const useCalendar = (): CalendarContextType => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
};

export const CalendarProvider = (props: React.PropsWithChildren<{}>) => {
    const [raidBosses, posts, postsPT, season, seasonPT, leekPosts, leekEggs, leekRockets, bossesFetchCompleted, postsFetchCompleted, postsPTFetchCompleted, seasonFetchCompleted, seasonPTFetchCompleted, leekPostsFetchCompleted, leekEggsFetchCompleted, leekRocketsFetchCompleted, errorLoadingBosses, errorLoadingPosts, errorLoadingPostsPT, errorLoadingSeason, errorLoadingSeasonPT, errorLoadingLeekPosts, errorLoadingLeekEggs, errorLoadingLeekRockets]: [IPostEntry, IPostEntry[][], IPostEntry[][], IPostEntry, IPostEntry, IPostEntry[], IPostEntry, IRocketGrunt[], boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, string, string, string, string, string, string, string, string] = useFetchAllData();

    return (
        <CalendarContext.Provider value={{
            bossesPerTier: raidBosses,
            posts: posts,
            postsPT: postsPT,
            season: season,
            seasonPT: seasonPT,
            leekPosts: leekPosts,
            leekEggs: leekEggs,
            leekRockets: leekRockets,
            bossesFetchCompleted: bossesFetchCompleted,
            postsFetchCompleted: postsFetchCompleted,
            postsPTFetchCompleted: postsPTFetchCompleted,
            seasonFetchCompleted: seasonFetchCompleted,
            seasonPTFetchCompleted: seasonPTFetchCompleted,
            leekPostsFetchCompleted: leekPostsFetchCompleted,
            leekEggsFetchCompleted: leekEggsFetchCompleted,
            leekRocketsFetchCompleted: leekRocketsFetchCompleted,
            bossesErrors: errorLoadingBosses,
            postsErrors: errorLoadingPosts,
            postsPTErrors: errorLoadingPostsPT,
            seasonErrors: errorLoadingSeason,
            seasonPTErrors: errorLoadingSeasonPT,
            leekPostsErrors: errorLoadingLeekPosts,
            leekEggsErrors: errorLoadingLeekEggs,
            leekRocketsErrors: errorLoadingLeekRockets
        }}
        >
            {props.children}
        </CalendarContext.Provider>
    );
}
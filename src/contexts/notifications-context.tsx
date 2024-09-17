import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';
import { useCalendar } from './raid-bosses-context';
import { IPostEntry } from '../DTOs/INews';

interface NotificationsContextType {
    unseenEvents: number;
    seenEvents: Set<string>;
    updateSeenEvents: (newEvents: string[]) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = (): NotificationsContextType => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error("useNotifications must be used within a NotificationsProvider");
    }
    return context;
};

export const NotificationsProvider = (props: React.PropsWithChildren<{}>) => {
    const getDefaultSeenEvents = useCallback((): Set<string> => {
        const cachedSeenEvents = readPersistentValue(ConfigKeys.SeenEvents);
        if (!cachedSeenEvents) {
            return new Set();
        }
    
        return new Set(JSON.parse(cachedSeenEvents));
    }, []);

    const [seenEvents, setSeenEvents] = useState(getDefaultSeenEvents());
    const {posts, leekPosts, postsFetchCompleted, leekPostsFetchCompleted, season, seasonFetchCompleted} = useCalendar();

    const postTitle = useCallback((post: IPostEntry) => `${post.title}-${post.subtitle}`, []);
    
    const currentEventIds = useMemo(() => postsFetchCompleted && seasonFetchCompleted && leekPostsFetchCompleted ? [...[...posts.flat(), season, ...leekPosts.filter(p => (p.spotlightPokemons?.length ?? 0) > 0 && p.spotlightBonus)].filter(p => p && ((p.wild?.length ?? 0) > 0 || (p.raids?.length ?? 0) > 0 || p.bonuses || (p.researches?.length ?? 0) > 0 || ((p.spotlightPokemons?.length ?? 0) > 0 && p.spotlightBonus)) && new Date(p.dateEnd ?? 0) >= new Date())].map(postTitle) : []
    , [leekPosts, leekPostsFetchCompleted, postTitle, posts, postsFetchCompleted, season, seasonFetchCompleted]);
    
    const unseenEvents = useMemo(() => currentEventIds.filter(e => !seenEvents.has(e)).length, [currentEventIds, seenEvents]);

    const updateSeenEvents = useCallback((newEvents: string[]) => {
        setSeenEvents(currentSeenEvents => {
            const set = new Set([...Array.from(currentSeenEvents), ...newEvents]);
            const newVal = Array.from(set);
            writePersistentValue(ConfigKeys.SeenEvents, JSON.stringify(newVal));
            return set;
        });
    }, [setSeenEvents]);
  
    return (
        <NotificationsContext.Provider value={{ seenEvents, unseenEvents, updateSeenEvents }}>
            {props.children}
        </NotificationsContext.Provider>
    );
}
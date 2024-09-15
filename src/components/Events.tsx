
import { useEffect, useMemo, useState } from 'react';
import { useCalendar } from '../contexts/raid-bosses-context';
import LoadingRenderer from './LoadingRenderer';
import { IPostEntry, sortEntries, sortPosts } from '../DTOs/INews';
import './Events.scss';
import { inCamelCase, localeStringMiniature, localeStringSmallOptions } from '../utils/Misc';
import { usePokemon } from '../contexts/pokemon-context';
import PokemonMiniature from './PokemonMiniature';
import PokemonImage from './PokemonImage';
import { useNotifications } from '../contexts/notifications-context';

const Events = () => {
    const { posts, season, postsErrors, seasonErrors, seasonFetchCompleted, postsFetchCompleted, leekPosts, leekPostsErrors, leekPostsFetchCompleted } = useCalendar();
    const { updateSeenEvents } = useNotifications();

    const nonSeasonalPosts = useMemo(() => [...[...posts.flat(), ...leekPosts.filter(p => (p.spotlightPokemons?.length ?? 0) > 0 && p.spotlightBonus)].filter(p => p && ((p.wild?.length ?? 0) > 0 || (p.raids?.length ?? 0) > 0 || p.bonuses || (p.researches?.length ?? 0) > 0 || ((p.spotlightPokemons?.length ?? 0) > 0 && p.spotlightBonus)) && new Date(p.dateEnd ?? 0) >= new Date()).sort(sortPosts)]
    , [posts, leekPosts, sortPosts]);

    const relevantPosts = [season, ...nonSeasonalPosts];

    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const [selectedNews, setSelectedNews] = useState(posts.length === 0 ? 0 : 1);
    const [currentPlace, setCurrentPlace] = useState("0");
    const [currentEgg, setCurrentEgg] = useState("0");

    const postTitle = (post: IPostEntry) => `${post.title}-${post.subtitle}`;

    useEffect(() => {
        const justSeenPosts = nonSeasonalPosts.map(postTitle);
        updateSeenEvents(justSeenPosts);
    }, [updateSeenEvents, nonSeasonalPosts]);

    useEffect(() => {
        if (postsFetchCompleted) {
            setSelectedNews(posts.length === 0 ? 0 : 1);
        }

    }, [postsFetchCompleted, setSelectedNews, posts]);

    const idxToPlace = (idx: number) => {
        switch (idx) {
            case 0:
                return "Cities";
            case 1:
                return "Forests";
            case 2:
                return "Mountains";
            case 3:
                return "Beaches & Water";
            case 4:
                return "Northen Hemisphere";
            case 5:
                return "Southern Hemisphere";
        }
    }

    const idxToRes = (idx: number) => {
        switch (idx) {
            case 0:
                return "city";
            case 1:
                return "forest";
            case 2:
                return "mountain";
            case 3:
                return "water";
            case 4:
                return "north";
            case 5:
                return "south";
        }
    }

    const idxToEgg = (idx: number) => {
        switch (idx) {
            case 0:
                return "2km";
            case 1:
                return "5km";
            case 2:
                return "7km";
            case 3:
                return "10km";
            case 4:
                return "12km";
        }
    }

    const idxToEggName = (idx: number) => {
        switch (idx) {
            case 0:
                return "2 km";
            case 1:
                return "5 km";
            case 2:
                return "7 km";
            case 3:
                return "10 km";
            case 4:
                return "12 km";
        }
    }

    const idxToKind = (idx: number) => {
        switch (idx) {
            case 0:
                return 2;
            case 1:
                return 5;
            case 2:
                return 7;
            case 3:
                return 10;
            case 4:
                return 12;
        }
    }

    return <LoadingRenderer errors={postsErrors + seasonErrors + errors + leekPostsErrors} completed={seasonFetchCompleted && postsFetchCompleted && fetchCompleted && leekPostsFetchCompleted}>
        {relevantPosts.length === 0 || !relevantPosts[selectedNews] ?
            <span>No News!</span> :
            <div className='with-xl-gap'>
                <div className='with-dynamic-max-width auto-margin-sides'>
                    <div className='raid-container item'>
                        <div className='overflowing'>
                            <div className='news-gallery'>
                                {relevantPosts.map((p, i) =>
                                    <div key={postTitle(p)} className={`post-miniature clickable ${i === selectedNews ? "news-selected" : ""} ${i === 0 ? "season-miniature" : ""}`} onClick={() => setSelectedNews(i)}>
                                        <div className='miniature-date ellipsed'>{i === 0 ? "Season" : new Date(p.date).toLocaleString(undefined, localeStringMiniature)}</div>
                                        <div className='spotlight-miniature-container'>
                                            <img className='miniature-itself' src={p.imgUrl} />
                                            {(p.spotlightPokemons?.length ?? 0) > 0 && <PokemonImage
                                                pokemon = {gamemasterPokemon[p.spotlightPokemons![0].speciesId]}
                                                withName = {false}
                                                imgOnly
                                                withClassname = 'spotlighted-pokemon'
                                            />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className='with-dynamic-max-width auto-margin-sides'>
                    <div className='news-header-section item'>
                        <div className='event-img-container'>
                            <img className='event-img-itself' width="100%" height="100%" src={relevantPosts[selectedNews].imgUrl} />
                            {(relevantPosts[selectedNews].spotlightPokemons?.length ?? 0) > 0 && <PokemonImage
                                pokemon = {gamemasterPokemon[relevantPosts[selectedNews].spotlightPokemons![0].speciesId]}
                                withName = {false}
                                imgOnly
                                withClassname = 'spotlighted-pokemon'
                            />}
                        </div>
                        <div className={'current-news-title'}>{(relevantPosts[selectedNews].subtitle?.length ?? 0) > 15 ? relevantPosts[selectedNews].subtitle : relevantPosts[selectedNews].title}</div>
                        <div className='current-news-date'>
                            <div className='from-date date-container'>
                                {inCamelCase(new Date(relevantPosts[selectedNews].date).toLocaleString(undefined, localeStringSmallOptions))}
                            </div>
                            {<div className='from-date date-container'>
                                to
                            </div>}
                            <div className='to-date date-container'>
                                {inCamelCase(new Date(relevantPosts[selectedNews].dateEnd ?? 0).toLocaleString(undefined, localeStringSmallOptions))}
                            </div>
                        </div>
                        {relevantPosts[selectedNews]?.spotlightBonus && 
                            <span className='spotlight-bonus'>{relevantPosts[selectedNews]?.spotlightBonus}</span>
                        }
                    </div>
                </div>
            
                {relevantPosts[selectedNews]?.bonuses && <div className='with-dynamic-max-width auto-margin-sides'>
                    <div className='item default-padding bonus-container'>
                        {relevantPosts[selectedNews]?.bonuses?.split("\n").filter(b => b).map(b => <span key={b} className='ul-with-adorner'>{b}</span>)}
                    </div>
                </div>}
                    {(relevantPosts[selectedNews].wild ?? []).length > 0 &&
                    <div className='with-dynamic-max-width auto-margin-sides'>
                    <div className='item default-padding max-height'>
                        <div className='pvp-entry full-width smooth with-border fitting-content gapped smaller-title'>
                            <strong>Featured Wild Spawns</strong>
                        </div>
                        {selectedNews === 0 &&
                            <div className="raid-container">
                                <div className="overflowing">
                                    <div className="img-family">
                                        {[(season.wild ?? []).filter(e => e.kind === "0"), (season.wild ?? []).filter(e => e.kind === "1"), (season.wild ?? []).filter(e => e.kind === "2"), (season.wild ?? []).filter(e => e.kind === "3"), (season.wild ?? []).filter(e => e.kind === "4"), (season.wild ?? []).filter(e => e.kind === "5")]
                                            .map((t, i) => (
                                                <div className="clickable" key={i} onClick={() => setCurrentPlace(String(i))}>
                                                    <strong className={`move-detail ${String(i) === currentPlace ? "soft" : "baby-soft"} normal-padding item ${String(i) === currentPlace ? "extra-padding-right" : ""}`}>
                                                        <div className="img-padding"><img className="invert-light-mode" height={26} width={26} alt="type" src={`${process.env.PUBLIC_URL}/images/${idxToRes(i)}.png`} /></div>
                                                        {String(i) === currentPlace && idxToPlace(i)}
                                                    </strong>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        }
                        <div className={`with-flex contained ${selectedNews !== 0 ? "with-margin-top" : ""}`}>
                            {(relevantPosts[selectedNews].wild ?? [])
                                .filter(k => selectedNews !== 0 || k.kind === currentPlace)
                                .sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon)).map(p =>
                                    <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                                        <div className={`mini-card-wrapper`}>
                                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                        </div>
                                    </div>)}
                        </div>
                    </div></div>}
                    {(relevantPosts[selectedNews].raids ?? []).length > 0 &&
                    <div className='with-dynamic-max-width auto-margin-sides'>
                    <div className='item default-padding max-height'>
                        <div className='pvp-entry full-width smooth with-border fitting-content gapped smaller-title'>
                            <strong>Featured Raids</strong>
                        </div>
                        <div className={`with-flex contained with-margin-top`}>
                            {(relevantPosts[selectedNews].raids ?? [])
                                .sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon)).map(p =>
                                    <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                                        <div className={`mini-card-wrapper`}>
                                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                        </div>
                                    </div>)}
                        </div>
                    </div></div>}
                    {(relevantPosts[selectedNews].researches ?? []).length > 0 &&
                    <div className='with-dynamic-max-width auto-margin-sides'>
                    <div className='item default-padding max-height'>
                        <div className='pvp-entry full-width smooth with-border fitting-content gapped smaller-title'>
                            <strong>Featured Researches</strong>
                        </div>
                        <div className={`with-flex contained with-margin-top`}>
                            {(relevantPosts[selectedNews].researches ?? [])
                                .sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon)).map(p =>
                                    <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                                        <div className={`mini-card-wrapper`}>
                                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                        </div>
                                    </div>)}
                        </div>
                    </div></div>}
                    {(relevantPosts[selectedNews].eggs ?? []).length > 0 &&
                    <div className='with-dynamic-max-width auto-margin-sides'>
                    <div className='item default-padding max-height'>
                        <div className='pvp-entry full-width smooth with-border fitting-content gapped smaller-title'>
                            <strong>Featured Eggs</strong>
                        </div>
                        {selectedNews === 0 &&
                            <div className="raid-container">
                                <div className="overflowing">
                                    <div className="img-family">
                                        {[(season.eggs ?? []).filter(e => e.kind === "2"), (season.eggs ?? []).filter(e => e.kind === "5"), (season.eggs ?? []).filter(e => e.kind === "7"), (season.eggs ?? []).filter(e => e.kind === "10")]
                                            .map((t, i) => (
                                                <div className="clickable" key={i} onClick={() => setCurrentEgg(String(i))}>
                                                    <strong className={`move-detail ${String(i) === currentEgg ? "soft" : "baby-soft"} normal-padding item ${String(i) === currentEgg ? "extra-padding-right" : ""}`}>
                                                        <div className="img-padding"><img height={26} width={26} style={{ width: "auto" }} alt="type" src={`${process.env.PUBLIC_URL}/images/eggs/${idxToEgg(i)}.png`} /></div>
                                                        {String(i) === currentEgg && idxToEggName(i)}
                                                    </strong>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        }
                        <div className={`with-flex contained ${selectedNews !== 0 ? "with-margin-top" : ""}`}>
                            {(relevantPosts[selectedNews].eggs ?? [])
                                .filter(r => selectedNews !== 0 || !r.comment && r.kind === String(idxToKind(+currentEgg)))
                                .sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon)).map(p =>
                                    <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                                        <div className={`mini-card-wrapper`}>
                                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                        </div>
                                    </div>)}
                        </div>
                        {(relevantPosts[selectedNews].eggs?.length ?? 0) > 0 && relevantPosts[selectedNews].eggs!.some(e => e.comment && e.kind === String(idxToKind(+currentEgg))) && <div className='centered-text with-xl-padding'>
                            <strong>{relevantPosts[selectedNews].eggs!.find(e => e.kind === String(idxToKind(+currentEgg)) && e.comment)!.comment}:</strong>
                        </div>}
                        <div className='with-flex contained'>
                            {(relevantPosts[selectedNews].eggs ?? []).filter(r => r.comment && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p => <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                                <div className={`mini-card-wrapper`}>
                                    <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                                </div>
                            </div>)}
                        </div>

                    </div></div>}
                </div>
        }
    </LoadingRenderer>;
}

export default Events;
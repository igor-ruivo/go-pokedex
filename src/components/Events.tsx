
import { useEffect, useState } from 'react';
import { useCalendar } from '../contexts/raid-bosses-context';
import LoadingRenderer from './LoadingRenderer';
import { IPostEntry, sortPosts } from '../DTOs/INews';
import './Events.scss';
import { inCamelCase, localeStringMiniature, localeStringSmallOptions } from '../utils/Misc';
import PostEntry from './PostEntry';

const Events = () => {
    const { posts, season, postsErrors, seasonErrors, seasonFetchCompleted, postsFetchCompleted } = useCalendar();

    const relevantPosts = [season, ...posts.flat().filter(p => p && ((p.wild?.length ?? 0) > 0 || (p.raids?.length ?? 0) > 0 || p.bonuses || (p.researches?.length ?? 0) > 0) /*&& new Date(p.dateEnd ?? 0) >= new Date()*/).sort(sortPosts)];

    const [selectedNews, setSelectedNews] = useState(1);
    const [currentPlace, setCurrentPlace] = useState("0");

    const postTitle = (post: IPostEntry) => `${post.title}-${post.subtitle}`;

    useEffect(() => {
        if (postsFetchCompleted) {
            setSelectedNews(1);
        }

    }, [postsFetchCompleted, setSelectedNews]);
    
    return <LoadingRenderer errors={postsErrors + seasonErrors} completed={seasonFetchCompleted && postsFetchCompleted}>
        {relevantPosts.length === 0 || !relevantPosts[selectedNews] ?
            <span>No News!</span> :
            <div className='news-display-layout'>
                <div className='overflowing'>
                    <div className='news-gallery'>
                        {relevantPosts.map((p, i) =>
                            <div key={postTitle(p)} className={`post-miniature clickable ${i === selectedNews ? "news-selected" : ""} ${i === 0 ? "season-miniature" : ""}`} onClick={() => setSelectedNews(i)}>
                                <div className='miniature-date'>{i === 0 ? "Season" : new Date(p.date).toLocaleString(undefined, localeStringMiniature)}</div>
                                <img src={p.imgUrl}/>
                            </div>
                        )}
                    </div>
                </div>
                <div className='news-header-section'>
                    <img width="100%" height="100%" src={relevantPosts[selectedNews].imgUrl}/>
                    <div className='current-news-main-info'>
                        <div className='current-news-title ellipsed'>{relevantPosts[selectedNews].subtitle ?? relevantPosts[selectedNews].title}</div>
                        <div className='current-news-date'>
                            <div className='from-date date-container'>
                                <span>From:</span>
                                {inCamelCase(new Date(relevantPosts[selectedNews].date).toLocaleString(undefined, localeStringSmallOptions))}
                            </div>
                            <div className='to-date date-container'>
                                <span>To:</span>
                                {inCamelCase(new Date(relevantPosts[selectedNews].dateEnd ?? 0).toLocaleString(undefined, localeStringSmallOptions))}
                            </div>
                        </div>
                        {relevantPosts[selectedNews]?.bonuses && <div className='current-news-bonus'>
                            <div className='item default-padding bonus-container'>
                                {relevantPosts[selectedNews]?.bonuses?.split("\n").filter(b => b).map(b => <ul key={b} className='ul-with-adorner'>{b}</ul>)}
                            </div>
                        </div>}
                    </div>
                </div>
                <div className='pokemon_with_ivs'>
                    {((relevantPosts[selectedNews].wild ?? []).length > 0 || (relevantPosts[selectedNews].researches ?? []).length > 0) && <><div className='item default-padding'>
                        <div className='pvp-entry full-width smooth with-border fitting-content gapped'>
                            <strong>Wild Spawns</strong>
                        </div>
                        <PostEntry collection={relevantPosts[selectedNews].wild ?? []} withoutTitle={true} post={relevantPosts[selectedNews]} kindFilter={relevantPosts[selectedNews].isSeason ? currentPlace : undefined} />
                    </div>
                    <div className='item default-padding'>
                        <div className='pvp-entry full-width smooth with-border fitting-content gapped'>
                            <strong>Researches</strong>
                        </div>
                        <PostEntry collection={relevantPosts[selectedNews].researches ?? []} withoutTitle={true} post={relevantPosts[selectedNews]} kindFilter={relevantPosts[selectedNews].isSeason ? currentPlace : undefined} />
                    </div></>}
                    {((relevantPosts[selectedNews].raids ?? []).length > 0 || (relevantPosts[selectedNews].eggs ?? []).length > 0) && <><div className='item default-padding'>
                        <div className='pvp-entry full-width smooth with-border fitting-content gapped'>
                            <strong>Raids</strong>
                        </div>
                        <PostEntry collection={relevantPosts[selectedNews].raids ?? []} withoutTitle={true} post={relevantPosts[selectedNews]} kindFilter={relevantPosts[selectedNews].isSeason ? currentPlace : undefined} />
                    </div>
                    <div className='item default-padding'>
                        <div className='pvp-entry full-width smooth with-border fitting-content gapped'>
                            <strong>Eggs</strong>
                        </div>
                        <PostEntry collection={relevantPosts[selectedNews].eggs ?? []} withoutTitle={true} post={relevantPosts[selectedNews]} kindFilter={relevantPosts[selectedNews].isSeason ? currentPlace : undefined} />
                    </div></>}
                </div>
            </div>
        }
    </LoadingRenderer>;
}

export default Events;
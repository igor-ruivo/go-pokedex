
import { useEffect, useState } from 'react';
import { useCalendar } from '../contexts/raid-bosses-context';
import LoadingRenderer from './LoadingRenderer';
import { sortPosts } from '../DTOs/INews';
import './Events.scss';
import { inCamelCase, localeStringSmallOptions } from '../utils/Misc';

const Events = () => {
    const { posts, season, postsErrors, seasonErrors, seasonFetchCompleted, postsFetchCompleted } = useCalendar();

    const relevantPosts = posts.flat().filter(p => p && ((p.wild?.length ?? 0) > 0 || (p.raids?.length ?? 0) > 0 || p.bonuses || (p.researches?.length ?? 0) > 0) && new Date(p.dateEnd ?? 0) >= new Date()).sort(sortPosts);

    const [selectedNews, setSelectedNews] = useState(relevantPosts[0]);

    useEffect(() => {
        if (postsFetchCompleted) {
            setSelectedNews(relevantPosts[0]);
        }
    }, [postsFetchCompleted, setSelectedNews]);
    
    return <LoadingRenderer errors={postsErrors + seasonErrors} completed={seasonFetchCompleted && postsFetchCompleted}>
        {relevantPosts.length === 0 || !selectedNews ?
            <span>No News!</span> :
            <div className='news-display-layout'>
                <div className='news-header-section'>
                    <img width="100%" height="100%" src={selectedNews.imgUrl}/>
                    <div className='current-news-main-info'>
                        <div className='current-news-title'>{selectedNews.subtitle ?? selectedNews.title}</div>
                        <div className='current-news-date'>
                            <div className='from-date date-container'>
                                <span>From:</span>
                                {inCamelCase(new Date(selectedNews.date).toLocaleString(undefined, localeStringSmallOptions))}
                            </div>
                            <div className='to-date date-container'>
                                <span>To:</span>
                                {inCamelCase(new Date(selectedNews.dateEnd ?? 0).toLocaleString(undefined, localeStringSmallOptions))}
                            </div>
                        </div>
                        <div className='current-news-bonus'>
                            <div className='default-padding'>
                                {selectedNews?.bonuses?.split("\n").filter(b => b).map(b => <ul key={b} className='ul-with-adorner'>{b}</ul>)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className='current-news-detail'>

                </div>
                <div className='future-news-section'>

                </div>
            </div>
        }
    </LoadingRenderer>;
}

export default Events;
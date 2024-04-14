import { useState } from 'react';
import { IPostEntry } from '../DTOs/INews';
import './News.scss';

interface INews {
    news: IPostEntry[];
    season: IPostEntry;
};

const InCamelCase = (str: string) => str?.substring(0, 1)?.toUpperCase() + str?.substring(1);

const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    weekday: 'short',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
}

const smallOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
}

const News = ({news, season}: INews) => {
    const [selectedNews, setSelectedNews] = useState(news[1]);

    return news.length === 0 ?
        <span>No News!</span> :
        <div className='news-display-layout'>
            <div className='news-header-section'>
                <img width="100%" height="100%" src={selectedNews.imgUrl}/>
                <div className='current-news-main-info'>
                    <div className='current-news-title'>{selectedNews.subtitle ?? selectedNews.title}</div>
                    <div className='current-news-date'>
                        <div className='from-date date-container'>
                            <span>From:</span>
                            {InCamelCase(new Date(selectedNews.date).toLocaleString(undefined, smallOptions))}
                        </div>
                        <div className='to-date date-container'>
                            <span>To:</span>
                            {InCamelCase(new Date(selectedNews.dateEnd ?? 0).toLocaleString(undefined, smallOptions))}
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
        </div>;
}

export default News;
import { useState } from "react";
import Select from "react-select";
import { IPostEntry, sortPosts } from "../DTOs/INews";
import { inCamelCase, localeStringSmallestOptions } from "../utils/Misc";
import { useCalendar } from "../contexts/raid-bosses-context";
import LoadingRenderer from "./LoadingRenderer";

const getDateKey = (obj: IPostEntry) => String(obj?.date?.valueOf()) + "-" + String(obj?.dateEnd?.valueOf());

const Raids = () => {
    const [currentBossDate, setCurrentBossDate] = useState("current");

    const {leekPosts, posts, leekPostsFetchCompleted, postsFetchCompleted, leekPostsErrors, postsErrors} = useCalendar();

    const reducedLeekPosts = leekPostsFetchCompleted ? leekPosts.filter(p => (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date()) : [];
    const reducedRaids = postsFetchCompleted ? posts.flat().filter(p => p && (p.raids?.length ?? 0) > 0 && new Date(p.dateEnd ?? 0) >= new Date()) : [];
    
    const additionalBosses = Object.entries([...reducedLeekPosts, ...reducedRaids]
        .reduce((acc: { [key: string]: IPostEntry }, obj) => {
            const key = getDateKey(obj);
            // If the key already exists in the accumulator, merge 'entries'
            if (acc[key]) {
                acc[key].raids = [...(acc[key].raids ?? []), ...(obj.raids ?? [])];
            } else {
                // Otherwise, initialize it with the current object (ignoring 'kind' or keeping it arbitrarily)
                acc[key] = { title: obj.title, imgUrl: obj.imgUrl, date: obj.date, dateEnd: obj.dateEnd, raids: obj.raids };
            }
            return acc;
        }, {}))
        .map(([key, value]) => ({
            title: value.title,
            imgUrl: value.imgUrl,
            date: value.date,
            dateEnd: value.dateEnd,
            raids: value.raids
        } as IPostEntry));

    const remainingBosses = additionalBosses
        .filter(e => (e.raids?.length ?? 0) > 0 && e.date > new Date().valueOf())
        .sort(sortPosts);

    const raidEventDates = [{ label: "Current", value: "current" }, ...remainingBosses.map(e => ({ label: inCamelCase(new Date(e.date).toLocaleString(undefined, localeStringSmallestOptions)), value: getDateKey(e) }) as any)];

    return <LoadingRenderer errors={postsErrors + leekPostsErrors} completed={postsFetchCompleted && leekPostsFetchCompleted}>
        <div className='boss-header-filters'>
            <div className='raid-date-element'>
                <Select
                    className={`navbar-dropdown-family`}
                    isSearchable={false}
                    value={raidEventDates.find(o => o.value === currentBossDate)}
                    options={raidEventDates}
                    onChange={e => setCurrentBossDate((e as any).value)}
                    formatOptionLabel={(data, _) => <div className="hint-container">{<div className="img-padding"><img className='invert-dark-mode' src={`${process.env.PUBLIC_URL}/images/calendar.png`} style={{ width: "auto" }} height={16} width={16} /></div>}<strong className="aligned-block ellipsed normal-text">{data.label}</strong></div>}
                />
            </div>
        </div>
    </LoadingRenderer>;
}

export default Raids;
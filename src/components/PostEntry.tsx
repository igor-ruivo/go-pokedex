import { IEntry, IPostEntry, sortEntries } from "../DTOs/INews";
import { usePokemon } from "../contexts/pokemon-context";
import useCountdown from "../hooks/useCountdown";
import { inCamelCase, localeStringSmallOptions } from "../utils/Misc";
import PokemonMiniature from "./PokemonMiniature";

interface IPost {
    post: IPostEntry;
    collection: IEntry[];
    kindFilter?: string;
    withoutTitle?: boolean;
    withRaidCPStringOverride?: boolean;
    withItemBorder?: boolean;
}

const PostEntry = ({ post, collection, kindFilter, withoutTitle, withRaidCPStringOverride, withItemBorder }: IPost) => {
    const { gamemasterPokemon } = usePokemon();
    const { days, hours, minutes, seconds } = useCountdown(post.dateEnd ?? 0);

    const computeCount = (d: number, h: number, m: number, s: number) => {
        if (!d && !h && !m && !s) {
            return "Expired";
        }
    
        return d > 0 ? `${d} day${d > 1 ? "s" : ""} left` : `${h}h:${m}m:${s}s`;
    }
    
    const now = new Date();
    const postIsNow = now > new Date(post.date) && now < new Date(post.dateEnd ?? 0);

    const computeString = (kind: string | undefined, isShadow: boolean) => {
        if (!kind) {
            return undefined;
        }

        if (kind.toLocaleLowerCase().includes("mega")) {
            return "Mega Raid";
        }

        return `Tier ${kind}${isShadow && !kind.toLocaleLowerCase().includes("shadow") ? " Shadow" : ""}`;
    }

    return <div className='with-dynamic-max-width auto-margin-sides'>
        {!withoutTitle && postIsNow && <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>At the moment <span className="computeCount">({computeCount(days, hours, minutes, seconds)})</span></strong>}
        {!withoutTitle && !postIsNow && <strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>{inCamelCase(new Date(post.date).toLocaleString(undefined, localeStringSmallOptions)) + " - " + inCamelCase(new Date(post.dateEnd ?? 0).toLocaleString(undefined, localeStringSmallOptions))}</strong>}
        <div className={withItemBorder ? 'item default-padding' : ""}>
            <div className='with-flex contained'>
                {collection.filter(k => !kindFilter || kindFilter === k.kind).sort((e1, e2) => sortEntries(e1, e2, gamemasterPokemon)).map(p => <div key={p.speciesId + p.kind} className="card-wrapper-padding dynamic-size">
                    <div className={`card-wrapper ${!post.isSeason && (p.kind === "mega" || p.kind?.includes("5") || p.kind?.includes("6")) ? "with-golden-border" : ""}`}>
                        <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} cpStringOverride={withRaidCPStringOverride ? computeString(p.kind, gamemasterPokemon[p.speciesId].isShadow) : undefined} />
                    </div>
                </div>)}
            </div>
        </div>
    </div>
}

export default PostEntry;
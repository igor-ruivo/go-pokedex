import { PokemonTypes } from "../DTOs/PokemonTypes";
import { useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import { ordinal } from "../utils/conversions";
import { buildRankString } from "./LeagueRanks";
import { translatedType } from "./PokemonInfoImagePlaceholder";
import "./RaidCard.scss"

interface IRaidCardProps {
    type: PokemonTypes;
    rank: number;
    dps: number;
}

const RaidCard = ({
    type,
    rank,
    dps
}: IRaidCardProps) => {
    const {currentLanguage} = useLanguage();
    const raidUrl = `${process.env.PUBLIC_URL}/images/raid.webp`;
    const url = `${process.env.PUBLIC_URL}/images/types/${type?.toString().toLocaleLowerCase()}.png`;
    return <div className="raid-wrapper">
        {type && rank ? <img className="raid-img" src={url} width={32} height={32} alt={type.toString()} /> : <img className="raid-img" src={raidUrl} width={48} height={48} alt={type?.toString()} />}
        {rank !== 0 && <section className="raid-rank-types">
            <div className="flex pvp-entry smooth with-shadow with-raid-padding">
                <strong className="cp-container with-brightness">
                    {buildRankString(ordinal(rank), currentLanguage)}&nbsp;
                </strong>
                <strong>
                    {translator(TranslatorKeys.Ranked, currentLanguage)}
                </strong>
            </div>
            <small className="card-footer">
                {translator(TranslatorKeys.Types1, currentLanguage)} {translatedType(type, currentLanguage)} {translator(TranslatorKeys.Types2, currentLanguage)}<br/><sub className="contained-big weighted-font">{`(${Math.round(dps * 100) / 100} DPS)`}</sub>
            </small>
        </section>}
    </div>;
}

export default RaidCard;
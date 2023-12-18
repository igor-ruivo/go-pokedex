import { PokemonTypes } from "../DTOs/PokemonTypes";
import { useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import { ordinal } from "../utils/conversions";
import { buildRankString } from "./LeagueRanks";
import { translatedType } from "./PokemonInfoImagePlaceholder";
import "./RaidCard.scss"

interface IRaidCardProps {
    type: string;
    typedType: PokemonTypes;
    rank: number;
}

const RaidCard = ({
    type,
    typedType,
    rank
}: IRaidCardProps) => {
    const {currentLanguage} = useLanguage();
    const raidUrl = `${process.env.PUBLIC_URL}/images/raid.webp`;
    const url = `${process.env.PUBLIC_URL}/images/types/${type.toLocaleLowerCase()}.png`;
    return <div className="raid-wrapper" style={{background: type ? `var(--type-${type})` : ``}}>
        {type && <img className="raid-img" src={url} width={32} height={32} alt={type} />}
        {!type && <img className="raid-img-with-contrast" src={raidUrl} width={48} height={48} alt={type} />}
        {rank !== 0 && <section className="raid-rank-types">
            <div className="flex pvp-entry smooth with-shadow">
                <strong className="cp-container with-brightness">
                    {buildRankString(ordinal(rank), currentLanguage)}&nbsp;
                </strong>
                <strong>
                    {translator(TranslatorKeys.Ranked, currentLanguage)}
                </strong>
            </div>
            <small className="card-footer">
                {translator(TranslatorKeys.Types1, currentLanguage)} {translatedType(typedType, currentLanguage)} {translator(TranslatorKeys.Types2, currentLanguage)}
            </small>
        </section>}
    </div>;
}

export default RaidCard;
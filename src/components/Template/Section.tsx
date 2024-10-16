import PokemonHeader from "../PokemonHeader";
import "./Section.scss";

interface ISection {
    title: string;
    darker?: boolean;
    special?: boolean;
    fullMargins?: boolean;
}

const Section = (props: React.PropsWithChildren<ISection>) => {
    return <div className={`content popup-color sub-title without-shadow ${!props.fullMargins ? "with-dynamic-max-width auto-margin-sides" : ""}`}>
        <PokemonHeader
            pokemonName={props.title}
            type1={undefined}
            type2={undefined}
            defaultTextColor
            defaultBannerColor
            whiteTextColor
            darker={props.darker}
            special={props.special}
        />
        <div className="pokemon">
            {props.children}
        </div>
    </div>;
}

export default Section;
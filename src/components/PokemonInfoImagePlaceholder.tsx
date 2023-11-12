import { PropsWithChildren } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import PokemonImage from "./PokemonImage";
import "./PokemonInfoImagePlaceholder.scss";

interface IPokemonInfoImagePlaceholderProps {
    pokemon: IGamemasterPokemon;
    computedCP: number;
    computedAtk: number;
    computedDef: number;
    computedHP: number;
    displayLevel: number;
    setDisplayLevel: (newLevel: number) => void;
    imageRef?: React.RefObject<HTMLImageElement>
}

const PokemonInfoImagePlaceholder = (props: PropsWithChildren<IPokemonInfoImagePlaceholderProps>) => {
    const {currentLanguage} = useLanguage();

    const translatedType = (type: PokemonTypes) => {
        const translatorKey = TranslatorKeys[type];
        return translator(translatorKey as any, currentLanguage)
    }

    const valueToLevel = (value: number) => {
        return value / 2 + 0.5
    }

    return <>
        <div className="pokemon_main_info">
            <div className="image_placeholder">
                <PokemonImage ref={props.imageRef} pokemon={props.pokemon} withName={false}/>
                <span className="pokemon_metadata">
                    <span className="pokemon_number">
                        #
                        {props.pokemon.dex}
                    </span>
                    <span className="pokemon_types">
                        {props.pokemon.types[0] && <span className="pokemon_type_bg" style={{backgroundColor: `var(--type-${props.pokemon.types[0]})`}}>
                            {translatedType(props.pokemon.types[0])}
                        </span>}
                        {props.pokemon.types[1] && <span className="pokemon_type_bg" style={{backgroundColor: `var(--type-${props.pokemon.types[1]})`}}>
                            {translatedType(props.pokemon.types[1])}
                        </span>}
                    </span>
                </span>
            </div>
            <div className="stats_ranks">
                <div className="cp_stats">
                    <span className="cp-level">
                        <strong className="cp-container">{props.computedCP} {translator(TranslatorKeys.CP, currentLanguage)}</strong>
                        <div><span className="at_separator">&nbsp;@</span> {translator(TranslatorKeys.Level, currentLanguage)}&nbsp;{<select value={props.displayLevel} onChange={e => props.setDisplayLevel(+e.target.value)} className="select-level">
                            {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                            .map(e => (<option key={e} value={e}>{e}</option>))}
                        </select>}</div>
                    </span>
                    <div>
                        <strong className="pokemon_stats">
                            <span className="pvp_stat">
                                <span>{props.computedAtk}</span>
                                <span>{translator(TranslatorKeys.ATK, currentLanguage).toLocaleUpperCase()}</span>
                            </span>
                            <span className="pvp_stat">
                                <span>{props.computedDef}</span>
                                <span>DEF</span>
                            </span>
                            <span className="pvp_stat">
                                <span>{props.computedHP}</span>
                                <span>{translator(TranslatorKeys.HP, currentLanguage).toLocaleUpperCase()}</span>
                            </span>
                        </strong>
                    </div>
                </div>
                {props.children}
            </div>
        </div>
    </>;
}

export default PokemonInfoImagePlaceholder;
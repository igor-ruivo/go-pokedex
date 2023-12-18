import { PropsWithChildren } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { Language, useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import PokemonImage from "./PokemonImage";
import "./PokemonInfoImagePlaceholder.scss";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";

interface IPokemonInfoImagePlaceholderProps {
    pokemon: IGamemasterPokemon;
    computedCP: number;
    computedAtk: number;
    computedDef: number;
    computedHP: number;
    displayLevel: number;
    setDisplayLevel: (newLevel: number) => void;
}

const valueToLevel = (value: number) => {
    return value / 2 + 0.5
}

export const translatedType = (type: PokemonTypes, language: Language) => {
    const translatorKey = TranslatorKeys[type];
    return translator(translatorKey as any, language)
}

const PokemonInfoImagePlaceholder = (props: PropsWithChildren<IPokemonInfoImagePlaceholderProps>) => {
    const {currentLanguage, currentGameLanguage} = useLanguage();

    return <div className="with-margin-bottom">
        <div className="pokemon_main_info item">
            <PokemonImage
                pokemon={props.pokemon}
                withName={false}
                galleryToggle
            />
            <div>
                <span className="pokemon_number">
                    #
                    {props.pokemon.dex}
                </span>
                <span className="pokemon_types">
                    {props.pokemon.types[0] && <span className="pokemon_type_bg" style={{backgroundColor: `var(--type-${props.pokemon.types[0]})`}}>
                        {translatedType(props.pokemon.types[0], currentLanguage)}
                    </span>}
                    {props.pokemon.types[1] && <span className="pokemon_type_bg" style={{backgroundColor: `var(--type-${props.pokemon.types[1]})`}}>
                        {translatedType(props.pokemon.types[1], currentLanguage)}
                    </span>}
                </span>
                <span className="cp-level big">
                    <strong className="cp-container with-brightness very-big">{props.computedCP} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}</strong> @
                    <div className="weighted-font">{translator(TranslatorKeys.LVL, currentLanguage)}&nbsp;{<select value={props.displayLevel} onChange={e => props.setDisplayLevel(+e.target.value)} className="select-level big">
                        {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                    </select>}</div>
                </span>
            </div>
        </div>
    </div>;
}

export default PokemonInfoImagePlaceholder;
import { PropsWithChildren } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { Language, useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import PokemonImage from "./PokemonImage";
import "./PokemonInfoImagePlaceholder.scss";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { useLocation } from "react-router-dom";
import PokemonFamily from "./PokemonFamily";

interface IPokemonInfoImagePlaceholderProps {
    pokemon: IGamemasterPokemon;
    computedCP: number;
    displayLevel: number;
    computedPokemonFamily: Set<IGamemasterPokemon> | undefined;
    tab: string;
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
    const { pathname } = useLocation();

    return <div className="column item with-small-margin-top">
        <div className="pokemon_main_info">
            <PokemonImage
                pokemon={props.pokemon}
                withName={false}
                galleryToggle
                lowRes={false}
            />
            <div className="with-margin-left">
                
                <strong className="pkm-stats-container">
                    <div className="atk-stat">
                        <div className="stat-label">
                            ATK
                        </div>
                        <div className="stat-value">
                            {props.pokemon.atk}
                        </div>
                    </div>
                    <div className="def-stat">
                        <div className="stat-label">
                            DEF
                        </div>
                        <div className="stat-value">
                            {props.pokemon.def}
                        </div>
                    </div>
                    <div className="hp-stat">
                        <div className="stat-label">
                            HP
                        </div>
                        <div className="stat-value">
                            {props.pokemon.hp}
                        </div>
                    </div>
                    <div className="weather-boost aligned-end no-contrast">
                        {["grass", "fire", "ground"].some(h => props.pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(h)) && <img className="pkm-weather-boost-img" src={`${process.env.PUBLIC_URL}/images/weather/sunny.png`} alt="sunny" height="100%" width="100%"/>}
                        {["water", "electric", "bug"].some(h => props.pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(h)) && <img className="pkm-weather-boost-img" src={`${process.env.PUBLIC_URL}/images/weather/rainy.png`} alt="rainy" height="100%" width="100%"/>}
                        {["normal", "rock"].some(h => props.pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(h)) && <img className="pkm-weather-boost-img" src={`${process.env.PUBLIC_URL}/images/weather/partly-cloudy.png`} alt="partly cloudy" height="100%" width="100%"/>}
                        {["fairy", "fighting", "poison"].some(h => props.pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(h)) && <img className="pkm-weather-boost-img" src={`${process.env.PUBLIC_URL}/images/weather/cloudy.png`} alt="cloudy" height="100%" width="100%"/>}
                        {["flying", "dragon", "psychic"].some(h => props.pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(h)) && <img className="pkm-weather-boost-img" src={`${process.env.PUBLIC_URL}/images/weather/windy.png`} alt="windy" height="100%" width="100%"/>}
                        {["ice", "steel"].some(h => props.pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(h)) && <img className="pkm-weather-boost-img" src={`${process.env.PUBLIC_URL}/images/weather/snow.png`} alt="snow" height="100%" width="100%"/>}
                        {["dark", "ghost"].some(h => props.pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(h)) && <img className="pkm-weather-boost-img" src={`${process.env.PUBLIC_URL}/images/weather/fog.png`} alt="fog" height="100%" width="100%"/>}
                    </div>
                </strong>

                <span className="cp-level big">
                    <strong className="cp-container very-big">{props.computedCP} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}</strong> @
                    <div className="weighted-font">{translator(TranslatorKeys.LVL, currentLanguage)}&nbsp;{<select value={props.displayLevel} onChange={e => props.setDisplayLevel(+e.target.value)} disabled={pathname.endsWith("counters") || pathname.endsWith("tables") || pathname.endsWith("strings")} className="select-level big">
                        {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                        .map(e => (<option key={e} value={e}>{e}</option>))}
                    </select>}</div>
                </span>
                
                <span className="pokemon_types">
                    {props.pokemon.types[0] && <span className="pokemon_type_bg" style={{backgroundColor: `var(--type-${props.pokemon.types[0]})`}}>
                        {translatedType(props.pokemon.types[0], currentLanguage)}
                    </span>}
                    {props.pokemon.types[1] && <span className="pokemon_type_bg" style={{backgroundColor: `var(--type-${props.pokemon.types[1]})`}}>
                        {translatedType(props.pokemon.types[1], currentLanguage)}
                    </span>}
                </span>
            </div>
            </div>
                                        
            {props.computedPokemonFamily && <PokemonFamily
                pokemon={props.pokemon}
                similarPokemon={props.computedPokemonFamily}
                getClickDestination={(speciesId: string) => `/pokemon/${speciesId}/${props.tab.substring(props.tab.lastIndexOf("/") + 1)}`}
            />}
        </div>;
}

export default PokemonInfoImagePlaceholder;
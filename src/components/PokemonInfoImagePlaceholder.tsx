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
import Select from "react-select";

interface IPokemonInfoImagePlaceholderProps {
    pokemon: IGamemasterPokemon;
    computedCP: number;
    displayLevel: number;
    computedPokemonFamily: Set<IGamemasterPokemon> | undefined;
    tab: string;
    setDisplayLevel: (newLevel: number) => void;
}

interface WeatherImageInfo {
    types: string[];
    image: string;
    alt: string;
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

    const isDisabled = pathname.endsWith("counters") || pathname.endsWith("tables") || pathname.endsWith("strings");
    const levelOptions = Array.from({length: 101}, (_x, i) => valueToLevel(i + 1)).map(e => ({label: e, value: e}) as any);

    const conditions: WeatherImageInfo[] = [
        { types: ["grass", "fire", "ground"], image: "sunny.png", alt: "sunny" },
        { types: ["water", "electric", "bug"], image: "rainy.png", alt: "rainy" },
        { types: ["normal", "rock"], image: "partly-cloudy.png", alt: "partly cloudy" },
        { types: ["fairy", "fighting", "poison"], image: "cloudy.png", alt: "cloudy" },
        { types: ["flying", "dragon", "psychic"], image: "windy.png", alt: "windy" },
        { types: ["ice", "steel"], image: "snow.png", alt: "snow" },
        { types: ["dark", "ghost"], image: "fog.png", alt: "fog" }
    ];

    let matchCount = 0;
    const imagesToRender = conditions.flatMap(condition => {
        if (condition.types.some(type => props.pokemon.types.map(t => t.toString().toLowerCase()).includes(type))) {
            matchCount++;
            return [{
                ...condition,
                className: matchCount === 1 ? "pkm-weather-boost-img " : "pkm-weather-boost-img shifted-left"
            }];
        }
        return [];
    });

    return <div className="column item with-small-margin-top">
        <div className="pokemon_main_info">
            <PokemonImage
                pokemon={props.pokemon}
                withName={false}
                galleryToggle
                lowRes={false}
            />
            <div className="with-margin-left">

                <span className="cp-level">
                    <strong className="cp-container very-big">{props.computedCP} {gameTranslator(GameTranslatorKeys.CP, currentGameLanguage).toLocaleUpperCase()}</strong>
                </span>
                
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
                        {imagesToRender.map((img, index) => (
                            <img key={index} className={img.className} src={`${process.env.PUBLIC_URL}/images/weather/${img.image}`} alt={img.alt} height="100%" width="100%"/>
                        ))}
                    </div>
                </strong>
                
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
            <div className="row justified aligned with-big-gap">
            {props.computedPokemonFamily && <PokemonFamily
                pokemon={props.pokemon}
                similarPokemon={props.computedPokemonFamily}
                getClickDestination={(speciesId: string) => `/pokemon/${speciesId}/${props.tab.substring(props.tab.lastIndexOf("/") + 1)}`}
            />}
            <div className="level-element">
                <Select
                    className={`navbar-dropdown-family ${isDisabled ? "disabled" : ""}`}
                    isSearchable={false}
                    isDisabled={isDisabled}
                    value={levelOptions.find(o => o.label === props.displayLevel)}
                    options={levelOptions}
                    onChange={e => props.setDisplayLevel((e as any).label)}
                    formatOptionLabel={(data, _) => <div className="hint-container mini-margin-left normal-text"><strong className="aligned-block ellipsed">{translator(TranslatorKeys.Level, currentLanguage)} {<span className="cp-container">{data.label}</span>}</strong></div>}
                />
            </div>
            </div>
        </div>;
}

export default PokemonInfoImagePlaceholder;
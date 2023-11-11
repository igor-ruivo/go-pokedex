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

const PokemonInfoImagePlaceholder = ({pokemon, computedCP, computedAtk, computedDef, computedHP, displayLevel, setDisplayLevel, imageRef}: IPokemonInfoImagePlaceholderProps) => {
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
                <PokemonImage ref={imageRef} pokemon={pokemon} withName={false}/>
                <span className="pokemon_metadata">
                    <span className="pokemon_number">
                        #
                        {pokemon.dex}
                    </span>
                    <span className="pokemon_types">
                        {pokemon.types[0] && <span className="pokemon_type_bg" style={{backgroundColor: `var(--type-${pokemon.types[0]})`}}>
                            {translatedType(pokemon.types[0])}
                        </span>}
                        {pokemon.types[1] && <span className="pokemon_type_bg" style={{backgroundColor: `var(--type-${pokemon.types[1]})`}}>
                            {translatedType(pokemon.types[1])}
                        </span>}
                    </span>
                </span>
            </div>
            <span>
                <strong className="cp-container">{computedCP} {translator(TranslatorKeys.CP, currentLanguage)}</strong>
                &nbsp;@ {translator(TranslatorKeys.Level, currentLanguage)} {<select value={displayLevel} onChange={e => setDisplayLevel(+e.target.value)} className="select-level">
                    {Array.from({length: 101}, (_x, i) => valueToLevel(i + 1))
                    .map(e => (<option key={e} value={e}>{e}</option>))}
                </select>}
            </span>
            <div>
                <strong className="pokemon_stats">
                    <span>
                        {computedAtk} {translator(TranslatorKeys.ATK, currentLanguage).toLocaleUpperCase()}
                    </span>
                    <span>
                        {computedDef} DEF
                    </span>
                    <span>
                        {computedHP} {translator(TranslatorKeys.HP, currentLanguage).toLocaleUpperCase()}
                    </span>
                </strong>
            </div>
        </div>
    </>;
}

export default PokemonInfoImagePlaceholder;
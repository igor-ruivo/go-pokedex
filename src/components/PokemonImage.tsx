import { ReactNode, forwardRef } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonImage.css";
import { useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";

interface IPokemonImage {
    pokemon: IGamemasterPokemon;
    withName: boolean;
    withMetadata: boolean;
    descriptionComponent?: ReactNode;
    xl?: boolean;
    buddy?: boolean;
    specificWidth?: number;
    specificHeight?: number;
}

const PokemonImage = forwardRef<HTMLImageElement, IPokemonImage>(({pokemon, withName, withMetadata, descriptionComponent, xl, buddy, specificWidth, specificHeight}: IPokemonImage, ref) => {
    const {currentLanguage} = useLanguage();

    return (
        <>
            <span className="images-container">
                <span className="main-image-container">
                    <img ref={ref} alt={pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} height={specificWidth ?? "100%"} width={specificWidth ?? "100%"} src={pokemon.imageUrl}/>
                    {pokemon.isMega && <span className="mega-container"><img alt="mega" height="100%" width="100%" src="https://i.imgur.com/sayBxjT.png"/></span>}
                    {pokemon.isShadow && <img className='image shadow-overlay' width="100%" height="100%" src="https://i.imgur.com/OS1Whqr.png" alt={pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} />}
                    {xl && <img alt="xl" className='image xl-overlay' src='https://i.imgur.com/NTtZq10.png' width="100%" height="100%"/>}
                    {buddy && <img alt="buddy" className='image buddy-overlay' src='https://i.imgur.com/MGCXGl0.png' width="100%" height="100%"/>}
                </span>
                {descriptionComponent && descriptionComponent}
            </span>
            {withName && pokemon.speciesShortName}
        </>
    )
});

export default PokemonImage;
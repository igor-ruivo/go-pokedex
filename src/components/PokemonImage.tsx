import { ReactNode, forwardRef } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonImage.css";
import { useLanguage } from "../contexts/language-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import { ImageSource, useImageSource } from "../contexts/language-context copy";

interface IPokemonImage {
    pokemon: IGamemasterPokemon;
    withName: boolean;
    lazy?: boolean;
    descriptionComponent?: ReactNode;
    xl?: boolean;
    buddy?: boolean;
    specificWidth?: number;
    specificHeight?: number;
}

const PokemonImage = forwardRef<HTMLImageElement, IPokemonImage>(({pokemon, withName, lazy, descriptionComponent, xl, buddy, specificWidth, specificHeight}: IPokemonImage, ref) => {
    const {currentLanguage} = useLanguage();
    const {imageSource} = useImageSource();

    const fetchSrc = (urlKind: ImageSource) => {
        switch (urlKind) {
            case ImageSource.Official:
                return pokemon.imageUrl;
            case ImageSource.GO:
                return pokemon.goImageUrl;
            case ImageSource.Shiny:
                return pokemon.shinyGoImageUrl;
        }
    }

    const onError = (e: any, urlKind: ImageSource) => {
        const target = e.target as HTMLImageElement;
        switch (urlKind) {
            case ImageSource.Official:
                return;
            case ImageSource.GO:
                target.onerror = () => onError(e, ImageSource.Official);
                target.src = fetchSrc(ImageSource.Official);
                return;
            case ImageSource.Shiny:
                target.onerror = () => onError(e, ImageSource.GO);
                target.src = fetchSrc(ImageSource.GO);
                return;
        }
    }

    return (
        <>
            <span className="images-container">
                <span className="main-image-container">
                    <img ref={ref} loading={lazy ? "lazy" : undefined} alt={pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} height={specificHeight ?? "100%"} width={specificWidth ?? "100%"} src={fetchSrc(imageSource)} onError={e => onError(e, imageSource)}/>
                    {pokemon.isMega && <span className="mega-container"><img alt="mega" loading={lazy ? "lazy" : undefined} height="100%" width="100%" src="https://i.imgur.com/sayBxjT.png"/></span>}
                    {pokemon.isShadow && <img className='image shadow-overlay' width="100%" loading={lazy ? "lazy" : undefined} height="100%" src="https://i.imgur.com/OS1Whqr.png" alt={pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} />}
                    {xl && <img alt="xl" className='image xl-overlay' loading={lazy ? "lazy" : undefined} src='https://i.imgur.com/NTtZq10.png' width="100%" height="100%"/>}
                    {buddy && <img alt="buddy" className='image buddy-overlay' loading={lazy ? "lazy" : undefined} src='https://i.imgur.com/MGCXGl0.png' width="100%" height="100%"/>}
                </span>
                {descriptionComponent && descriptionComponent}
            </span>
            {withName && pokemon.speciesShortName}
        </>
    )
});

export default PokemonImage;
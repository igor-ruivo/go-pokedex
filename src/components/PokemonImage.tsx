import { ReactNode, forwardRef, useEffect, useState } from "react";
import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import "./PokemonImage.css";
import { useLanguage } from "../contexts/language-context";
import { ImageSource, useImageSource } from "../contexts/imageSource-context";
import { goBaseUrl } from "../utils/Configs";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";

interface IPokemonImage {
    pokemon: IGamemasterPokemon;
    withName: boolean;
    lazy?: boolean;
    descriptionComponent?: ReactNode;
    xl?: boolean;
    buddy?: boolean;
    specificWidth?: number;
    specificHeight?: number;
    galleryToggle?: boolean;
    lowRes?: boolean;
}

const PokemonImage = forwardRef<HTMLImageElement, IPokemonImage>(({pokemon, withName, lazy, descriptionComponent, xl, buddy, specificWidth, specificHeight, galleryToggle, lowRes}: IPokemonImage, ref) => {
    const {currentGameLanguage} = useLanguage();
    const {imageSource} = useImageSource();

    const fetchSrc: (urlKind: ImageSource) => string = (urlKind: ImageSource) => {
        switch (urlKind) {
            case ImageSource.Official:
                return lowRes ? pokemon.imageUrl.replace("full", "detail") : pokemon.imageUrl;
            case ImageSource.GO:
                return goBaseUrl + pokemon.goImageUrl;
            case ImageSource.Shiny:
                return goBaseUrl + pokemon.shinyGoImageUrl;
        }
    }

    const [currentImageSource, setCurrentImageSource] = useState(imageSource);

    useEffect(() => {
        setCurrentImageSource(imageSource);
      }, [imageSource]);

    const handleImageClick = () => {
        setCurrentImageSource(p => {
            const enumValues = Object.values(ImageSource).filter((v: any) => !isNaN(v)) as ImageSource[];
            const currentIndex = enumValues.indexOf(p);
            const nextIndex = (currentIndex + 1) % enumValues.length;
            const nextImageSource = enumValues[nextIndex];
            return nextImageSource;
        });
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
                    <img ref={ref} className={`${galleryToggle ? "img-clickable" : ""} ${currentImageSource !== ImageSource.Official ? "with-img-dropShadow" : ""}`} onClick={galleryToggle ? handleImageClick : undefined} loading={lazy ? "lazy" : undefined} alt={pokemon.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))} height={specificHeight ?? "100%"} width={specificWidth ?? "100%"} src={fetchSrc(currentImageSource)} onError={e => onError(e, currentImageSource)}/>
                    {pokemon.isMega && <span className="mega-container"><img alt="mega" loading={lazy ? "lazy" : undefined} height="100%" width="100%" src="https://i.imgur.com/sayBxjT.png"/></span>}
                    {pokemon.isShadow && <img className='image shadow-overlay' width="100%" loading={lazy ? "lazy" : undefined} height="100%" src="https://i.imgur.com/OS1Whqr.png" alt={pokemon.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))} />}
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
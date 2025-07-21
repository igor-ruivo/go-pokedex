import './PokemonImage.css';
import './Misc.scss';

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { forwardRef, useCallback, useEffect, useState } from 'react';

import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { useLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { goBaseUrl } from '../utils/Configs';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { shortName } from '../utils/pokemon-helper';

interface IPokemonImage {
	pokemon: IGamemasterPokemon;
	withName: boolean;
	lazy?: boolean;
	descriptionComponent?: ReactNode;
	xl?: boolean;
	buddy?: boolean;
	shiny?: boolean | undefined;
	specificWidth?: number;
	specificHeight?: number;
	galleryToggle?: boolean;
	lowRes?: boolean;
	specificNameContainerWidth?: number | undefined;
	forceShadowAdorner?: boolean | undefined;
	withClassname?: string;
	imgOnly?: boolean;
	megaBall?: boolean;
}

const PokemonImage = forwardRef<HTMLImageElement, IPokemonImage>(
	(
		{
			pokemon,
			imgOnly,
			forceShadowAdorner,
			withClassname,
			specificNameContainerWidth,
			withName,
			lazy,
			descriptionComponent,
			xl,
			buddy,
			shiny,
			specificWidth,
			specificHeight,
			galleryToggle,
			lowRes = true,
			megaBall = true,
		}: IPokemonImage,
		ref
	) => {
		const { currentGameLanguage } = useLanguage();
		const { imageSource } = useImageSource();

		const fetchSrc = useCallback(
			(urlKind: ImageSource): string => {
				switch (urlKind) {
					case ImageSource.Official:
						if (lowRes) {
							if (pokemon.speciesId === 'aegislash_blade') {
								return pokemon.imageUrl.replace('full/681_f2', 'detail/681');
							}
							if (pokemon.speciesId === 'aegislash_shield') {
								return pokemon.imageUrl.replace('full/681', 'detail/681_f2');
							}
							return pokemon.imageUrl.replace('full', 'detail');
						}
						return pokemon.imageUrl;
					case ImageSource.GO:
						return goBaseUrl + pokemon.goImageUrl;
					case ImageSource.Shiny:
						return goBaseUrl + pokemon.shinyGoImageUrl;
					default:
						return pokemon.imageUrl;
				}
			},
			[lowRes, pokemon]
		);

		const [currentImageSource, setCurrentImageSource] = useState<ImageSource>(imageSource);

		useEffect(() => {
			setCurrentImageSource(imageSource);
		}, [imageSource]);

		const handleImageClick = useCallback(() => {
			setCurrentImageSource((p: ImageSource) => {
				const enumValues = Object.values(ImageSource).filter((v): v is ImageSource => typeof v === 'number');
				const currentIndex = enumValues.indexOf(p);
				const nextIndex = (currentIndex + 1) % enumValues.length;
				const nextImageSource = enumValues[nextIndex];
				return nextImageSource;
			});
		}, []);

		const handleImageKeyDown = useCallback(
			(e: KeyboardEvent<HTMLImageElement>) => {
				if (!galleryToggle) return;
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleImageClick();
				}
			},
			[handleImageClick, galleryToggle]
		);

		const onError = useCallback(
			(e: React.SyntheticEvent<HTMLImageElement, Event>, urlKind: ImageSource) => {
				const target = e.target as HTMLImageElement;
				switch (urlKind) {
					case ImageSource.Official:
						return;
					case ImageSource.GO:
						target.onerror = (event) =>
							onError(event as unknown as React.SyntheticEvent<HTMLImageElement, Event>, ImageSource.Official);
						target.src = fetchSrc(ImageSource.Official);
						return;
					case ImageSource.Shiny:
						target.onerror = (event) =>
							onError(event as unknown as React.SyntheticEvent<HTMLImageElement, Event>, ImageSource.GO);
						target.src = fetchSrc(ImageSource.GO);
						return;
				}
			},
			[fetchSrc]
		);

		const imgClassName = `${withClassname ?? 'with-img-dropShadow'}${currentImageSource !== ImageSource.Official ? ' with-img-dropShadow' : ''}`;

		// Only add event handlers and interactive props if galleryToggle is true
		const interactiveImgProps = galleryToggle
			? {
					onClick: handleImageClick as (e: MouseEvent<HTMLImageElement>) => void,
					onKeyDown: handleImageKeyDown,
					tabIndex: 0,
					role: 'button',
				}
			: {};

		const mainImgProps = {
			ref,
			className: `${withClassname ?? 'with-img-dropShadow'}${galleryToggle ? ' img-clickable selectable' : ''}${currentImageSource !== ImageSource.Official ? ' with-img-dropShadow' : ''}`,
			loading: lazy ? 'lazy' : undefined,
			alt: pokemon.speciesName.replace('Shadow', gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)),
			height: specificHeight ?? '100%',
			width: specificWidth ?? '100%',
			src: fetchSrc(currentImageSource),
			onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => onError(e, currentImageSource),
			...interactiveImgProps,
		};

		if (imgOnly) {
			return (
				<img
					{...mainImgProps}
					className={imgClassName}
					loading={lazy ? 'lazy' : 'eager'}
					alt={pokemon.speciesName.replace('Shadow', gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))}
				/>
			);
		}

		return (
			<>
				<span className='images-container'>
					<span className='main-image-container'>
						<img
							{...mainImgProps}
							loading={lazy ? 'lazy' : 'eager'}
							alt={pokemon.speciesName.replace(
								'Shadow',
								gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)
							)}
						/>

						{forceShadowAdorner || pokemon.isShadow ? (
							<img
								className='image img-adorner shadow-overlay'
								width='100%'
								loading={lazy ? 'lazy' : undefined}
								height='100%'
								src='https://i.imgur.com/OS1Whqr.png'
								alt={pokemon.speciesName.replace(
									'Shadow',
									gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)
								)}
							/>
						) : null}
						{xl ? (
							<img
								alt='xl'
								className='img-adorner image xl-overlay'
								loading={lazy ? 'lazy' : undefined}
								src='https://i.imgur.com/NTtZq10.png'
								width='100%'
								height='100%'
							/>
						) : null}
						{shiny ? (
							<img
								alt='shiny'
								className='img-adorner image shiny-overlay invert-dark-mode'
								loading={lazy ? 'lazy' : undefined}
								src={`/vectors/shiny.svg`}
								width='100%'
								height='100%'
							/>
						) : null}
						{buddy ? (
							<img
								alt='buddy'
								className='img-adorner image buddy-overlay'
								loading={lazy ? 'lazy' : undefined}
								src='https://i.imgur.com/MGCXGl0.png'
								width='100%'
								height='100%'
							/>
						) : null}
					</span>
					{descriptionComponent ?? null}
				</span>
				{withName && (
					<div style={{ lineHeight: 1.2 }}>
						<span
							className='pkm-img-name ellipsed block-column minimal-padding-bottom'
							style={specificNameContainerWidth ? { width: specificNameContainerWidth } : {}}
						>
							{shortName(pokemon.speciesName) + (forceShadowAdorner ? ' (S)' : '')}
						</span>
					</div>
				)}
			</>
		);
	}
);

PokemonImage.displayName = 'PokemonImage';

export default PokemonImage;

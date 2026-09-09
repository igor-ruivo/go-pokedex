import './PokemonHeader.scss';

import type { KeyboardEvent } from 'react';
import { useMemo } from 'react';

import type { PokemonTypes } from '../DTOs/PokemonTypes';

interface IPokemonHeader {
	pokemonName: string;
	type1: PokemonTypes | undefined;
	type2?: PokemonTypes | undefined;
	defaultTextColor?: boolean;
	defaultBannerColor?: boolean;
	whiteTextColor?: boolean;
	darker?: boolean | undefined;
	special?: boolean | undefined;
	constrained?: boolean;
	withChevron?: boolean | undefined;
	chevronCollapsed?: boolean | undefined;
	onClickHandler?: (() => void) | undefined;
	additionalClasses?: string | undefined;
}

const PokemonHeader = ({
	pokemonName,
	type1,
	defaultTextColor,
	defaultBannerColor,
	whiteTextColor,
	darker,
	special,
	constrained,
	withChevron,
	chevronCollapsed,
	onClickHandler,
	additionalClasses,
}: IPokemonHeader) => {
	const type1Color = useMemo(() => (type1 ? `var(--type-${type1})` : 'var(--popup-background-color)'), [type1]);

	const isInteractive = typeof onClickHandler === 'function';

	const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
		if (!isInteractive) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClickHandler?.();
		}
	};

	return (
		<header
			className={`pokemonheader-header ${constrained ? 'constrained' : ''} ${defaultBannerColor ? (darker ? 'darker-banner-color' : special ? 'special-banner-color' : 'banner-color') : ''} ${additionalClasses}`}
			{...(isInteractive
				? {
						onClick: onClickHandler,
						onKeyDown: handleKeyDown,
						role: 'button',
						tabIndex: 0,
					}
				: {})}
			style={
				!defaultBannerColor
					? {
							background: `linear-gradient(45deg, ${type1Color} 100%)`,
						}
					: {}
			}
		>
			<h1
				className={`pokemonheader-name ellipsed ${defaultTextColor ? 'text-color no-shadow' : ''} ${whiteTextColor ? 'white-text-color no-shadow' : ''}`}
			>
				<strong className='move-detail with-title-shadow compensate-padding slim-padding'>{pokemonName}</strong>
			</h1>
			{withChevron && (
				<figure className='chevron move-card hidden-in-big-screens'>
					<img
						className='invert-dark-mode'
						alt='All available Charged Moves'
						loading='lazy'
						width='18'
						height='18'
						decoding='async'
						src={`/vectors/chevron-${chevronCollapsed ? 'down' : 'up'}.svg`}
					/>
				</figure>
			)}
		</header>
	);
};

export default PokemonHeader;

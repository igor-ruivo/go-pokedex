import './Section.scss';

import PokemonHeader from '../PokemonHeader';
import React from 'react';

interface ISection {
	title: string;
	darker?: boolean;
	special?: boolean;
	fullMargins?: boolean;
	withChevron?: boolean;
	chevronCollapsed?: boolean;
	onClickHandler?: () => void;
	additionalClasses?: string;
	noPadding?: boolean;
}

const Section = React.forwardRef<HTMLDivElement, React.PropsWithChildren<ISection>>((props, ref) => {
	return (
		<div
			ref={ref}
			className={`content popup-color sub-title without-shadow ${!props.fullMargins ? 'with-dynamic-max-width auto-margin-sides' : ''} ${props.noPadding ? 'no-padding' : ''} ${props.chevronCollapsed ? 'collapsed-chevron' : ''}`}
		>
			<PokemonHeader
				pokemonName={props.title}
				type1={undefined}
				type2={undefined}
				defaultTextColor
				defaultBannerColor
				darker={props.darker}
				special={props.special}
				withChevron={props.withChevron}
				chevronCollapsed={props.chevronCollapsed}
				onClickHandler={props.onClickHandler}
				additionalClasses={props.additionalClasses}
			/>
			<div className='pokemon'>{props.children}</div>
		</div>
	);
});

export default Section;

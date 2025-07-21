import './Section.scss';

import { forwardRef } from 'react';

import PokemonHeader from '../PokemonHeader';

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

const Section = forwardRef<HTMLDivElement, React.PropsWithChildren<ISection>>((props, ref) => {
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

Section.displayName = 'Section';

export default Section;

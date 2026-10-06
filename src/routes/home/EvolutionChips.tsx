import { Fragment } from 'react';
import { Link } from 'react-router-dom';

import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { R } from '../../lib/nav';
import { PokeAvatar } from './PokeAvatar';

/**
 * A line of Pokémon as linked chips: an arrow where one evolves from the one before it, and the Megas: a single one after a
 * divider (on a row of its own on a narrow screen), several together on a row of their own, centered, with no divider. The first three-stage chain of a card is `data-linear`, which lets the narrowest
 * screens float its arrows on the seams between the chips.
 */
export const EvolutionChips = ({
	members,
	current,
	shiny,
	label,
	onPreview,
}: {
	members: ReadonlyArray<IGamemasterPokemon>;
	/** The member to mark (the one the card is about). */
	current?: IGamemasterPokemon | undefined;
	/** The species that can be shiny. */
	shiny?: ReadonlySet<string> | undefined;
	label: string;
	/** Told which member the pointer (or the keyboard focus) is on, and `undefined` when it leaves: the card can show it big meanwhile. */
	onPreview?: ((member: IGamemasterPokemon | undefined) => void) | undefined;
}) => {
	const plain = members.filter((m) => !m.isMega);
	const megas = members.filter((m) => m.isMega);
	const arrowBefore = (i: number) => i > 0 && plain[i].family?.parent === plain[i - 1].speciesId;
	const linear = plain.length === 3 && arrowBefore(1) && arrowBefore(2);
	const chip = (p: IGamemasterPokemon) => (
		<Link
			key={p.speciesId}
			to={R.pokemon(p.speciesId)}
			role='listitem'
			className='h-spot-stage'
			data-current={p === current ? '' : undefined}
			onMouseEnter={onPreview && (() => window.matchMedia('(hover: hover)').matches && onPreview(p))}
			onMouseLeave={onPreview && (() => onPreview(undefined))}
			onFocus={onPreview && (() => onPreview(p))}
			onBlur={onPreview && (() => onPreview(undefined))}
		>
			<PokeAvatar pokemon={p} shiny={shiny?.has(p.speciesId)} />
			<span>{cleanName(p.speciesName)}</span>
		</Link>
	);
	return (
		<div className='h-spot-line' role='list' aria-label={label} data-linear={linear ? '' : undefined}>
			{plain.map((p, i) => (
				<Fragment key={p.speciesId}>
					{arrowBefore(i) && (
						<svg className='h-spot-arrow' viewBox='0 0 40 24' aria-hidden='true'>
							<path d='M4 12h26M23 5l8 7-8 7' />
						</svg>
					)}
					{chip(p)}
				</Fragment>
			))}
			{megas.length > 0 && (
				<div className='h-spot-megas' data-stacked={megas.length > 1 ? '' : undefined}>
					{plain.length > 0 && megas.length === 1 && <i className='h-spot-sep' aria-hidden='true' />}
					{megas.map(chip)}
				</div>
			)}
		</div>
	);
};

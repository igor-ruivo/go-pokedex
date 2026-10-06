import { Link } from 'react-router-dom';

import { SparkleIcon } from '../../components/SparkleIcon';
import { SpriteImg } from '../../components/Sprite';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { R } from '../../lib/nav';

/**
 * The featured Pokémon of a Community Day / Spotlight Hour row on a wide screen: the end of the row is cut on a diagonal, and the
 * Pokémon are drawn big on it, one slanted band each, in the order of their line (so the diagonals between the bands read as the
 * evolution steps, with a small arrow coin on each). The one the day is about — the only one that can be caught — is the widest,
 * with its picture zoomed in a pool of light and its name on a pill; what it can evolve into is smaller and quieter. A shiny
 * one keeps its sparkle.
 */
export const DayShowcase = ({
	members,
	current,
	shiny,
	label,
}: {
	members: ReadonlyArray<IGamemasterPokemon>;
	/** The member the day is about (a single featured Pokémon). */
	current?: IGamemasterPokemon | undefined;
	/** The species that can be shiny. */
	shiny?: ReadonlySet<string> | undefined;
	label: string;
}) => (
	<div className='h-day-mons h-day-show' role='list' aria-label={label} style={{ ['--n' as string]: members.length }}>
		{members.map((p, i) => (
			<Link
				key={p.speciesId}
				to={R.pokemon(p.speciesId)}
				role='listitem'
				className='h-day-slat'
				data-current={p === current ? '' : undefined}
			>
				{i > 0 && p.family?.parent === members[i - 1].speciesId && (
					<svg className='h-day-step' viewBox='0 0 40 24' aria-hidden='true'>
						<path d='M4 12h26M23 5l8 7-8 7' />
					</svg>
				)}
				<span className='h-day-art'>
					<SpriteImg pokemon={p} loading='lazy' />
					{shiny?.has(p.speciesId) && <SparkleIcon className='h-day-shiny' />}
				</span>
				<span className='h-day-slat-name'>{cleanName(p.speciesName)}</span>
			</Link>
		))}
	</div>
);

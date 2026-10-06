import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { ShadowMark } from '../../components/ShadowMark';
import { SparkleIcon } from '../../components/SparkleIcon';
import { SpriteImg, spriteUrl } from '../../components/Sprite';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { R } from '../../lib/nav';
import { preloadImages, useRotator } from './useRotator';

const Hero = ({
	pokemon,
	shiny,
	className,
}: {
	pokemon: IGamemasterPokemon;
	shiny: boolean;
	className?: string | undefined;
}) => (
	<Link
		to={R.pokemon(pokemon.speciesId)}
		role='listitem'
		aria-label={cleanName(pokemon.speciesName)}
		title={cleanName(pokemon.speciesName)}
		className={className ? `h-day-hero ${className}` : 'h-day-hero'}
	>
		<SpriteImg pokemon={pokemon} loading='lazy' />
		{pokemon.isShadow && <ShadowMark />}
		{shiny && <SparkleIcon className='h-day-shiny' />}
	</Link>
);

/**
 * The Pokémon a Community Day / Spotlight Hour row is about, big at the end of the row on a smooth tinted background (the same
 * piece as the header of the "in the game right now" cards): just the ones that can be caught, never the line they evolve along.
 * With several and the room for them (`rotate` off), they all take the same room, as many as `max` and a "+N" for the rest. Without
 * the room (`rotate` on, a phone) they take turns in the same place: each swipes in on the page's shared clock — in step with the
 * other rotating cards — once its pictures are loaded, with no countdown bar. A shiny-able one keeps its sparkle.
 */
export const DayHeroes = ({
	pokemon,
	shiny,
	max,
	rotate,
	label,
}: {
	pokemon: ReadonlyArray<IGamemasterPokemon>;
	/** The species that can be shiny. */
	shiny?: ReadonlySet<string> | undefined;
	/** The most Pokémon the row has room for side by side. */
	max: number;
	/** Whether the row has room for only one at a time: the Pokémon then take turns. */
	rotate: boolean;
	label: string;
}) => {
	const rotating = rotate && pokemon.length > 1;
	const { current, leaving, rotated, holdProps } = useRotator<IGamemasterPokemon>({
		ready: rotating,
		// the next one in the order given, round and round
		pick: useCallback(
			(not?: IGamemasterPokemon) => {
				const at = not ? pokemon.findIndex((p) => p.speciesId === not.speciesId) : -1;
				return pokemon[(at + 1) % pokemon.length];
			},
			[pokemon]
		),
		preload: useCallback(
			(p: IGamemasterPokemon) => preloadImages([{ url: spriteUrl(p), fallback: p.imageUrl }]),
			[]
		),
	});

	if (rotating) {
		// the first one is there from the start, before the rotation has picked it
		const onShow = current ?? pokemon[0];
		return (
			<div
				className='h-day-heroes'
				data-rotating=''
				role='list'
				aria-label={label}
				style={{ ['--n' as string]: 1 }}
				{...holdProps}
			>
				{leaving && (
					<Hero
						key={`out-${leaving.speciesId}`}
						pokemon={leaving}
						shiny={!!shiny?.has(leaving.speciesId)}
						className='h-day-hero--out'
					/>
				)}
				<Hero
					key={`in-${onShow.speciesId}`}
					pokemon={onShow}
					shiny={!!shiny?.has(onShow.speciesId)}
					className={rotated ? 'h-day-hero--in' : undefined}
				/>
			</div>
		);
	}

	const shown = pokemon.slice(0, max);
	const more = pokemon.length - shown.length;
	return (
		<div className='h-day-heroes' role='list' aria-label={label} style={{ ['--n' as string]: shown.length }}>
			{shown.map((p) => (
				<Hero key={p.speciesId} pokemon={p} shiny={!!shiny?.has(p.speciesId)} />
			))}
			{more > 0 && <i className='h-day-more'>+{more}</i>}
		</div>
	);
};

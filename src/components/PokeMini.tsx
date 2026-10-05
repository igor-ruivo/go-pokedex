import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useLanguage } from '../contexts/language-context';
import { cleanName } from '../lib/format';
import { gigantamaxOf } from '../lib/max-forms';
import { R } from '../lib/nav';
import { LEAGUE_KEYS, useLeagueBadges } from '../lib/relevance';
import { typeVar } from '../lib/types';
import { usePokemon } from '../queries/pokemon';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { ShadowMark } from './ShadowMark';
import { SparkleIcon } from './SparkleIcon';
import { SpriteImg } from './Sprite';

/** Small sprite tile used across the calendar (spawns, raids, eggs, rockets…). */
export const PokeMini = ({
	speciesId,
	shiny,
	note,
	catchable,
	forceShadow,
	maxForm,
}: {
	speciesId: string;
	shiny?: boolean | undefined;
	note?: string | undefined;
	/** Rocket line-ups: the shadow reward is catchable after the battle. */
	catchable?: boolean | undefined;
	/** Rocket line-ups list base ids, but every mon fought is a Shadow. */
	forceShadow?: boolean | undefined;
	/** A Max Battle Pokémon: a Dynamax one wears the Dynamax cloud over its picture, a Gigantamax one is drawn with its own artwork. */
	maxForm?: string | undefined;
}) => {
	const { gamemasterPokemon } = usePokemon();
	const { currentGameLanguage: gl } = useLanguage();
	const base = gamemasterPokemon[speciesId];
	const p = useMemo(
		() =>
			base && maxForm === 'gigantamax'
				? gigantamaxOf(base, gamemasterPokemon, gameTranslator(GameTranslatorKeys.GigantamaxDisplay, gl))
				: base,
		[base, maxForm, gl, gamemasterPokemon]
	);
	const badges = useLeagueBadges(p, gamemasterPokemon);
	if (!p) return null;
	const shadowTarget = catchable && gamemasterPokemon[`${p.speciesId}_shadow`] ? `${p.speciesId}_shadow` : p.speciesId;
	const isShadow = p.isShadow || !!forceShadow;
	return (
		<Link
			to={R.pokemon(shadowTarget)}
			className='r-mini'
			data-shadow={isShadow ? '' : undefined}
			data-catchable={catchable ? '' : undefined}
			style={{ ['--tc' as string]: typeVar(p.types[0]) }}
		>
			{shiny && <SparkleIcon className='r-mini-shiny' />}
			{isShadow && <ShadowMark />}
			{badges.length > 0 && (
				<span className='r-lg-dots' aria-hidden='true'>
					{LEAGUE_KEYS.filter((k) => badges.includes(k)).map((k) => (
						<i key={k} data-lg={k} />
					))}
				</span>
			)}
			<SpriteImg pokemon={p} loading='lazy' />
			{maxForm === 'dynamax' && <img className='r-mini-max' src='/images/max/dynamax.png' alt='' loading='lazy' />}
			<span>{cleanName(p.speciesName)}</span>
			{note && <em>{note}</em>}
		</Link>
	);
};

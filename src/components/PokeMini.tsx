import { Link } from 'react-router-dom';

import { useImageSource } from '../contexts/imageSource-context';
import { cleanName } from '../lib/format';
import { R } from '../lib/nav';
import { LEAGUE_KEYS, useLeagueBadges } from '../lib/relevance';
import { typeVar } from '../lib/types';
import { usePokemon } from '../queries/pokemon';
import { ShadowMark } from './ShadowMark';
import { spriteUrl } from './Sprite';

/** Small sprite tile used across the calendar (spawns, raids, eggs, rockets…). */
export const PokeMini = ({
	speciesId,
	shiny,
	note,
	catchable,
	forceShadow,
}: {
	speciesId: string;
	shiny?: boolean | undefined;
	note?: string | undefined;
	/** Rocket line-ups: the shadow reward is catchable after the battle. */
	catchable?: boolean | undefined;
	/** Rocket line-ups list base ids, but every mon fought is a Shadow. */
	forceShadow?: boolean | undefined;
}) => {
	const { imageSource } = useImageSource();
	const { gamemasterPokemon } = usePokemon();
	const p = gamemasterPokemon[speciesId];
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
			{shiny && <span className='r-mini-shiny'>✦</span>}
			{isShadow && <ShadowMark />}
			{badges.length > 0 && (
				<span className='r-lg-dots' aria-hidden='true'>
					{LEAGUE_KEYS.filter((k) => badges.includes(k)).map((k) => (
						<i key={k} data-lg={k} />
					))}
				</span>
			)}
			<img src={spriteUrl(p, imageSource)} alt='' loading='lazy' decoding='async' />
			<span>{cleanName(p.speciesName)}</span>
			{note && <em>{note}</em>}
		</Link>
	);
};

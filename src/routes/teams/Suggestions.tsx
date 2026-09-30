import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import type { AlternativePick } from '../../lib/pvp-sim/team-eval';
import { typeVar } from '../../lib/types';
import type { AnalyzedMember } from './useTeamAnalysis';

/**
 * Single-swap upgrades: for each of the league's top-ranked Pokémon that isn't
 * on the team, what would the threat score become if it took over one slot.
 * Heavier than a rating (every candidate is simulated against every threat),
 * so it runs in the background after the rating, with a spinner until it lands.
 */
export const Suggestions = ({
	members,
	gamemaster,
	loading,
	failed,
	picks,
	onApply,
}: {
	members: ReadonlyArray<AnalyzedMember>;
	gamemaster: Record<string, IGamemasterPokemon>;
	loading: boolean;
	failed: boolean;
	picks: ReadonlyArray<AlternativePick> | undefined;
	onApply: (pick: AlternativePick) => void;
}) => {
	const { t } = useTranslation(['teams']);

	return (
		<section className='r-tm-panel r-tm-suggest'>
			{loading && (
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:suggest.searching')}</p>
				</div>
			)}

			{failed && <p className='r-muted'>{t('teams:suggest.failed')}</p>}

			{picks && picks.length === 0 && <p className='r-tm-good'>{t('teams:suggest.none')}</p>}

			{picks && picks.length > 0 && <p className='r-tm-hint r-tm-suggest-hint'>{t('teams:threat.lowerBetter')}</p>}

			{picks && picks.length > 0 && (
				<ul className='r-tm-picks'>
					{picks.map((pick) => {
						const next = gamemaster[pick.speciesId];
						const current = members[pick.slot];
						if (!next || !current) return null;
						return (
							<li key={pick.speciesId}>
								<button
									type='button'
									className='r-tm-pick'
									style={{ ['--tc' as string]: typeVar(next.types[0]) }}
									onClick={() => onApply(pick)}
								>
									<span className='r-tm-swap'>
										<span className='r-tm-swap-ico' style={{ ['--tc' as string]: typeVar(current.pokemon.types[0]) }}>
											{current.pokemon.isShadow && <ShadowMark />}
											<SpriteImg pokemon={current.pokemon} loading='lazy' />
										</span>
										<svg viewBox='0 0 24 24' aria-hidden='true'>
											<path d='M4 12h14M13 6l6 6-6 6' />
										</svg>
										<span className='r-tm-swap-ico' style={{ ['--tc' as string]: typeVar(next.types[0]) }}>
											{next.isShadow && <ShadowMark />}
											<SpriteImg pokemon={next} loading='lazy' />
										</span>
									</span>
									<span className='r-tm-pick-text'>
										<b>
											{t('teams:suggest.swap', {
												out: cleanName(current.pokemon.speciesName),
												in: cleanName(next.speciesName),
											})}
										</b>
										<span>{t('teams:suggest.result', { score: pick.threatScore, delta: pick.delta })}</span>
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
};

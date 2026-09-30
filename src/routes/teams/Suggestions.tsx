import { useTranslation } from 'react-i18next';

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
 * so it only runs when asked.
 */
export const Suggestions = ({
	members,
	gamemaster,
	requested,
	loading,
	failed,
	picks,
	onRequest,
	onApply,
}: {
	members: ReadonlyArray<AnalyzedMember>;
	gamemaster: Record<string, IGamemasterPokemon>;
	requested: boolean;
	loading: boolean;
	failed: boolean;
	picks: ReadonlyArray<AlternativePick> | undefined;
	onRequest: () => void;
	onApply: (pick: AlternativePick) => void;
}) => {
	const { t } = useTranslation(['teams']);

	return (
		<section className='r-tm-panel r-tm-suggest'>
			{!requested && (
				<div className='r-tm-suggest-cta'>
					<p>{t('teams:suggest.intro')}</p>
					<button type='button' className='r-tm-btn' onClick={onRequest}>
						{t('teams:suggest.button')}
					</button>
				</div>
			)}

			{requested && loading && (
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:suggest.searching')}</p>
				</div>
			)}

			{requested && failed && <p className='r-muted'>{t('teams:suggest.failed')}</p>}

			{picks && picks.length === 0 && <p className='r-tm-good'>{t('teams:suggest.none')}</p>}

			{picks && picks.length > 0 && (
				<ul className='r-tm-picks'>
					{picks.map((pick) => {
						const next = gamemaster[pick.speciesId];
						const current = members[pick.slot];
						if (!next || !current) return null;
						const better = pick.delta < 0;
						return (
							<li key={pick.speciesId} data-better={better ? '' : undefined}>
								<span className='r-tm-swap'>
									<span className='r-tm-swap-ico' style={{ ['--tc' as string]: typeVar(current.pokemon.types[0]) }}>
										<SpriteImg pokemon={current.pokemon} loading='lazy' />
									</span>
									<svg viewBox='0 0 24 24' aria-hidden='true'>
										<path d='M4 12h14M13 6l6 6-6 6' />
									</svg>
									<span className='r-tm-swap-ico' style={{ ['--tc' as string]: typeVar(next.types[0]) }}>
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
								<button type='button' className='r-tm-btn r-tm-btn--ghost' onClick={() => onApply(pick)}>
									{t('teams:suggest.apply')}
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
};

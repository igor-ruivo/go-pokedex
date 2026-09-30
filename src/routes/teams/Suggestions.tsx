import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import type { AlternativePick } from '../../lib/pvp-sim/team-eval';
import { typeVar } from '../../lib/types';
import type { AnalyzedMember } from './useTeamAnalysis';
import type { TeamUpgrades } from './useTeamUpgrades';

const signed = (value: number, digits = 0) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;

/**
 * Single-swap upgrades: for each of the league's top-ranked Pokémon that isn't on the team, what would one slot
 * become if it took over. Two readings of the same swaps, one under the other: the ones that lower the threat
 * score, and the ones that raise the Team Score (the radar's). Heavier than a rating (every candidate is simulated
 * against every threat), so it runs in the background after the rating, with a spinner until it lands.
 */
export const Suggestions = ({
	members,
	gamemaster,
	loading,
	failed,
	upgrades,
	onApply,
}: {
	members: ReadonlyArray<AnalyzedMember>;
	gamemaster: Record<string, IGamemasterPokemon>;
	loading: boolean;
	failed: boolean;
	upgrades: TeamUpgrades | undefined;
	onApply: (pick: AlternativePick) => void;
}) => {
	const { t } = useTranslation(['teams']);

	/** One cell per upgrade: who goes out, who comes in, and what it does to the number this list is about. */
	const cells = (picks: ReadonlyArray<AlternativePick & { result: string }>) => (
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
								<span>{pick.result}</span>
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);

	return (
		<section className='r-tm-panel r-tm-suggest'>
			{loading && (
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:suggest.searching')}</p>
				</div>
			)}

			{failed && <p className='r-muted'>{t('teams:suggest.failed')}</p>}

			{upgrades && (
				<>
					<div className='r-tm-suggest-group'>
						<h3 className='r-tm-sub'>{t('teams:suggest.byThreat')}</h3>
						<p className='r-tm-hint r-tm-suggest-hint'>{t('teams:threat.lowerBetter')}</p>
						{upgrades.byThreat.length === 0 ? (
							<p className='r-tm-good'>{t('teams:suggest.none')}</p>
						) : (
							cells(
								upgrades.byThreat.map((pick) => ({
									...pick,
									result: t('teams:suggest.result', { score: pick.threatScore, delta: signed(pick.delta) }),
								}))
							)
						)}
					</div>

					<hr className='r-tm-suggest-divider' />

					<div className='r-tm-suggest-group'>
						<h3 className='r-tm-sub'>{t('teams:suggest.byScore')}</h3>
						<p className='r-tm-hint r-tm-suggest-hint'>{t('teams:suggest.higherBetter')}</p>
						{upgrades.byScore.length === 0 ? (
							<p className='r-tm-good'>{t('teams:suggest.none')}</p>
						) : (
							cells(
								upgrades.byScore.map((pick) => ({
									...pick,
									result: t('teams:suggest.resultScore', {
										score: pick.score.toFixed(1),
										delta: signed(pick.scoreDelta, 1),
									}),
								}))
							)
						)}
					</div>
				</>
			)}
		</section>
	);
};

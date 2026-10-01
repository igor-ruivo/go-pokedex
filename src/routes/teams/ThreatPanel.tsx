import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { R } from '../../lib/nav';
import type { TeamEvaluation } from '../../lib/pvp-sim/team-eval';
import { letterGrade } from '../../lib/team-analysis';
import { typeVar } from '../../lib/types';
import { ScoreInfo } from './ScoreInfo';
import { threatGradeNotes } from './teams-text';
import type { AnalyzedMember } from './useTeamAnalysis';

/** The threat-score axis: 500 is a flawless team, 850 hopeless. Grade bands follow PvPoke's `(1200 − score) / 680` scale. */
const AXIS_MIN = 500;
const AXIS_MAX = 850;
const position = (score: number) => Math.min(1, Math.max(0, (score - AXIS_MIN) / (AXIS_MAX - AXIS_MIN))) * 100;
/** Score at which each grade begins: A up to 588, B to 656, C to 724, D to 792, then F. */
const BAND_EDGES = [588, 656, 724, 792];

const ratingTone = (rating: number): 'win' | 'edge' | 'even' | 'lose' | 'crush' =>
	rating >= 750 ? 'crush' : rating > 500 ? 'win' : rating === 500 ? 'even' : rating > 250 ? 'edge' : 'lose';

/**
 * PvPoke's threat score — how badly the six best distinct counters in the
 * league beat this team; lower is better — drawn on a graded scale, with the
 * counters themselves as a grid so it's clear *which* of your Pokémon each one
 * threatens. Rows read as "this threat's chance against that teammate", red
 * where the threat wins.
 */
export const ThreatPanel = ({
	evaluation,
	members,
	gamemaster,
	stale,
	loading,
	onChangePokemon,
}: {
	evaluation: TeamEvaluation | undefined;
	members: ReadonlyArray<AnalyzedMember>;
	gamemaster: Record<string, IGamemasterPokemon>;
	stale: boolean;
	loading: boolean;
	/** Opens the Pokémon picker for that team slot. */
	onChangePokemon: (slot: number) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const notes = threatGradeNotes(t);

	if (!evaluation) {
		return (
			<section className='r-tm-panel r-tm-threat'>
				{loading ? (
					<div className='r-tm-loading'>
						<span className='r-spinner' aria-hidden='true' />
						<p>{t('teams:threat.simulating')}</p>
					</div>
				) : (
					<p className='r-muted'>{t('teams:threat.needFull')}</p>
				)}
			</section>
		);
	}

	const score = evaluation.threatScore;
	const grade = letterGrade(1200 - score, 680);

	return (
		<section className='r-tm-panel r-tm-threat' data-stale={stale ? '' : undefined}>
			<div className='r-tm-threat-top'>
				<ScoreInfo kind='threat' className='r-tm-threat-score'>
					<span className='r-tm-eyebrow'>{t('teams:threat.scoreLabel')}</span>
					<b>{score}</b>
					<span className='r-tm-grade' data-grade={grade}>
						{grade}
					</span>
				</ScoreInfo>
				<p className='r-tm-threat-note'>
					{notes[grade]} <span className='r-tm-hint'>{t('teams:threat.lowerBetter')}</span>
				</p>
			</div>

			<div className='r-tm-gauge' role='img' aria-label={t('teams:threat.gaugeAria', { score, grade })}>
				<div className='r-tm-gauge-bands' aria-hidden='true'>
					{['A', 'B', 'C', 'D', 'F'].map((g, i) => {
						const from = i === 0 ? AXIS_MIN : BAND_EDGES[i - 1];
						const to = i === 4 ? AXIS_MAX : BAND_EDGES[i];
						return (
							<i key={g} data-grade={g} style={{ width: `${position(to) - position(from)}%` }}>
								{g}
							</i>
						);
					})}
				</div>
				<span className='r-tm-gauge-marker' style={{ left: `${position(score)}%` }} aria-hidden='true'>
					<b>{score}</b>
				</span>
				<div className='r-tm-gauge-ends' aria-hidden='true'>
					<span>{t('teams:threat.better')}</span>
					<span>{t('teams:threat.worse')}</span>
				</div>
			</div>

			<h3 className='r-tm-sub'>{t('teams:threat.gridHeading')}</h3>
			<div className='r-tm-grid' role='table' aria-label={t('teams:threat.gridAria')}>
				<div className='r-tm-grid-row r-tm-grid-head' role='row' style={{ ['--cols' as string]: members.length }}>
					<span role='columnheader' />
					{members.map((m, i) => (
						<span key={`${m.slot.speciesId}-${i}`} role='columnheader' className='r-tm-grid-member'>
							<button
								type='button'
								style={{ ['--tc' as string]: typeVar(m.pokemon.types[0]) }}
								aria-label={t('teams:builder.change', { name: cleanName(m.pokemon.speciesName) })}
								title={t('teams:builder.replace', { name: cleanName(m.pokemon.speciesName) })}
								onClick={() => onChangePokemon(i)}
							>
								<span className='r-tm-cell-art'>
									{m.pokemon.isShadow && <ShadowMark />}
									<SpriteImg pokemon={m.pokemon} loading='lazy' />
								</span>
							</button>
						</span>
					))}
				</div>
				{evaluation.threats.map((threat, row) => {
					const p = gamemaster[threat.speciesId];
					if (!p) return null;
					return (
						<div
							key={threat.speciesId}
							className='r-tm-grid-row'
							role='row'
							style={{ ['--cols' as string]: members.length, ['--i' as string]: row }}
						>
							<Link
								role='rowheader'
								to={R.pokemon(threat.speciesId)}
								className='r-tm-grid-threat'
								style={{ ['--tc' as string]: typeVar(p.types[0]) }}
							>
								<span className='r-tm-grid-ico'>
									<SpriteImg pokemon={p} loading='lazy' />
								</span>
								<span className='r-tm-grid-name'>
									{cleanName(p.speciesName)}
									{p.isShadow && <ShadowMark className='r-tm-shadow-mark' />}
								</span>
							</Link>
							{threat.ratings.map((rating, col) => (
								<span key={col} role='cell' className='r-tm-rating' data-tone={ratingTone(rating)}>
									{Math.round(rating)}
								</span>
							))}
						</div>
					);
				})}
			</div>
			<p className='r-tm-legend'>
				<span data-tone='lose' /> {t('teams:threat.legendSafe')}
				<span data-tone='even' /> {t('teams:threat.legendEven')}
				<span data-tone='crush' /> {t('teams:threat.legendThreat')}
			</p>

			<details className='r-ctr-help'>
				<summary>{t('teams:threat.helpSummary')}</summary>
				<p>{t('teams:threat.help')}</p>
			</details>
		</section>
	);
};

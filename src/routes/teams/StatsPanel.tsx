import { useTranslation } from 'react-i18next';

import { useLanguage } from '../../contexts/language-context';
import type { TeamLeague } from '../../DTOs/ITeamBuilder';
import { combatMetricNames } from '../../lib/combat-text';
import { BULK_GOAL, CONSISTENCY_GOAL, letterGrade, SAFETY_GOAL } from '../../lib/team-analysis';
import { typeVar } from '../../lib/types';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';
import { gradeNotes } from './teams-text';
import type { AnalyzedMember, TeamAnalysis } from './useTeamAnalysis';

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

/** A total drawn as one bar split into each teammate's share, tinted by their type. */
const ShareBar = ({ values, members }: { values: ReadonlyArray<number>; members: ReadonlyArray<AnalyzedMember> }) => {
	const total = values.reduce((a, b) => a + b, 0) || 1;
	return (
		<span className='r-tm-share' aria-hidden='true'>
			{values.map((v, i) => (
				<i
					key={members[i].slot.speciesId}
					style={{ width: `${(v / total) * 100}%`, ['--tc' as string]: typeVar(members[i].pokemon.types[0]) }}
				/>
			))}
		</span>
	);
};

/**
 * The team's raw numbers — what it adds up to (CP, stat totals, stat product)
 * and PvPoke's three non-simulated grades. All stats are for PvPoke's default
 * IVs at the league's cap, since those are what the ratings were computed with.
 */
/**
 * @param threatScore the simulated threat score (lower is better), once computed. It becomes the Coverage
 *                    grade, which is how PvPoke grades a team's coverage.
 */
export const StatsPanel = ({
	league,
	analysis,
	threatScore,
}: {
	league: TeamLeague;
	analysis: TeamAnalysis;
	threatScore: number | undefined;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail', 'rankings']);
	const { currentGameLanguage: gl } = useLanguage();
	const { members, totals, grades } = analysis;
	const notes = gradeNotes(t);
	const coverageGrade = threatScore === undefined ? undefined : letterGrade(1200 - threatScore, 680);

	const totalsList: Array<{ key: string; label: string; total: string; values: Array<number> }> = [
		{
			key: 'cp',
			label: gameTranslator(GameTranslatorKeys.CPDisplay, gl) || t('teams:stats.cp'),
			total: nf.format(totals.cp),
			values: members.map((m) => m.stats.cp),
		},
		{
			key: 'atk',
			label: t('pokemonDetail:hero.stats.atk'),
			total: totals.atk.toFixed(1),
			values: members.map((m) => m.stats.atk),
		},
		{
			key: 'def',
			label: t('pokemonDetail:hero.stats.def'),
			total: totals.def.toFixed(1),
			values: members.map((m) => m.stats.def),
		},
		{
			key: 'hp',
			label: t('pokemonDetail:hero.stats.hp'),
			total: nf.format(totals.hp),
			values: members.map((m) => m.stats.hp),
		},
		{
			key: 'prod',
			label: t('rankings:sorts.statProduct'),
			total: nf.format(members.reduce((sum, m) => sum + m.stats.statProduct, 0)),
			values: members.map((m) => m.stats.statProduct),
		},
	];

	const gradeCards: Array<{
		key: 'bulk' | 'safety' | 'consistency';
		label: string;
		value: string;
		goal: string;
	}> = [
		{
			key: 'bulk',
			label: t('teams:score.parts.bulk.name'),
			value: nf.format(totals.averageBulk),
			goal: nf.format(BULK_GOAL[league]),
		},
		{
			key: 'safety',
			label: t('teams:score.parts.safety.name'),
			value: totals.averageSafety.toFixed(1),
			goal: String(SAFETY_GOAL),
		},
		{
			key: 'consistency',
			label: combatMetricNames(t).consistency,
			value: totals.averageConsistency.toFixed(1),
			goal: String(CONSISTENCY_GOAL),
		},
	];

	return (
		<div className='r-tm-statsgrid'>
			<section className='r-tm-panel'>
				<h3 className='r-tm-sub'>{t('teams:stats.totalsHeading')}</h3>
				<ul className='r-tm-totals'>
					{totalsList.map((row) => (
						<li key={row.key}>
							<span className='r-tm-totals-label'>{row.label}</span>
							<b>{row.total}</b>
							<ShareBar values={row.values} members={members} />
						</li>
					))}
				</ul>
				<p className='r-muted r-tm-note'>{t('teams:stats.ivNote')}</p>
			</section>

			<section className='r-tm-panel'>
				<h3 className='r-tm-sub'>{t('teams:grades.heading')}</h3>
				<ul className='r-tm-grades'>
					<li>
						{threatScore === undefined || !coverageGrade ? (
							<>
								<span className='r-tm-grade'>
									<span className='r-spinner r-spinner--sm' aria-hidden='true' />
								</span>
								<div>
									<b>{t('teams:grades.coverage.name')}</b>
									<span className='r-tm-grade-val'>{t('teams:threat.simulating')}</span>
								</div>
							</>
						) : (
							<>
								<span className='r-tm-grade' data-grade={coverageGrade}>
									{coverageGrade}
								</span>
								<div>
									<b>{t('teams:grades.coverage.name')}</b>
									<span className='r-tm-grade-val'>{`${t('teams:threat.scoreLabel')} ${threatScore}`}</span>
									<p>{notes.coverage[coverageGrade]}</p>
								</div>
							</>
						)}
					</li>
					{gradeCards.map((card) => {
						const { grade } = grades[card.key];
						return (
							<li key={card.key}>
								<span className='r-tm-grade' data-grade={grade}>
									{grade}
								</span>
								<div>
									<b>{card.label}</b>
									<span className='r-tm-grade-val'>
										{t('teams:grades.valueOfGoal', { value: card.value, goal: card.goal })}
									</span>
									<p>{notes[card.key][grade]}</p>
								</div>
							</li>
						);
					})}
				</ul>
			</section>
		</div>
	);
};

import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { combatMetricNames } from '../../lib/combat-text';
import { cleanName } from '../../lib/format';
import type { LetterGrade, ScoreTier } from '../../lib/team-analysis';
import { typeVar } from '../../lib/types';
import { ScoreInfo } from './ScoreInfo';
import type { AnalyzedMember } from './useTeamAnalysis';

export interface MiniGrades {
	/** From the simulated threat score; undefined while it is being computed. */
	coverage: LetterGrade | undefined;
	bulk: LetterGrade;
	safety: LetterGrade;
	consistency: LetterGrade;
}

/** The team's compact summary bar, pinned under the app bar. */
export const TeamMini = ({
	members,
	score,
	tier,
	threatScore,
	grades,
	loading,
	onChangePokemon,
}: {
	members: ReadonlyArray<AnalyzedMember>;
	score: number | undefined;
	tier: ScoreTier | undefined;
	threatScore: number | undefined;
	grades: MiniGrades;
	/** The simulated part is being (re)computed. */
	loading: boolean;
	onChangePokemon: (slot: number) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const miniRef = useRef<HTMLDivElement>(null);
	const metrics = combatMetricNames(t);

	// Always shown, whatever the scroll position (it is a useful summary of the team). It sits right under the app bar, so
	// track the app bar's actual bottom: it can move during mobile rubber-band overscroll.
	useLayoutEffect(() => {
		const miniEl = miniRef.current;
		if (!miniEl) return;
		const gap = () => (window.innerWidth >= 900 ? 10 : 0);
		const update = () => {
			const appbar = document.querySelector('.r-appbar');
			const bottom = appbar ? appbar.getBoundingClientRect().bottom : 60;
			miniEl.style.top = `${bottom + gap()}px`;
			miniEl.dataset.visible = 'true';
		};
		let raf = 0;
		const schedule = () => {
			if (!raf) {
				raf = requestAnimationFrame(() => {
					raf = 0;
					update();
				});
			}
		};
		const show = requestAnimationFrame(() => {
			update();
			miniEl.dataset.anim = 'true';
		});
		const viewport = window.visualViewport;
		window.addEventListener('resize', schedule);
		window.addEventListener('scroll', schedule, { passive: true });
		viewport?.addEventListener('scroll', schedule);
		viewport?.addEventListener('resize', schedule);
		return () => {
			cancelAnimationFrame(show);
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener('resize', schedule);
			window.removeEventListener('scroll', schedule);
			viewport?.removeEventListener('scroll', schedule);
			viewport?.removeEventListener('resize', schedule);
		};
	}, []);

	const report: Array<{ key: string; label: string; grade: LetterGrade | undefined }> = [
		{ key: 'coverage', label: t('teams:grades.coverage.name'), grade: grades.coverage },
		{ key: 'bulk', label: t('teams:score.parts.bulk.name'), grade: grades.bulk },
		{ key: 'safety', label: t('teams:score.parts.safety.name'), grade: grades.safety },
		{ key: 'consistency', label: metrics.consistency, grade: grades.consistency },
	];

	return (
		// decorative echo of the page below — the real numbers are in the sections themselves
		<div className='r-hero-mini r-tm-mini' ref={miniRef} data-visible='false' data-tier={tier}>
			<div className='r-tm-mini-team'>
				{members.map((m, i) => {
					const name = cleanName(m.pokemon.speciesName);
					return (
						<button
							key={`${m.slot.speciesId}-${i}`}
							type='button'
							className='r-tm-mini-mon'
							style={{ ['--tc' as string]: typeVar(m.pokemon.types[0]) }}
							title={t('teams:builder.replace', { name })}
							aria-label={t('teams:builder.change', { name })}
							onClick={() => onChangePokemon(i)}
						>
							<span className='r-hero-mini-sprite'>
								{m.pokemon.isShadow && <ShadowMark className='r-shadow-mark' />}
								<SpriteImg pokemon={m.pokemon} ariaHidden />
							</span>
							<span className='r-tm-mini-name'>{name}</span>
						</button>
					);
				})}
			</div>

			<div className='r-tm-mini-stats'>
				<ScoreInfo kind='threat' className='r-tm-mini-stat r-tm-mini-threat'>
					<span>{t('teams:threat.shortLabel')}</span>
					{loading || threatScore === undefined ? (
						<span className='r-spinner r-spinner--sm' aria-hidden='true' />
					) : (
						<b>{threatScore}</b>
					)}
				</ScoreInfo>

				<ul className='r-tm-mini-grades' aria-label={t('teams:grades.heading')}>
					{report.map(({ key, label, grade }) => (
						<li key={key} data-key={key} title={grade && !loading ? `${label}: ${grade}` : label}>
							<span className='r-tm-grade' data-grade={loading ? undefined : grade}>
								{loading || !grade ? <span className='r-spinner r-spinner--sm' aria-hidden='true' /> : grade}
							</span>
						</li>
					))}
				</ul>

				<ScoreInfo kind='team' className='r-tm-mini-stat r-tm-mini-score'>
					<span>{t('teams:score.heading')}</span>
					{loading || score === undefined ? (
						<span className='r-spinner r-spinner--sm' aria-hidden='true' />
					) : (
						<b>{score.toFixed(1)}</b>
					)}
				</ScoreInfo>
			</div>
		</div>
	);
};

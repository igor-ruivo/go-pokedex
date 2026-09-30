import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { combatMetricNames } from '../../lib/combat-text';
import { cleanName } from '../../lib/format';
import type { LetterGrade, ScoreTier } from '../../lib/team-analysis';
import { typeVar } from '../../lib/types';
import type { AnalyzedMember } from './useTeamAnalysis';

export interface MiniGrades {
	/** From the simulated threat score; undefined while it is being computed. */
	coverage: LetterGrade | undefined;
	bulk: LetterGrade;
	safety: LetterGrade;
	consistency: LetterGrade;
}

/**
 * The Pokémon page's collapsed hero (`.r-hero-mini`), for a team — but pinned: a bar under the app bar that always
 * keeps the team (sprites + names), its threat score, the report-card grades and the Team score in view, whatever the
 * scroll position. It reuses that bar's shell (fixed position, fade, desktop pill); only the show/hide-on-scroll part
 * is gone, so `data-visible` is simply switched on once the bar has been positioned under the app bar.
 */
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

	// The app bar's height varies, so the bar's `top` is written from it (on mount and on resize); visible from then on.
	useLayoutEffect(() => {
		const miniEl = miniRef.current;
		if (!miniEl) return;
		const place = () => {
			const appbarH = document.querySelector('.r-appbar')?.getBoundingClientRect().height ?? 60;
			miniEl.style.top = `${appbarH + (window.innerWidth >= 900 ? 10 : 0)}px`;
		};
		place();
		// Visible a frame later, with the fade armed, so it eases in instead of popping.
		const raf = requestAnimationFrame(() => {
			miniEl.dataset.visible = 'true';
			miniEl.dataset.anim = 'true';
		});
		window.addEventListener('resize', place);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', place);
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
				<div className='r-tm-mini-stat r-tm-mini-threat'>
					<span>{t('teams:threat.shortLabel')}</span>
					{loading || threatScore === undefined ? (
						<span className='r-spinner r-spinner--sm' aria-hidden='true' />
					) : (
						<b>{threatScore}</b>
					)}
				</div>

				<ul className='r-tm-mini-grades' aria-label={t('teams:grades.heading')}>
					{report.map(({ key, label, grade }) => (
						<li key={key} data-key={key} title={grade && !loading ? `${label}: ${grade}` : label}>
							<span className='r-tm-grade' data-grade={loading ? undefined : grade}>
								{loading || !grade ? <span className='r-spinner r-spinner--sm' aria-hidden='true' /> : grade}
							</span>
						</li>
					))}
				</ul>

				<div className='r-tm-mini-stat r-tm-mini-score'>
					<span>{t('teams:score.heading')}</span>
					{loading || score === undefined ? (
						<span className='r-spinner r-spinner--sm' aria-hidden='true' />
					) : (
						<b>{score.toFixed(1)}</b>
					)}
				</div>
			</div>
		</div>
	);
};

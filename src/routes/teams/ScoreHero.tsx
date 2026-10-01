import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CombatHexagon } from '../../components/CombatHexagon';
import { PART_KEYS, SCORE_WEIGHTS, type ScoreParts, type ScoreTier } from '../../lib/team-analysis';
import { ScoreInfo } from './ScoreInfo';
import { partDescriptions, partNames, tierNames, tierSummaries } from './teams-text';

/** Eases a number toward `target` (respecting reduced motion), so score changes read as movement rather than a swap. */
const useCountUp = (target: number | undefined, ms = 900): number | undefined => {
	const [value, setValue] = useState(target);

	useEffect(() => {
		if (target === undefined) {
			setValue(undefined);
			return;
		}
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setValue(target);
			return;
		}
		let frame = 0;
		const from = value ?? 0;
		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min(1, (now - start) / ms);
			const eased = 1 - Math.pow(1 - progress, 3);
			setValue(from + (target - from) * eased);
			if (progress < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
		// `value` is deliberately the animation's *starting* point, not a dependency.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target, ms]);

	return value;
};

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The centrepiece: the composite Team Score as an animated ring, next to the
 * six-part radar it's built from and a weighted breakdown. Every part is
 * 0–100 and the score is their weighted mean, so the ring, the radar and the
 * bars all read on one scale. The simulated part (threat coverage) arrives a
 * moment after the rest, so the ring waits for it rather than showing a score
 * that would then jump.
 */
export const ScoreHero = ({
	score,
	tier,
	parts,
	simulating,
	stale,
	accent,
}: {
	score: number | undefined;
	tier: ScoreTier | undefined;
	parts: ScoreParts;
	/** The simulated part hasn't arrived yet. */
	simulating: boolean;
	/** A newer result is being computed; the numbers shown are the previous team's. */
	stale: boolean;
	accent: string;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail']);
	const names = partNames(t);
	const descriptions = partDescriptions(t);
	const shown = useCountUp(score);
	// Everything waits for the simulated part: the ring keeps its spinner until then, and the bars and radar all start
	// together (bars from empty, then easing on later changes) instead of the other five growing ahead of the threat one.
	const ready = parts.threat !== undefined;
	const [armed, setArmed] = useState(false);
	useEffect(() => {
		if (!ready) {
			setArmed(false);
			return;
		}
		const frame = requestAnimationFrame(() => setArmed(true));
		return () => cancelAnimationFrame(frame);
	}, [ready]);
	const fraction = shown === undefined ? 0 : Math.min(1, Math.max(0, shown / 100));

	const radarValues = {
		threat: parts.threat ?? 0,
		defense: parts.defense,
		offense: parts.offense,
		bulk: parts.bulk,
		safety: parts.safety,
		consistency: parts.consistency,
	};

	return (
		<section
			className='r-tm-hero'
			data-tier={tier}
			data-stale={stale ? '' : undefined}
			style={{ ['--hero-c' as string]: accent }}
		>
			<div className='r-tm-ring-wrap'>
				<svg
					className='r-tm-ring'
					viewBox='0 0 120 120'
					role='img'
					aria-label={t('teams:score.ringAria', { score: score?.toFixed(1) ?? '…' })}
				>
					<defs>
						<linearGradient id='r-tm-ring-grad' x1='0' y1='0' x2='1' y2='1'>
							<stop offset='0%' stopColor='var(--tier-a)' />
							<stop offset='100%' stopColor='var(--tier-b)' />
						</linearGradient>
					</defs>
					<circle className='r-tm-ring-track' cx='60' cy='60' r={RING_RADIUS} />
					{[0.25, 0.5, 0.75].map((f) => {
						const angle = f * 2 * Math.PI - Math.PI / 2;
						return (
							<line
								key={f}
								className='r-tm-ring-tick'
								x1={60 + Math.cos(angle) * (RING_RADIUS - 5)}
								y1={60 + Math.sin(angle) * (RING_RADIUS - 5)}
								x2={60 + Math.cos(angle) * (RING_RADIUS + 5)}
								y2={60 + Math.sin(angle) * (RING_RADIUS + 5)}
							/>
						);
					})}
					<circle
						className='r-tm-ring-fill'
						cx='60'
						cy='60'
						r={RING_RADIUS}
						strokeDasharray={RING_CIRCUMFERENCE}
						strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
						stroke='url(#r-tm-ring-grad)'
						transform='rotate(-90 60 60)'
					/>
				</svg>
				<ScoreInfo kind='team' className='r-tm-ring-center'>
					{shown === undefined || stale ? (
						<span className='r-spinner' aria-hidden='true' />
					) : (
						<b className='r-tm-ring-num'>{shown.toFixed(1)}</b>
					)}
					<span className='r-tm-ring-label'>{t('teams:score.teamScore')}</span>
				</ScoreInfo>
			</div>

			<div className='r-tm-hero-body'>
				<div className='r-tm-hero-verdict'>
					{tier ? (
						<>
							<span className='r-tm-tier'>{tierNames(t)[tier]}</span>
							<p>{tierSummaries(t)[tier]}</p>
						</>
					) : (
						<p className='r-muted'>{simulating ? t('teams:score.calculating') : t('teams:score.needTeam')}</p>
					)}
				</div>

				<ul className='r-tm-parts'>
					{PART_KEYS.map((key) => {
						const value = parts[key];
						// the simulated part is being recomputed (first time, or after an edit): spinner and shimmer instead of a stale number
						const loading = key === 'threat' && (value === undefined || stale);
						return (
							<li key={key} data-part={key} data-loading={loading ? '' : undefined}>
								<div className='r-tm-part-head'>
									<span>{names[key]}</span>
									<em>{t('teams:score.weight', { pct: Math.round(SCORE_WEIGHTS[key] * 100) })}</em>
									<b>
										{loading ? (
											<span className='r-spinner r-spinner--sm' aria-hidden='true' />
										) : (
											(value ?? 0).toFixed(1)
										)}
									</b>
								</div>
								<div className='r-tm-bar' aria-hidden='true'>
									<i style={{ width: armed ? `${value ?? 0}%` : '0%' }} />
								</div>
							</li>
						);
					})}
				</ul>
			</div>

			<div className='r-tm-radar'>
				{ready && (
					<CombatHexagon
						// remount on a new score so the grow-in plays for every team change
						key={score ?? 'pending'}
						axes={PART_KEYS}
						values={radarValues}
						labels={names}
						descriptions={descriptions}
						color={accent}
						ariaLabel={t('teams:score.radarAria')}
					/>
				)}
			</div>
		</section>
	);
};

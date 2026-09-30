import { useId } from 'react';

import { bestWorst, COMBAT_METRICS, type CombatMetric } from '../lib/combat';

interface CombatHexagonProps {
	values: Record<CombatMetric, number>;
	/** Localized axis names, keyed by metric. */
	labels: Record<CombatMetric, string>;
	/** Localized one-line explanations, shown as a desktop hover/focus tooltip. */
	descriptions: Record<CombatMetric, string>;
	/** Any CSS colour (`var(--lg-great)` or a rotating cup's own hex). */
	color: string;
	ariaLabel: string;
}

const CENTER = 50;
const RADIUS = 30;
/** Centre-to-label distance, in the same 0–100 space as the polygon. */
const LABEL_RADIUS = 43;
/** Smallest a vertex is ever drawn at, as a fraction of RADIUS — keeps a low
 *  score readable as a spike instead of collapsing onto the centre. */
const MIN_FRACTION = 0.14;
/** The echo layers under the main shape: (fraction of its size, opacity). */
const ECHOES: ReadonlyArray<[number, number]> = [
	[0.72, 0.16],
	[0.44, 0.14],
];

const angleOf = (i: number) => ((-90 + i * 60) * Math.PI) / 180;
const pointAt = (i: number, r: number): [number, number] => [
	CENTER + Math.cos(angleOf(i)) * r,
	CENTER + Math.sin(angleOf(i)) * r,
];
const toPoints = (pts: Array<[number, number]>) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/**
 * PvPoke's six role scores as a hexagonal radar — the same look as the stat
 * hexagon in the main-series games, but with three nested "echo" copies of the
 * shape (each fading inward) and a slow breathing glow so it reads as one
 * flowing form instead of a flat polygon.
 *
 * The scores all live in a narrow band (a typical top pick is 85–95 on every
 * axis), so the axes don't start at zero: they start at a floor just under the
 * lowest score (down to 0 when a score is that low). Each axis prints its
 * exact number.
 */
export const CombatHexagon = ({ values, labels, descriptions, color, ariaLabel }: CombatHexagonProps) => {
	const uid = useId().replace(/:/g, '');
	const nums = COMBAT_METRICS.map((m) => values[m]);
	const floor = Math.min(70, Math.max(0, Math.floor((Math.min(...nums) - 15) / 10) * 10));
	const fraction = (v: number) =>
		MIN_FRACTION + (1 - MIN_FRACTION) * Math.max(0, Math.min(1, (v - floor) / (100 - floor)));
	const { best, worst } = bestWorst(values);

	const shape = COMBAT_METRICS.map((m, i) => pointAt(i, RADIUS * fraction(values[m])));
	const ring = (f: number) => toPoints(COMBAT_METRICS.map((_, i) => pointAt(i, RADIUS * f)));

	return (
		<figure className='r-hex' style={{ ['--hex-c' as string]: color }}>
			<div className='r-hex-stage' role='img' aria-label={ariaLabel}>
				<svg viewBox='0 0 100 100' aria-hidden='true' focusable='false'>
					<defs>
						<radialGradient id={`${uid}-fill`} cx='50%' cy='50%' r='60%'>
							<stop offset='0%' stopColor='var(--hex-c)' stopOpacity='0.85' />
							<stop offset='100%' stopColor='var(--hex-c)' stopOpacity='0.4' />
						</radialGradient>
						<filter id={`${uid}-glow`} x='-30%' y='-30%' width='160%' height='160%'>
							<feGaussianBlur stdDeviation='1.6' />
						</filter>
					</defs>

					{/* grid: four rings + the six spokes */}
					{[0.25, 0.5, 0.75, 1].map((f) => (
						<polygon key={f} className='r-hex-ring' data-outer={f === 1 ? '' : undefined} points={ring(f)} />
					))}
					{COMBAT_METRICS.map((m, i) => {
						const [x, y] = pointAt(i, RADIUS);
						return <line key={m} className='r-hex-spoke' x1={CENTER} y1={CENTER} x2={x} y2={y} />;
					})}

					{/* soft halo behind the shape */}
					<polygon className='r-hex-halo' points={toPoints(shape)} filter={`url(#${uid}-glow)`} />

					{/* echoes — the same silhouette, shrunk toward the centre */}
					{ECHOES.map(([f, o], i) => (
						<polygon
							key={f}
							className='r-hex-echo'
							style={{ ['--i' as string]: i + 1, opacity: o }}
							points={toPoints(shape.map(([x, y]) => [CENTER + (x - CENTER) * f, CENTER + (y - CENTER) * f]))}
						/>
					))}

					<polygon className='r-hex-shape' fill={`url(#${uid}-fill)`} points={toPoints(shape)} />

					{COMBAT_METRICS.map((m, i) => (
						<circle
							key={m}
							className='r-hex-dot'
							data-tone={best.has(m) ? 'best' : worst.has(m) ? 'worst' : undefined}
							style={{ ['--i' as string]: i }}
							cx={shape[i][0]}
							cy={shape[i][1]}
							r={1.7}
						/>
					))}
				</svg>

				{COMBAT_METRICS.map((m, i) => {
					const [x, y] = pointAt(i, LABEL_RADIUS);
					const tone = best.has(m) ? 'best' : worst.has(m) ? 'worst' : undefined;
					const tipId = `${uid}-tip-${m}`;
					return (
						<button
							key={m}
							type='button'
							className='r-hex-l'
							data-tone={tone}
							data-side={x < 45 ? 'left' : x > 55 ? 'right' : 'mid'}
							data-vert={y < 50 ? 'top' : 'bottom'}
							style={{ left: `${x}%`, top: `${y}%` }}
							aria-describedby={tipId}
						>
							<span className='r-hex-name'>{labels[m]}</span>
							<b className='r-hex-val'>
								{tone && (
									<span className='r-hex-mark' aria-hidden='true'>
										{tone === 'best' ? '▲' : '▼'}
									</span>
								)}
								{values[m].toFixed(1)}
							</b>
							<span id={tipId} role='tooltip' className='r-hex-tip'>
								<strong>{labels[m]}</strong>
								{descriptions[m]}
							</span>
						</button>
					);
				})}
			</div>
		</figure>
	);
};

import { useEffect, useId, useRef, useState } from 'react';

import { bestWorst, COMBAT_METRICS, type CombatMetric } from '../lib/combat';

interface CombatHexagonProps<K extends string> {
	/** The six axes, clockwise from the top. Defaults to PvPoke's six combat metrics. */
	axes?: ReadonlyArray<K>;
	values: Record<K, number>;
	/** Localized axis names, keyed by axis. */
	labels: Record<K, string>;
	/** Localized one-line explanations, shown as a desktop hover/focus tooltip. */
	descriptions: Record<K, string>;
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

const TWEEN_MS = 800;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** What the last radar on screen was showing, per axis count — a radar that mounts later starts from it. */
const lastShown = new Map<number, Array<number>>();

/**
 * Eases the displayed vertex fractions towards `target`. Starts from whatever the previous radar was showing
 * (this instance's own last frame after an update, or the last radar that was on screen when a new one
 * mounts), and only from the centre the very first time any radar is drawn.
 */
const useTweenedFractions = (target: ReadonlyArray<number>): ReadonlyArray<number> => {
	const count = target.length;
	const [shown, setShown] = useState<Array<number>>(() => lastShown.get(count) ?? target.map(() => 0));
	const shownRef = useRef(shown);
	const signature = target.join('|');

	useEffect(() => {
		const from = shownRef.current.length === count ? shownRef.current : target.map(() => 0);
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const apply = (next: Array<number>) => {
			shownRef.current = next;
			lastShown.set(count, next);
			setShown(next);
		};
		if (reduced) {
			apply([...target]);
			return;
		}
		const start = performance.now();
		let frame = 0;
		const step = (now: number) => {
			const progress = Math.min(1, (now - start) / TWEEN_MS);
			const eased = easeOut(progress);
			apply(target.map((to, i) => from[i] + (to - from[i]) * eased));
			if (progress < 1) frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
		// `signature` is `target`'s value; the array itself is a new object every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [signature, count]);

	return shown;
};

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
export const CombatHexagon = <K extends string = CombatMetric>({
	axes = COMBAT_METRICS as unknown as ReadonlyArray<K>,
	values,
	labels,
	descriptions,
	color,
	ariaLabel,
}: CombatHexagonProps<K>) => {
	const uid = useId().replace(/:/g, '');
	const nums = axes.map((m) => values[m]);
	const floor = Math.min(70, Math.max(0, Math.floor((Math.min(...nums) - 15) / 10) * 10));
	const fraction = (v: number) =>
		MIN_FRACTION + (1 - MIN_FRACTION) * Math.max(0, Math.min(1, (v - floor) / (100 - floor)));
	const { best, worst } = bestWorst(values, axes);

	const fractions = useTweenedFractions(axes.map((m) => fraction(values[m])));

	const shape = axes.map((_, i) => pointAt(i, RADIUS * (fractions[i] ?? 0)));
	const ring = (f: number) => toPoints(axes.map((_, i) => pointAt(i, RADIUS * f)));

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
					{axes.map((m, i) => {
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

					{axes.map((m, i) => (
						<circle
							key={m}
							className='r-hex-dot'
							data-tone={best.has(m) ? 'best' : worst.has(m) ? 'worst' : undefined}
							cx={shape[i][0]}
							cy={shape[i][1]}
							r={1.7}
						/>
					))}
				</svg>

				{axes.map((m, i) => {
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

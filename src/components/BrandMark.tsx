import { useId } from 'react';

const RED = '#ff5b5b';
const WHITE = '#f4f4f5';
const INK = '#11151c';

/** The Poké Ball itself (the O), drawn in a 100 × 100 box at (100, 12) of the logo's own coordinates. */
const Ball = ({ ball, clip }: { ball: string; clip: string }) => (
	<g className='h-mark-ball'>
		<circle cx='150' cy='62' r='50' fill={INK} />
		<g clipPath={`url(#${clip})`}>
			<rect x='100' y='12' width='100' height='100' fill={`url(#${ball})`} />
			<rect x='100' y='57.5' width='100' height='9' fill={INK} />
		</g>
		<circle cx='150' cy='62' r='16' fill={WHITE} />
		<circle cx='150' cy='62' r='10.5' fill={INK} />
		<circle cx='150' cy='62' r='4.5' fill={WHITE} opacity='0.9' />
		<path
			d='M121 44A33 33 0 0 1 142 28'
			fill='none'
			stroke='#fff'
			strokeWidth='4'
			strokeLinecap='round'
			opacity='0.4'
		/>
	</g>
);

/**
 * The GO of "GO Pokédex": the Poké Ball is the O, and a G bites into it, drawn with the ball's own colours turned upside down
 * (white above, red below) and its crossbar running into the ball. All paths, no font: it scales from the app bar to the hero.
 * With `animate` the G draws itself once and the ball gives a small wobble now and then.
 */
export const BrandMark = ({
	className,
	animate = false,
	label,
}: {
	className?: string;
	animate?: boolean;
	/** The accessible name; without it the mark is decorative. */
	label?: string;
}) => {
	const id = useId();
	const g = `${id}-g`;
	const ball = `${id}-b`;
	const clip = `${id}-c`;
	return (
		<svg
			className={`h-mark${animate ? ' h-mark--animate' : ''}${className ? ` ${className}` : ''}`}
			viewBox='0 0 208 124'
			role={label ? 'img' : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			focusable='false'
		>
			<defs>
				{/* the G: white on top, red below, the Poké Ball's colours the other way round */}
				<linearGradient id={g} gradientUnits='userSpaceOnUse' x1='0' y1='0' x2='0' y2='124'>
					<stop offset='0.5' stopColor={WHITE} />
					<stop offset='0.5' stopColor={RED} />
				</linearGradient>
				<linearGradient id={ball} gradientUnits='userSpaceOnUse' x1='0' y1='12' x2='0' y2='112'>
					<stop offset='0.5' stopColor={RED} />
					<stop offset='0.5' stopColor={WHITE} />
				</linearGradient>
				<clipPath id={clip}>
					<circle cx='150' cy='62' r='45' />
				</clipPath>
			</defs>

			{/* the G: an outline in the ball's ink so it reads on any background, then its two-colour body */}
			<g fill='none' strokeLinecap='round' strokeLinejoin='round'>
				<path className='h-mark-g' d='M98 31.8A47 47 0 1 0 109 62L70 62' stroke={INK} strokeWidth='28' />
				<path className='h-mark-g' d='M98 31.8A47 47 0 1 0 109 62L70 62' stroke={`url(#${g})`} strokeWidth='19' />
			</g>

			{/* the ball, in front: the G's mouth closes around its left side */}
			<Ball ball={ball} clip={clip} />
		</svg>
	);
};

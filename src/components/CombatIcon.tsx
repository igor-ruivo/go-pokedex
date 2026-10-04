import { useId } from 'react';

/**
 * A mini stat-radar in two hues: a grid hexagon, a gradient-filled shape and a dot on each axis. The icon of the Combat tab
 * and of the team builder. The view box hugs the hexagon, so it fills whatever square it is given.
 */
export const CombatIcon = ({ className }: { className?: string | undefined }) => {
	const fill = `${useId()}-fill`;
	return (
		<svg
			className={className}
			viewBox='1.3 1.3 21.4 21.4'
			fill='none'
			strokeLinejoin='round'
			aria-hidden='true'
			focusable='false'
		>
			<defs>
				<linearGradient id={fill} x1='4' y1='3' x2='20' y2='21' gradientUnits='userSpaceOnUse'>
					<stop offset='0' stopColor='#4fd1c5' />
					<stop offset='1' stopColor='#6c8cff' />
				</linearGradient>
			</defs>
			<polygon
				points='12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7'
				stroke='var(--text)'
				strokeWidth='1.4'
				opacity='0.55'
			/>
			<polygon
				points='12,4.6 18.4,8.6 16.6,15.6 12,19.6 7.2,14.8 6.6,8.4'
				fill={`url(#${fill})`}
				fillOpacity='0.75'
				stroke={`url(#${fill})`}
				strokeWidth='1.4'
			/>
			{[
				[12, 4.6],
				[18.4, 8.6],
				[16.6, 15.6],
				[12, 19.6],
				[7.2, 14.8],
				[6.6, 8.4],
			].map(([x, y]) => (
				<circle key={`${x}-${y}`} cx={x} cy={y} r='1.4' fill='#6c8cff' />
			))}
		</svg>
	);
};

import { useId } from 'react';

/**
 * A raid: the raid boss's face (the game's own raid coin, lifted off its orange disc and kept as white on transparent) on a
 * warm rounded badge. It keeps the same look in both themes at any size.
 */
export const RaidIcon = ({ className }: { className?: string }) => {
	const bg = `${useId()}-bg`;
	return (
		<svg className={className} viewBox='0 0 100 100' aria-hidden='true' focusable='false'>
			<defs>
				<linearGradient id={bg} x1='0' y1='0' x2='0.8' y2='1'>
					<stop offset='0' stopColor='#ff9d6a' />
					<stop offset='1' stopColor='#e8503f' />
				</linearGradient>
			</defs>
			<rect x='2' y='2' width='96' height='96' rx='26' fill={`url(#${bg})`} />
			<image
				href='/images/brand/raid-face.png'
				x='16'
				y='19.500'
				width='68'
				height='60'
				preserveAspectRatio='xMidYMid meet'
			/>
		</svg>
	);
};

import { useId } from 'react';

/**
 * The home page's own drawn icons, in the style of its other app tiles (a rounded square with a gradient and one clear picture):
 * the trainer's collection and the team builder. They are also the icons of those two Teams tabs, so they read at 18px too.
 */

/** A Poké Ball on a tile, with a second tile peeking out behind it: the Pokémon you have. */
export const CollectionIcon = ({ className }: { className?: string | undefined }) => {
	const id = useId();
	return (
		<svg className={className} viewBox='0 0 64 64' aria-hidden='true' focusable='false'>
			<defs>
				<linearGradient id={`${id}-tile`} x1='8' y1='12' x2='56' y2='62' gradientUnits='userSpaceOnUse'>
					<stop offset='0' stopColor='#ffd45e' />
					<stop offset='1' stopColor='#f29a1f' />
				</linearGradient>
				<clipPath id={`${id}-ball`}>
					<circle cx='32' cy='38' r='15' />
				</clipPath>
			</defs>
			{/* the one behind */}
			<rect x='13' y='3' width='38' height='20' rx='7' fill='#e08a12' opacity='0.45' />
			<rect x='9' y='8' width='46' height='24' rx='8' fill='#e08a12' opacity='0.72' />
			{/* the tile */}
			<rect
				x='4.7'
				y='14.7'
				width='54.6'
				height='45.6'
				rx='12.6'
				fill={`url(#${id}-tile)`}
				stroke='#b8700a'
				strokeWidth='1.4'
			/>
			<rect
				x='6.4'
				y='16.4'
				width='51.2'
				height='42.2'
				rx='11'
				fill='none'
				stroke='#fff'
				strokeOpacity='0.65'
				strokeWidth='1'
			/>
			{/* the ball */}
			<g clipPath={`url(#${id}-ball)`}>
				<rect x='17' y='23' width='30' height='15' fill='#ff5a4f' />
				<rect x='17' y='38' width='30' height='15' fill='#ffffff' />
				<rect x='17' y='35.4' width='30' height='5.2' fill='#27303f' />
			</g>
			<circle cx='32' cy='38' r='15' fill='none' stroke='#27303f' strokeWidth='2.4' />
			<circle cx='32' cy='38' r='5.6' fill='#ffffff' stroke='#27303f' strokeWidth='2.4' />
			<circle cx='32' cy='38' r='2.2' fill='#cfd8e3' />
		</svg>
	);
};

/** A flask with a bubbling brew on a tile: the lab where teams are put together and tried out. */
export const TeamBuilderIcon = ({ className }: { className?: string | undefined }) => {
	const id = useId();
	const flask = 'M26 11H38M27 11V27L14.6 48.4Q11.6 54.6 18.4 54.6H45.6Q52.4 54.6 49.4 48.4L37 27V11';
	return (
		<svg className={className} viewBox='0 0 64 64' aria-hidden='true' focusable='false'>
			<defs>
				<linearGradient id={`${id}-tile`} x1='6' y1='4' x2='58' y2='62' gradientUnits='userSpaceOnUse'>
					<stop offset='0' stopColor='#ff8060' />
					<stop offset='1' stopColor='#e43a2c' />
				</linearGradient>
				<linearGradient id={`${id}-brew`} x1='0' y1='34' x2='0' y2='56' gradientUnits='userSpaceOnUse'>
					<stop offset='0' stopColor='#d4f6ff' />
					<stop offset='1' stopColor='#52bff2' />
				</linearGradient>
				<clipPath id={`${id}-glass`}>
					<path d={flask} />
				</clipPath>
			</defs>
			<rect
				x='4.7'
				y='4.7'
				width='54.6'
				height='54.6'
				rx='14.3'
				fill={`url(#${id}-tile)`}
				stroke='#a62416'
				strokeWidth='1.4'
			/>
			<rect
				x='6.4'
				y='6.4'
				width='51.2'
				height='51.2'
				rx='12.8'
				fill='none'
				stroke='#fff'
				strokeOpacity='0.65'
				strokeWidth='1'
			/>
			{/* the glass, and the brew in it */}
			<path d={flask} fill='#ffffff' fillOpacity='0.24' />
			<g clipPath={`url(#${id}-glass)`}>
				<path d='M8 38Q16 33.4 24 38T40 38T56 38V60H8z' fill={`url(#${id}-brew)`} />
				<circle cx='26' cy='47' r='2.6' fill='#ffffff' fillOpacity='0.7' />
				<circle cx='36' cy='44' r='1.8' fill='#ffffff' fillOpacity='0.7' />
				<circle cx='40.5' cy='50' r='2.2' fill='#ffffff' fillOpacity='0.7' />
			</g>
			<path d={flask} fill='none' stroke='#ffffff' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
			{/* the rim, and what is rising out of it */}
			<path d='M24.2 11H39.8' stroke='#ffffff' strokeWidth='3.4' strokeLinecap='round' />
			<circle cx='33' cy='24' r='1.9' fill='#ffffff' fillOpacity='0.85' />
			<circle cx='31' cy='19' r='1.3' fill='#ffffff' fillOpacity='0.85' />
		</svg>
	);
};

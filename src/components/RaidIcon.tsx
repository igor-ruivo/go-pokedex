import { useId } from 'react';

/**
 * A raid, drawn as the raid boss's face — a horned crest, pointed ears, side fins, slanted eyes, the swirled nose and a fanged
 * grin — in white on a warm badge. All paths, so it looks the same in both themes at any size.
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
			{/* the head: ears, crest and fins in one outline; the eyes, nose and grin are cut out of it */}
			<path
				fill='#fff'
				fillRule='evenodd'
				d='M23 21c7 3 12 8 14 14 4-1.600 8.500-2.600 13-2.600V20.500l4.500 11.900c4.500 0 9 1 13 2.600 2-6 7-11 14-14-.800 7-.600 13-3 18.500l10.500.500-8 7 9 6.500-10.500 2.500C73.500 74 63.500 83 50 83S26.500 74 24.500 58.500L14 56l9-6.500-8-7 10.500-.500C23.600 34 23.800 28 23 21Z M30.500 45c5.500-2.600 11.500-1.500 15 2.800l-1.800 6.700c-5.800.500-10.700-2.700-13.200-9.500Z M69.500 45c-5.500-2.600-11.500-1.500-15 2.800l1.800 6.700c5.800.500 10.700-2.700 13.200-9.500Z M50 44.500c4.200 4.200 5.600 9.500 4 14.500H46c-1.600-5 -.200-10.300 4-14.500Z M32.500 66c8.500 8 26.500 8 35 0-7 3.800-28 3.800-35 0Z'
			/>
			{/* the fangs, set into the grin */}
			<path fill='#fff' d='M37.500 68.500 41 76l3.500-6.500ZM55.500 69.500 59 76l3.500-7.500Z' />
			{/* the rings of the nose */}
			<g fill='none' stroke='#e8503f' strokeWidth='1.700' strokeLinecap='round' opacity='0.9'>
				<path d='M46.500 56c2.200 1.400 4.800 1.400 7 0' />
				<path d='M47.500 51.500c1.600 1 3.400 1 5 0' />
			</g>
		</svg>
	);
};

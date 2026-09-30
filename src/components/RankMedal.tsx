/**
 * The gold, silver and bronze medal that marks the first three places of a ranking (ranks 1–3; nothing otherwise).
 * Colours come from `.r-medal` in components.css, so it draws the same wherever it sits.
 */
export const RankMedal = ({ rank, size, className = '' }: { rank: number; size?: number; className?: string }) => {
	if (rank < 1 || rank > 3) return null;
	return (
		<svg
			className={`r-medal ${className}`.trim()}
			data-podium={rank}
			viewBox='0 0 24 24'
			{...(size ? { width: size, height: size } : {})}
			aria-hidden='true'
		>
			<path className='r-medal-ribbon' d='M6.6 1.2h4.1l1.6 6-3.3.9z' />
			<path className='r-medal-ribbon' d='M17.4 1.2h-4.1l-1.6 6 3.3.9z' />
			<circle className='r-medal-disc' cx='12' cy='15.2' r='7.2' />
			<circle className='r-medal-ring' cx='12' cy='15.2' r='4.9' />
			<path className='r-medal-star' d='M12 11.6l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z' />
		</svg>
	);
};

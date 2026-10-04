/**
 * The sparkle that stands for "shiny" and for bonuses: two four-point stars in gold, outlined in a darker gold so the icon
 * reads on a white page as well as on a dark one.
 */
export const SparkleIcon = ({ className }: { className?: string }) => (
	<svg viewBox='0 0 24 24' aria-hidden='true' className={className} focusable='false'>
		<path
			d='M11 2 13.1 8.9 20 11 13.1 13.1 11 20 8.9 13.1 2 11 8.9 8.9Z'
			style={{ fill: 'var(--gold-soft)', stroke: 'var(--gold-ink)' }}
			strokeWidth='1'
			strokeLinejoin='round'
		/>
		<path
			d='M18.5 2 19.4 4.6 22 5.5 19.4 6.4 18.5 9 17.6 6.4 15 5.5 17.6 4.6Z'
			style={{ fill: 'var(--gold)', stroke: 'var(--gold-ink)' }}
			strokeWidth='0.8'
			strokeLinejoin='round'
		/>
	</svg>
);

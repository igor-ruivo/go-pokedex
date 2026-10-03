/**
 * The Best Buddy crown — marks a Pokémon above level 50 (50.5 and 51 only exist for a Best Buddy). Decorative:
 * the level itself is shown as text next to it. Size / placement come from CSS via `className`.
 */
export const BuddyMark = ({ className = 'r-buddy-mark' }: { className?: string }) => (
	<img className={className} src='/images/buddy-crown.png' alt='' aria-hidden='true' loading='lazy' decoding='async' />
);

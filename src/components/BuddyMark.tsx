/**
 * The Best Buddy crown — marks a Pokémon above level 50 (50.5 and 51 only exist for a Best Buddy). Decorative:
 * the level itself is shown as text next to it. Size / placement come from CSS via `className`. `disabled`: greyed out,
 * for a Pokémon that has the ribbon taken away (the stand-in of a Best Buddy).
 */
export const BuddyMark = ({
	className = 'r-buddy-mark',
	disabled = false,
}: {
	className?: string;
	disabled?: boolean;
}) => (
	<img
		className={disabled ? `${className} r-buddy-mark--off` : className}
		src='/images/buddy-crown.png'
		alt=''
		aria-hidden='true'
		loading='lazy'
		decoding='async'
	/>
);

/**
 * The "shadow Pokémon" mark — a purple flame (Team Rocket corruption).
 * Size / placement come from CSS via `className`.
 */
export const ShadowMark = ({ className = 'r-shadow-mark' }: { className?: string }) => (
	<img className={className} src='/images/shadow.png' alt='Shadow' loading='lazy' decoding='async' />
);

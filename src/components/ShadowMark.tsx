import { useLanguage } from '../contexts/language-context';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';

/**
 * The "shadow Pokémon" mark — a purple flame (Team Rocket corruption). Alt
 * text tracks the player's in-game language (GameLanguage), not the website
 * UI's — same reasoning as every other GameTranslator use. Size / placement
 * come from CSS via `className`.
 */
export const ShadowMark = ({ className = 'r-shadow-mark' }: { className?: string }) => {
	const { currentGameLanguage: gl } = useLanguage();
	return (
		<img
			className={className}
			src='/images/shadow.png'
			alt={gameTranslator(GameTranslatorKeys.ShadowDisplay, gl)}
			loading='lazy'
			decoding='async'
		/>
	);
};

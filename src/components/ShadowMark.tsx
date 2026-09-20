import { useTranslation } from 'react-i18next';

/**
 * The "shadow Pokémon" mark — a purple flame (Team Rocket corruption).
 * Size / placement come from CSS via `className`.
 */
export const ShadowMark = ({ className = 'r-shadow-mark' }: { className?: string }) => {
	const { t } = useTranslation(['components']);
	return (
		<img
			className={className}
			src='/images/shadow.png'
			alt={t('components:shadowMark.alt')}
			loading='lazy'
			decoding='async'
		/>
	);
};

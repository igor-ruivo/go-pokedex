import { useTranslation } from 'react-i18next';

/**
 * A small warning sign after a move's name: it isn't one of the moves PvPoke recommends for this Pokémon in this league
 * (a ranking's moveset is what the team is rated with by default, so a different move is a deliberate, probably weaker, pick).
 */
export const NotRecommendedMark = () => {
	const { t } = useTranslation(['teams']);
	const label = t('teams:builder.notRecommended');
	return (
		<span className='r-tm-warn' role='img' aria-label={label} title={label}>
			<svg viewBox='0 0 24 24' aria-hidden='true'>
				<path d='M12 3.2 22 20.5H2z' />
				<path d='M12 9.5v5M12 17.4v.1' />
			</svg>
		</span>
	);
};

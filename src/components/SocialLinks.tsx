import { useTranslation } from 'react-i18next';

import { socialLinks } from '../lib/social';

/** Discord's mark, simplified: the controller-like mask with its two eyes. */
const DiscordGlyph = () => (
	<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
		<path
			fill='currentColor'
			d='M19.3 5.4A16.600 16.600 0 0 0 15.200 4.100l-.5 1a15.300 15.300 0 0 0-5.400 0l-.5-1A16.600 16.600 0 0 0 4.700 5.400C2.100 9.300 1.400 13 1.700 16.700a16.700 16.700 0 0 0 5 2.500l1.100-1.800a10.800 10.800 0 0 1-1.700-.8l.4-.3a11.900 11.900 0 0 0 10.200 0l.4.3a10.800 10.800 0 0 1-1.700.8l1.100 1.800a16.700 16.700 0 0 0 5-2.500c.4-4.300-.7-8-3-11.300ZM8.900 14.500c-1 0-1.800-.9-1.800-2s.8-2 1.800-2 1.800.9 1.800 2-.8 2-1.800 2Zm6.200 0c-1 0-1.800-.9-1.800-2s.8-2 1.800-2 1.800.9 1.800 2-.8 2-1.800 2Z'
		/>
	</svg>
);

/** The project's social buttons. One with no address yet is shown as a button that goes nowhere. */
export const SocialLinks = () => {
	const { t } = useTranslation(['home']);
	const links = socialLinks();
	return (
		<ul className='h-social' aria-label={t('home:social.label')}>
			{links.map((l) => (
				<li key={l.id}>
					{l.url ? (
						<a className='h-social-btn' data-brand={l.id} href={l.url} target='_blank' rel='noopener noreferrer'>
							<DiscordGlyph />
							<span>{t('home:social.discord')}</span>
						</a>
					) : (
						<span className='h-social-btn' data-brand={l.id} data-soon='' aria-disabled='true'>
							<DiscordGlyph />
							<span>{t('home:social.discord')}</span>
						</span>
					)}
				</li>
			))}
		</ul>
	);
};

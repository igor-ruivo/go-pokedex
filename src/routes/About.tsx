import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { SocialLinks } from '../components/SocialLinks';

const CREDITS = [
	{ name: 'PvPoke', url: 'https://pvpoke.com', text: 'home:about.pvpoke' },
	{ name: 'LeekDuck', url: 'https://leekduck.com', text: 'home:about.leekduck' },
	{ name: 'PokeMiners', url: 'https://github.com/PokeMiners', text: 'home:about.pokeminers' },
	{ name: 'Pokémon GO Live', url: 'https://pokemongolive.com', text: 'home:about.official' },
	{ name: 'PvP IVs', url: 'https://pvpivs.com', text: 'home:about.pvpivs' },
] as const;

/** Who made this and why, who it stands on, what it stores about you, and that it is not official. */
const About = () => {
	const { t } = useTranslation(['home']);
	const { hash } = useLocation();

	// The footer links straight to "#privacy": scroll there once the page is on screen.
	useEffect(() => {
		if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
	}, [hash]);

	// Each credit starts with its own name, shown as the link; the translated sentence is the whole line.
	const credit = (name: string, sentence: string) =>
		sentence.startsWith(name) ? sentence.slice(name.length) : ` ${sentence}`;

	return (
		<div className='h-page h-prose'>
			<h1 className='r-page-title'>{t('home:about.title')}</h1>
			<p className='h-lead'>{t('home:about.intro')}</p>

			<h2 id='story'>{t('home:about.storyTitle')}</h2>
			<p>{t('home:about.s1')}</p>
			<p>{t('home:about.s2')}</p>
			<p>{t('home:about.s3')}</p>
			<p>{t('home:about.s4')}</p>

			<h2>{t('home:about.yoursTitle')}</h2>
			<p>{t('home:about.y1')}</p>
			<p>{t('home:about.y2')}</p>
			<blockquote className='h-quote'>{t('home:about.y3')}</blockquote>

			<h2>{t('home:about.searchTitle')}</h2>
			<p>{t('home:about.q1')}</p>
			<p>{t('home:about.q2')}</p>
			<p>{t('home:about.q3')}</p>

			<h2>{t('home:about.builtTitle')}</h2>
			<p>{t('home:about.b1')}</p>
			<p>{t('home:about.b2')}</p>
			<p>{t('home:about.b3')}</p>
			<p className='h-sign'>{t('home:about.sign')}</p>
			<SocialLinks />

			<h2 id='credits'>{t('home:about.creditsTitle')}</h2>
			<p>{t('home:about.creditsIntro')}</p>
			<ul className='h-credits'>
				{CREDITS.map((c) => (
					<li key={c.name}>
						<a href={c.url} target='_blank' rel='noopener noreferrer'>
							{c.name}
						</a>
						{credit(c.name, t(c.text))}
					</li>
				))}
			</ul>

			<h2 id='privacy'>{t('home:about.privacyTitle')}</h2>
			<p>{t('home:about.privacyBody')}</p>

			<h2 id='disclaimer'>{t('home:about.disclaimerTitle')}</h2>
			<p>{t('home:footer.disclaimer')}</p>
		</div>
	);
};

export default About;

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const CREDITS = [
	{ name: 'PvPoke', url: 'https://pvpoke.com', text: 'home:about.pvpoke' },
	{ name: 'LeekDuck', url: 'https://leekduck.com', text: 'home:about.leekduck' },
	{ name: 'PokeMiners', url: 'https://github.com/PokeMiners', text: 'home:about.pokeminers' },
	{ name: 'Pokémon GO Live', url: 'https://pokemongolive.com', text: 'home:about.official' },
	{ name: 'PvP IVs', url: 'https://pvpivs.com', text: 'home:about.pvpivs' },
] as const;

/** Who made this, who it stands on, what it stores about you, and that it is not official. */
const About = () => {
	const { t } = useTranslation(['home']);
	const { hash } = useLocation();

	// The footer links straight to "#privacy": scroll there once the page is on screen.
	useEffect(() => {
		if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
	}, [hash]);

	// Each credit starts with its own name, shown as the link; the translated sentence is the whole line.
	const credit = (name: string, sentence: string) => (sentence.startsWith(name) ? sentence.slice(name.length) : ` ${sentence}`);

	return (
		<div className='h-page h-prose'>
			<h1 className='r-page-title'>{t('home:about.title')}</h1>
			<p>{t('home:about.intro')}</p>
			<p className='r-muted'>{t('home:about.madeBy')}</p>

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

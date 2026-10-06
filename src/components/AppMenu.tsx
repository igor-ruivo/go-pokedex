import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { useBestBuddy } from '../contexts/best-buddy-context';
import { useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
import { Theme, useTheme } from '../contexts/theme-context';
import { useSwipeToClose } from '../hooks/useSwipeToClose';
import { useUnseenEventsCount } from '../hooks/useUnseenEventsCount';
import { SUPPORTED_LOCALE_NAMES, SUPPORTED_LOCALES } from '../i18n';
import { sentenceCase } from '../lib/format';
import { R } from '../lib/nav';
import { RAID_METRIC_LABEL, RAID_METRICS } from '../lib/raid-metric';
import { socialLinks } from '../lib/social';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { BrandMark } from './BrandMark';
import { TeamBuilderIcon } from './NavIcons';
import { RaidIcon } from './RaidIcon';
import { TeamTabIcon } from './team-tab-icons';

// feedback, bug reports and ideas go to the Discord server
const FEEDBACK_URL = socialLinks().find((l) => l.id === 'discord')?.url;
const CLOSE_MS = 220;

/**
 * The app menu: one button in the top bar that opens a drawer from the right with where to go (every page, with its icon and
 * what it is for), the language (all of them, one tap each), the preferences, and the project's own links. It closes on a tap
 * outside, Escape, or going to a page, locks the page behind it while open, and gives focus back to its button.
 */
export const AppMenu = () => {
	const { t } = useTranslation(['home', 'settings', 'common', 'pokemonDetail', 'teams']);
	const { pathname } = useLocation();
	const { currentLanguage, currentGameLanguage: gl, updateCurrentLanguage } = useLanguage();
	const { raidMetric, updateRaidMetric } = useRaidMetric();
	const { bestBuddy, updateBestBuddy } = useBestBuddy();
	const { theme, updateTheme } = useTheme();
	const unseenEvents = useUnseenEventsCount();
	const [open, setOpen] = useState(false);
	const [closing, setClosing] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);
	// The drawer is fixed to the screen, but the top bar blurs what is behind it, which makes it the anchor of anything fixed inside it:
	// so it goes to the app root instead (still under .rvmp, where the styles are).
	const root = open ? (triggerRef.current?.closest<HTMLElement>('.rvmp') ?? null) : null;

	const close = () => {
		setClosing(true);
		window.setTimeout(() => {
			setOpen(false);
			setClosing(false);
			triggerRef.current?.focus();
		}, CLOSE_MS);
	};
	const closeLatest = useRef(close);
	closeLatest.current = close;
	// a touch drag to the right takes the drawer away
	const swipe = useSwipeToClose<HTMLElement>(() => closeLatest.current());

	// Going to a page closes the menu.
	const lastPath = useRef(pathname);
	useEffect(() => {
		if (pathname !== lastPath.current) {
			lastPath.current = pathname;
			setOpen(false);
			setClosing(false);
		}
	}, [pathname]);

	useEffect(() => {
		if (!open) return;
		closeRef.current?.focus();
		const html = document.documentElement;
		const previous = html.style.overflow;
		html.style.overflow = 'hidden';
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeLatest.current();
		};
		document.addEventListener('keydown', onKey);
		return () => {
			html.style.overflow = previous;
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const onRaid = pathname.startsWith('/rankings/raid');
	const onRanks = pathname.startsWith('/rankings') && pathname !== R.pokedex && !onRaid;
	const onCollection = pathname.startsWith(R.teamsCollection);
	const links: Array<{
		key: string;
		to: string;
		icon: ReactNode;
		label: string;
		hint?: string | undefined;
		active: boolean;
	}> = [
		{
			key: 'home',
			to: R.home,
			icon: (
				<svg className='r-menu-home' viewBox='0 0 24 24' aria-hidden='true'>
					<path d='M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z' />
				</svg>
			),
			label: t('home:menu.home'),
			active: pathname === R.home,
		},
		{
			key: 'pokedex',
			to: R.pokedex,
			icon: <img src='/images/nav/pokedex.png' alt='' />,
			label: 'Pokédex',
			active: pathname === R.pokedex,
		},
		{
			key: 'collection',
			to: R.teamsCollection,
			icon: <TeamTabIcon id='collection' size={26} />,
			label: t('teams:page.collectionTab'),
			active: onCollection,
		},
		{
			key: 'ranks',
			to: R.rankings('great'),
			icon: <img src='/images/nav/rankings.webp' alt='' />,
			label: t('home:hero.ctaPvp'),
			hint: t('common:nav.leagues.hint'),
			active: onRanks,
		},
		{
			key: 'raid',
			to: R.rankings('raid'),
			icon: <RaidIcon />,
			label: t('home:hero.ctaRaid'),
			active: onRaid,
		},
		{
			key: 'teams',
			to: R.teams,
			icon: <TeamBuilderIcon />,
			label: t('home:hero.ctaTeams'),
			hint: t('common:nav.teams.hint'),
			active: pathname.startsWith('/teams') && !onCollection,
		},
		{
			key: 'calendar',
			to: R.calendar(),
			icon: <img src='/images/nav/calendar.png' alt='' />,
			label: t('common:nav.calendar.label'),
			hint: t('common:nav.calendar.hint', { raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)) }),
			active: pathname.startsWith('/calendar'),
		},
		{
			key: 'moves',
			to: R.moves,
			icon: <img src='/images/nav/moves.png' alt='' />,
			label: t('common:nav.moves.label'),
			hint: t('common:nav.moves.hint'),
			active: pathname.startsWith('/move'),
		},
		{
			key: 'types',
			to: R.types,
			icon: <img src='/images/types/psychic.png' alt='' />,
			label: t('common:nav.types.label'),
			hint: t('common:nav.types.hint'),
			active: pathname.startsWith('/types'),
		},
		{
			key: 'searches',
			to: R.searchStrings(),
			icon: <img src='/images/nav/search-strings.svg' alt='' />,
			label: t('common:nav.searches.label'),
			hint: t('common:nav.searches.hint'),
			active: pathname.startsWith('/search-strings') || pathname.startsWith('/trash'),
		},
	];

	return (
		<>
			<button
				ref={triggerRef}
				type='button'
				className='r-icon-btn r-burger'
				aria-label={t('home:menu.open')}
				aria-expanded={open}
				aria-controls='app-menu'
				data-open={open && !closing ? '' : undefined}
				onClick={() => setOpen(true)}
			>
				<span aria-hidden='true' />
				<span aria-hidden='true' />
				<span aria-hidden='true' />
			</button>

			{open &&
				root &&
				createPortal(
					<div className='r-menu' data-closing={closing ? '' : undefined}>
						<div className='r-menu-backdrop' onClick={close} aria-hidden='true' />
						<aside
							ref={swipe.ref}
							{...swipe.handlers}
							id='app-menu'
							className='r-menu-panel'
							role='dialog'
							aria-modal='true'
							aria-label={t('home:menu.open')}
						>
							<header className='r-menu-head'>
								<Link to={R.home} className='r-logo' aria-label={t('common:app.homeAriaLabel')}>
									<BrandMark className='r-logo-mark' />
									<b>Pokédex</b>
								</Link>
								<button
									ref={closeRef}
									type='button'
									className='r-icon-btn r-menu-close'
									aria-label={t('home:menu.close')}
									onClick={close}
								>
									<svg viewBox='0 0 24 24' aria-hidden='true'>
										<path d='M6 6l12 12M18 6L6 18' />
									</svg>
								</button>
							</header>

							<div className='r-menu-body'>
								<nav aria-label={t('home:menu.pages')}>
									<h2 className='r-menu-h'>{t('home:menu.pages')}</h2>
									<ul className='r-menu-links'>
										{links.map((l) => (
											<li key={l.key}>
												<Link to={l.to} className='r-menu-link' aria-current={l.active ? 'page' : undefined}>
													<span className='r-menu-ico'>
														{l.icon}
														{l.key === 'calendar' && unseenEvents > 0 && (
															<i className='r-menu-badge'>{unseenEvents > 9 ? '9+' : unseenEvents}</i>
														)}
													</span>
													<span className='r-menu-txt'>
														<b>{l.label}</b>
														{l.hint && <span>{l.hint}</span>}
													</span>
													<svg className='r-menu-chev' viewBox='0 0 24 24' aria-hidden='true'>
														<path d='M9 6l6 6-6 6' />
													</svg>
												</Link>
											</li>
										))}
									</ul>
								</nav>

								<section aria-labelledby='menu-lang'>
									<h2 className='r-menu-h' id='menu-lang'>
										{t('settings:menu.appLanguage')}
									</h2>
									<div className='r-menu-langs' role='radiogroup' aria-label={t('settings:menu.appLanguage')}>
										{SUPPORTED_LOCALES.map((locale) => (
											<button
												key={locale}
												type='button'
												role='radio'
												aria-checked={locale === currentLanguage}
												data-active={locale === currentLanguage ? '' : undefined}
												onClick={() => updateCurrentLanguage(locale)}
											>
												{SUPPORTED_LOCALE_NAMES[locale]}
											</button>
										))}
									</div>
								</section>

								<section aria-labelledby='menu-prefs'>
									<h2 className='r-menu-h' id='menu-prefs'>
										{t('home:menu.preferences')}
									</h2>
									<div className='r-menu-pref'>
										<span>{t('home:menu.appearance')}</span>
										<div className='r-set-opts' role='radiogroup' aria-label={t('home:menu.appearance')}>
											{(
												[
													[Theme.System, t('home:menu.themeSystem')],
													[Theme.Light, t('home:menu.themeLight')],
													[Theme.Dark, t('home:menu.themeDark')],
												] as const
											).map(([v, label]) => (
												<button
													key={v}
													type='button'
													role='radio'
													aria-checked={v === theme}
													data-active={v === theme ? '' : undefined}
													onClick={() => updateTheme(v)}
												>
													{label}
												</button>
											))}
										</div>
									</div>
									<div className='r-menu-pref'>
										<span>
											{t('settings:menu.raidRanking', {
												raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
											})}
										</span>
										<div className='r-set-opts'>
											{RAID_METRICS.map((m) => (
												<button
													key={m}
													type='button'
													data-active={m === raidMetric ? '' : undefined}
													onClick={() => updateRaidMetric(m)}
												>
													{RAID_METRIC_LABEL[m]}
												</button>
											))}
										</div>
									</div>
									<div className='r-menu-pref'>
										<span>{t('settings:menu.bestBuddy')}</span>
										<div className='r-set-opts'>
											<button
												type='button'
												data-active={!bestBuddy ? '' : undefined}
												onClick={() => updateBestBuddy(false)}
											>
												{t('settings:menu.off')}
											</button>
											<button
												type='button'
												data-active={bestBuddy ? '' : undefined}
												onClick={() => updateBestBuddy(true)}
											>
												{t('settings:menu.on')}
											</button>
										</div>
									</div>
									<p className='r-menu-note'>{t('settings:menu.footer')}</p>
								</section>
							</div>

							<footer className='r-menu-foot'>
								<Link to={R.about}>{t('home:footer.about')}</Link>
								<Link to={`${R.about}#privacy`}>{t('home:footer.privacy')}</Link>
								<a href={FEEDBACK_URL} target='_blank' rel='noopener noreferrer'>
									{t('home:footer.issues')} <span aria-hidden='true'>↗</span>
								</a>
							</footer>
						</aside>
					</div>,
					root
				)}
		</>
	);
};

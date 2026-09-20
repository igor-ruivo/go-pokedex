import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBestBuddy } from '../contexts/best-buddy-context';
import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { GameLanguage, useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
// Appearance (light/dark) picker is temporarily disabled — see theme-context.tsx.
import { useDismiss } from '../hooks/useDismiss';
import { SUPPORTED_LOCALE_NAMES, SUPPORTED_LOCALES } from '../i18n';
import { RAID_METRIC_LABEL, RAID_METRICS } from '../lib/raid-metric';

const GAME_LANGS: Array<[GameLanguage, string, string]> = [
	[GameLanguage.en, 'EN', 'English'],
	[GameLanguage.ptbr, 'BR', 'Português (BR)'],
];

/**
 * App-bar language / settings menu. Opens a popover in place instead of routing
 * away, so the page you were reading stays put. The trigger shows the current
 * app-language flag.
 */
export const SettingsMenu = () => {
	const { t } = useTranslation(['settings']);
	const { currentLanguage, currentGameLanguage, updateCurrentLanguage, updateCurrentGameLanguage } = useLanguage();
	const { imageSource, updateImageSource } = useImageSource();
	const { raidMetric, updateRaidMetric } = useRaidMetric();
	const { bestBuddy, updateBestBuddy } = useBestBuddy();
	const [open, setOpen] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	const SPRITES: Array<[ImageSource, string]> = [
		[ImageSource.Official, t('settings:spriteOptions.official')],
		[ImageSource.GO, t('settings:spriteOptions.go')],
		[ImageSource.Shiny, t('settings:spriteOptions.shiny')],
	];

	return (
		<div className='r-setmenu' ref={rootRef}>
			<button
				type='button'
				className='r-icon-btn r-setmenu-trigger'
				aria-label={t('settings:menu.triggerAriaLabel')}
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
			>
				<svg className='r-setmenu-gear' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
					<path d='M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z' />
				</svg>
			</button>

			{open && (
				<div className='r-setmenu-pop' role='dialog' aria-label={t('settings:menu.dialogAriaLabel')}>
					<div className='r-setmenu-grp'>
						<span className='r-setmenu-h'>{t('settings:menu.appLanguage')}</span>
						{/* A button grid tops out well before 16 options — a native
						    select is the same pattern Pokémon GO's own site uses for
						    this exact list of languages. Endonyms (each language's
						    own name for itself, e.g. "Español" not "Spanish") aren't
						    run through t() — the standard convention for a language
						    picker, so a reader can always find their language
						    regardless of what locale the UI is currently in. */}
						<select
							className='r-lang-select'
							aria-label={t('settings:menu.appLanguage')}
							value={currentLanguage}
							onChange={(e) => updateCurrentLanguage(e.target.value as (typeof SUPPORTED_LOCALES)[number])}
						>
							{SUPPORTED_LOCALES.map((locale) => (
								<option key={locale} value={locale}>
									{SUPPORTED_LOCALE_NAMES[locale]}
								</option>
							))}
						</select>
					</div>

					<div className='r-setmenu-grp'>
						<span className='r-setmenu-h'>{t('settings:menu.gameLanguage')}</span>
						<div className='r-set-opts'>
							{GAME_LANGS.map(([v, flag, label]) => (
								<button
									key={String(v)}
									type='button'
									data-active={v === currentGameLanguage ? '' : undefined}
									onClick={() => updateCurrentGameLanguage(v)}
								>
									<span className='r-setmenu-fl'>{flag}</span>
									{label}
								</button>
							))}
						</div>
					</div>

					<button
						type='button'
						className='r-setmenu-more'
						data-on={moreOpen ? '' : undefined}
						aria-expanded={moreOpen}
						onClick={() => setMoreOpen((v) => !v)}
					>
						{t('settings:menu.moreSettings')}
						<span className='r-setmenu-chev' aria-hidden='true'>
							⌄
						</span>
					</button>

					{moreOpen && (
						<>
							<div className='r-setmenu-grp'>
								<span className='r-setmenu-h'>{t('settings:menu.sprites')}</span>
								<div className='r-set-opts'>
									{SPRITES.map(([v, label]) => (
										<button
											key={String(v)}
											type='button'
											data-active={v === imageSource ? '' : undefined}
											onClick={() => updateImageSource(v)}
										>
											{label}
										</button>
									))}
								</div>
							</div>

							<div className='r-setmenu-grp'>
								<span className='r-setmenu-h'>{t('settings:menu.raidRanking')}</span>
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

							<div className='r-setmenu-grp'>
								<span className='r-setmenu-h'>{t('settings:menu.bestBuddy')}</span>
								<div className='r-set-opts'>
									<button
										type='button'
										data-active={!bestBuddy ? '' : undefined}
										onClick={() => updateBestBuddy(false)}
									>
										{t('settings:menu.off')}
									</button>
									<button type='button' data-active={bestBuddy ? '' : undefined} onClick={() => updateBestBuddy(true)}>
										{t('settings:menu.on')}
									</button>
								</div>
							</div>
						</>
					)}

					<p className='r-setmenu-foot'>{t('settings:menu.footer')}</p>
				</div>
			)}
		</div>
	);
};

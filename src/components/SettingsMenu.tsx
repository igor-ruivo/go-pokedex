import { useState } from 'react';

import { useBestBuddy } from '../contexts/best-buddy-context';
import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { GameLanguage, Language, useLanguage } from '../contexts/language-context';
import { useRaidMetric } from '../contexts/raid-metric-context';
// Appearance (light/dark) picker is temporarily disabled — see theme-context.tsx.
import { useDismiss } from '../hooks/useDismiss';
import { RAID_METRIC_LABEL, RAID_METRICS } from '../lib/raid-metric';

// Regional-indicator flag emoji don't render on Windows, so a crisp 2-letter
// ISO badge is the reliable cross-platform "flag".
const APP_LANGS: Array<[Language, string, string]> = [
	[Language.English, 'EN', 'English'],
	[Language.Portuguese, 'PT', 'Português'],
	[Language.Bosnian, 'BS', 'Bosanski'],
];

const GAME_LANGS: Array<[GameLanguage, string, string]> = [
	[GameLanguage.en, 'EN', 'English'],
	[GameLanguage.ptbr, 'BR', 'Português (BR)'],
];

const SPRITES: Array<[ImageSource, string]> = [
	[ImageSource.Official, 'Official'],
	[ImageSource.GO, 'Pokémon GO'],
	[ImageSource.Shiny, 'GO shiny'],
];

/**
 * App-bar language / settings menu. Opens a popover in place instead of routing
 * away, so the page you were reading stays put. The trigger shows the current
 * app-language flag.
 */
export const SettingsMenu = () => {
	const { currentLanguage, currentGameLanguage, updateCurrentLanguage, updateCurrentGameLanguage } = useLanguage();
	const { imageSource, updateImageSource } = useImageSource();
	const { raidMetric, updateRaidMetric } = useRaidMetric();
	const { bestBuddy, updateBestBuddy } = useBestBuddy();
	const [open, setOpen] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	const curFlag = APP_LANGS.find((l) => l[0] === currentLanguage)?.[1] ?? 'EN';

	return (
		<div className='r-setmenu' ref={rootRef}>
			<button
				type='button'
				className='r-icon-btn r-setmenu-trigger'
				aria-label='Language & settings'
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
			>
				<span className='r-setmenu-flag'>{curFlag}</span>
			</button>

			{open && (
				<div className='r-setmenu-pop' role='dialog' aria-label='Settings'>
					<div className='r-setmenu-grp'>
						<span className='r-setmenu-h'>App language</span>
						<div className='r-set-opts'>
							{APP_LANGS.map(([v, flag, label]) => (
								<button
									key={String(v)}
									type='button'
									data-active={v === currentLanguage ? '' : undefined}
									onClick={() => updateCurrentLanguage(v)}
								>
									<span className='r-setmenu-fl'>{flag}</span>
									{label}
								</button>
							))}
						</div>
					</div>

					<div className='r-setmenu-grp'>
						<span className='r-setmenu-h'>Game language</span>
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
						More settings
						<span className='r-setmenu-chev' aria-hidden='true'>
							⌄
						</span>
					</button>

					{moreOpen && (
						<>
							<div className='r-setmenu-grp'>
								<span className='r-setmenu-h'>Sprites</span>
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
								<span className='r-setmenu-h'>Raid ranking</span>
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
								<span className='r-setmenu-h'>Account for Best Buddy</span>
								<div className='r-set-opts'>
									<button
										type='button'
										data-active={!bestBuddy ? '' : undefined}
										onClick={() => updateBestBuddy(false)}
									>
										Off
									</button>
									<button type='button' data-active={bestBuddy ? '' : undefined} onClick={() => updateBestBuddy(true)}>
										On
									</button>
								</div>
							</div>
						</>
					)}

					<p className='r-setmenu-foot'>Saved on this device.</p>
				</div>
			)}
		</div>
	);
};

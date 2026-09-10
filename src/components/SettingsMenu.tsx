import { useState } from 'react';

import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { GameLanguage, Language, useLanguage } from '../contexts/language-context';
import { useDismiss } from '../hooks/useDismiss';

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
					)}

					<p className='r-setmenu-foot'>Saved on this device.</p>
				</div>
			)}
		</div>
	);
};

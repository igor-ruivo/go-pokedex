import { useTranslation } from 'react-i18next';

import { useBestBuddy } from '../contexts/best-buddy-context';
import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { GameLanguage, useLanguage } from '../contexts/language-context';
// Appearance (light/dark) picker is temporarily disabled — see theme-context.tsx.
import { SUPPORTED_LOCALE_NAMES, SUPPORTED_LOCALES } from '../i18n';

type Option<T> = { value: T; label: string; hint?: string };

const OptionRow = <T,>({
	title,
	desc,
	value,
	options,
	onChange,
}: {
	title: string;
	desc: string;
	value: T;
	options: Array<Option<T>>;
	onChange: (v: T) => void;
}) => (
	<div className='r-set-row'>
		<div className='r-set-head'>
			<b>{title}</b>
			<span>{desc}</span>
		</div>
		<div className='r-set-opts' role='radiogroup' aria-label={title}>
			{options.map((o) => (
				<button
					key={String(o.value)}
					type='button'
					role='radio'
					aria-checked={o.value === value}
					data-active={o.value === value ? '' : undefined}
					onClick={() => onChange(o.value)}
				>
					{o.label}
					{o.hint && <i>{o.hint}</i>}
				</button>
			))}
		</div>
	</div>
);

const Settings = () => {
	const { t } = useTranslation(['settings']);
	const { currentLanguage, currentGameLanguage, updateCurrentLanguage, updateCurrentGameLanguage } = useLanguage();
	const { imageSource, updateImageSource } = useImageSource();
	const { bestBuddy, updateBestBuddy } = useBestBuddy();

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>{t('settings:page.title')}</h1>

			<div className='r-card r-set'>
				<div className='r-set-row'>
					<div className='r-set-head'>
						<b>{t('settings:page.appLanguage.title')}</b>
						<span>{t('settings:page.appLanguage.desc')}</span>
					</div>
					{/* 16 languages doesn't fit the button-radiogroup pattern the
					    other rows use below — see SettingsMenu.tsx's picker for the
					    same reasoning. Endonyms aren't run through t(); see that
					    same comment for why. */}
					<select
						className='r-lang-select'
						aria-label={t('settings:page.appLanguage.title')}
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
				<OptionRow<GameLanguage>
					title={t('settings:page.gameLanguage.title')}
					desc={t('settings:page.gameLanguage.desc')}
					value={currentGameLanguage}
					onChange={updateCurrentGameLanguage}
					options={[
						{ value: GameLanguage.en, label: 'English' },
						{ value: GameLanguage.ptbr, label: 'Português (BR)' },
					]}
				/>
				<OptionRow<ImageSource>
					title={t('settings:page.sprites.title')}
					desc={t('settings:page.sprites.desc')}
					value={imageSource}
					onChange={updateImageSource}
					options={[
						{ value: ImageSource.Official, label: t('settings:spriteOptions.official') },
						{ value: ImageSource.GO, label: t('settings:spriteOptions.go') },
						{ value: ImageSource.Shiny, label: t('settings:spriteOptions.shiny') },
					]}
				/>
				<OptionRow<boolean>
					title={t('settings:page.bestBuddy.title')}
					desc={t('settings:page.bestBuddy.desc')}
					value={bestBuddy}
					onChange={updateBestBuddy}
					options={[
						{ value: false, label: t('settings:toggle.off') },
						{ value: true, label: t('settings:toggle.on') },
					]}
				/>
			</div>

			<p className='r-muted' style={{ marginTop: 16, fontSize: 12 }}>
				{t('settings:page.footer')}
			</p>
		</div>
	);
};

export default Settings;

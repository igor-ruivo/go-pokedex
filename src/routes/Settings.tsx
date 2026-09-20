import { useTranslation } from 'react-i18next';

import { LanguagePicker } from '../components/LanguagePicker';
import { useBestBuddy } from '../contexts/best-buddy-context';
import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { GameLanguage, useLanguage } from '../contexts/language-context';
// Appearance (light/dark) picker is temporarily disabled — see theme-context.tsx.
import { SUPPORTED_LOCALE_NAMES, SUPPORTED_LOCALES } from '../i18n';

// Endonyms, not translated — see LanguagePicker's doc for why. All 15
// GameLanguage members are listed here even though GameTranslator.ts search
// keywords are the only thing actually localized per language today —
// dex-server hasn't shipped per-locale Pokémon/move names yet, so picking,
// say, Japanese here only changes search-string keywords for now, not
// species/move names on the rest of the site. That's expected, not a bug —
// see the dex-server work this is waiting on.
const GAME_LANGS: Array<{ value: GameLanguage; label: string }> = [
	{ value: GameLanguage.en, label: SUPPORTED_LOCALE_NAMES.en },
	{ value: GameLanguage.de, label: SUPPORTED_LOCALE_NAMES.de },
	{ value: GameLanguage.es, label: SUPPORTED_LOCALE_NAMES.es },
	{ value: GameLanguage.esMx, label: SUPPORTED_LOCALE_NAMES['es-MX'] },
	{ value: GameLanguage.fr, label: SUPPORTED_LOCALE_NAMES.fr },
	{ value: GameLanguage.hi, label: SUPPORTED_LOCALE_NAMES.hi },
	{ value: GameLanguage.id, label: SUPPORTED_LOCALE_NAMES.id },
	{ value: GameLanguage.it, label: SUPPORTED_LOCALE_NAMES.it },
	{ value: GameLanguage.ptbr, label: 'Português (BR)' },
	{ value: GameLanguage.ja, label: SUPPORTED_LOCALE_NAMES.ja },
	{ value: GameLanguage.ko, label: SUPPORTED_LOCALE_NAMES.ko },
	{ value: GameLanguage.ru, label: SUPPORTED_LOCALE_NAMES.ru },
	{ value: GameLanguage.th, label: SUPPORTED_LOCALE_NAMES.th },
	{ value: GameLanguage.tr, label: SUPPORTED_LOCALE_NAMES.tr },
	{ value: GameLanguage.zhHant, label: SUPPORTED_LOCALE_NAMES['zh-Hant'] },
];

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
					<LanguagePicker
						value={currentLanguage}
						options={SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: SUPPORTED_LOCALE_NAMES[locale] }))}
						onChange={updateCurrentLanguage}
						ariaLabel={t('settings:page.appLanguage.title')}
					/>
				</div>
				<div className='r-set-row'>
					<div className='r-set-head'>
						<b>{t('settings:page.gameLanguage.title')}</b>
						<span>{t('settings:page.gameLanguage.desc')}</span>
					</div>
					<LanguagePicker
						value={currentGameLanguage}
						options={GAME_LANGS}
						onChange={updateCurrentGameLanguage}
						ariaLabel={t('settings:page.gameLanguage.title')}
					/>
				</div>
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

import { useTranslation } from 'react-i18next';

import { LanguagePicker } from '../components/LanguagePicker';
import { useBestBuddy } from '../contexts/best-buddy-context';
import { useLanguage } from '../contexts/language-context';
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
	const { currentLanguage, updateCurrentLanguage } = useLanguage();
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

import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import { GameLanguage, Language, useLanguage } from '../contexts/language-context';
// Appearance (light/dark) picker is temporarily disabled — see theme-context.tsx.

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
	const { currentLanguage, currentGameLanguage, updateCurrentLanguage, updateCurrentGameLanguage } = useLanguage();
	const { imageSource, updateImageSource } = useImageSource();

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>Settings</h1>

			<div className='r-card r-set'>
				<OptionRow<Language>
					title='App language'
					desc='Interface text. English is the default.'
					value={currentLanguage}
					onChange={updateCurrentLanguage}
					options={[
						{ value: Language.English, label: 'English' },
						{ value: Language.Portuguese, label: 'Português' },
						{ value: Language.Bosnian, label: 'Bosanski' },
					]}
				/>
				<OptionRow<GameLanguage>
					title='Game language'
					desc='Pokémon and move names, as they appear in Pokémon GO.'
					value={currentGameLanguage}
					onChange={updateCurrentGameLanguage}
					options={[
						{ value: GameLanguage.en, label: 'English' },
						{ value: GameLanguage.ptbr, label: 'Português (BR)' },
					]}
				/>
				<OptionRow<ImageSource>
					title='Sprites'
					desc='Which artwork to show for every Pokémon.'
					value={imageSource}
					onChange={updateImageSource}
					options={[
						{ value: ImageSource.Official, label: 'Official' },
						{ value: ImageSource.GO, label: 'Pokémon GO' },
						{ value: ImageSource.Shiny, label: 'GO shiny' },
					]}
				/>
			</div>

			<p className='r-muted' style={{ marginTop: 16, fontSize: 12 }}>
				Preferences are stored on this device.
			</p>
		</div>
	);
};

export default Settings;

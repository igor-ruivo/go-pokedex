import { useState } from 'react';

import { useDismiss } from '../hooks/useDismiss';

export interface LanguageOption<T extends string> {
	value: T;
	/** Each language's own name for itself (e.g. "Español", not "Spanish")
	 *  — not run through t(), see the component doc for why. */
	label: string;
}

/**
 * Compact language combobox: a small trigger showing the current option's
 * label, opening an in-app scrollable listbox — not a native `<select>`.
 * Generic over the value type so it fits both the website-UI locale picker
 * (`Locale`, 16 options today) and the in-game/GameLanguage picker (2 options
 * today, headed the same way as dex-server data and GameTranslator.ts grow to
 * cover the same locale list) — same widget, same look, whatever the option
 * count. With enough options, a native select hands off to the OS's own
 * full-screen picker (a wheel on iOS, a bottom sheet on Android), which looks
 * and behaves nothing like the rest of this app's custom-styled UI. This
 * stays inside it, sized to fit a compact popover on both desktop and mobile.
 *
 * No flags: a flag represents a country, not a language, and breaks down
 * immediately for a list like this (English isn't the UK; `es` vs `es-MX`
 * would need two near-identical flags to tell apart). Endonyms are the
 * standard convention instead, same choice Pokémon GO's own site picker
 * makes (see src/i18n/index.ts's comment for that reference), and they aren't
 * run through t() for the same reason: a reader should always be able to find
 * their language regardless of what locale the UI is currently in.
 */
export const LanguagePicker = <T extends string>({
	value,
	options,
	onChange,
	ariaLabel,
	className,
}: {
	value: T;
	options: ReadonlyArray<LanguageOption<T>>;
	onChange: (value: T) => void;
	ariaLabel: string;
	className?: string;
}) => {
	const [open, setOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));
	const current = options.find((o) => o.value === value);

	return (
		<div className={`r-lang-picker${className ? ` ${className}` : ''}`} ref={rootRef}>
			<button
				type='button'
				className='r-lang-trigger'
				aria-haspopup='listbox'
				aria-expanded={open}
				aria-label={ariaLabel}
				onClick={() => setOpen((o) => !o)}
			>
				<span className='r-lang-trigger-value'>{current?.label ?? value}</span>
				<span className='r-lang-chev' aria-hidden='true'>
					⌄
				</span>
			</button>

			{open && (
				<div className='r-lang-pop' role='listbox' aria-label={ariaLabel}>
					{options.map((o) => (
						<button
							key={o.value}
							type='button'
							role='option'
							aria-selected={o.value === value}
							data-active={o.value === value ? '' : undefined}
							onClick={() => {
								onChange(o.value);
								setOpen(false);
							}}
						>
							{o.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

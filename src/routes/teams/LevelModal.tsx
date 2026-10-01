import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../../hooks/useDismiss';
import { isSlotLevel } from '../../lib/team-analysis';

/** How long typing has to pause before the level is applied (each change re-rates the team). */
const APPLY_DELAY_MS = 300;

/**
 * The level of one team member (1 to 50, in steps of 0.5), in a dialog like the Pokémon picker. Left alone, the level is
 * the highest the league's CP cap allows for the IVs; typing one pins it, and a level that puts the Pokémon over the cap
 * is allowed but says so. A valid level is applied as soon as typing pauses, and the page is not dimmed, so the scores in
 * the bar above update while you type. "Reset" goes back to following the cap. (The IVs have their own dialog.)
 */
export const LevelModal = ({
	name,
	level,
	custom,
	cp,
	cpCap,
	onChange,
	onClose,
}: {
	/** The Pokémon's name, for the title. */
	name: string;
	/** The level the member is rated at now. */
	level: number;
	/** It was picked here (otherwise it follows the CP cap). */
	custom: boolean;
	/** The CP the member has now, and the league's cap. */
	cp: number;
	cpCap: number;
	/** The new level, or `undefined` to follow the CP cap again. */
	onChange: (level: number | undefined) => void;
	onClose: () => void;
}) => {
	const { t } = useTranslation(['teams']);
	const title = t('teams:builder.levelTitle', { name });
	const [field, setField] = useState(String(level));
	const rootRef = useDismiss<HTMLDivElement>(true, onClose, { dim: false });
	const inputRef = useRef<HTMLInputElement>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	// What was last applied from here, so the value coming back doesn't overwrite what is being typed.
	const appliedRef = useRef(String(level));

	useEffect(() => {
		inputRef.current?.focus();
		inputRef.current?.select();
	}, []);

	// The level changed from outside (Reset, the page's Reset button): show it.
	const current = String(level);
	useEffect(() => {
		if (current !== appliedRef.current) {
			appliedRef.current = current;
			setField(current);
		}
	}, [current]);

	const typed = field === '' ? NaN : Number(field);
	useEffect(() => {
		if (!isSlotLevel(typed) || field === current) return;
		const id = setTimeout(() => {
			appliedRef.current = field;
			onChangeRef.current(typed);
		}, APPLY_DELAY_MS);
		return () => clearTimeout(id);
	}, [field, typed, current]);

	return (
		<div className='r-tm-picker-backdrop r-tm-ivmodal-backdrop'>
			<div className='r-tm-picker r-tm-ivmodal' role='dialog' aria-modal='true' aria-label={title} ref={rootRef}>
				<div className='r-tm-picker-head'>
					<h2>{title}</h2>
					<button type='button' className='r-icon-btn' aria-label={t('teams:picker.close')} onClick={onClose}>
						×
					</button>
				</div>

				<div className='r-tm-ivedit'>
					<label>
						<span>{t('teams:builder.level')}</span>
						<input
							ref={inputRef}
							value={field}
							inputMode='decimal'
							maxLength={4}
							placeholder='1–50'
							data-invalid={isSlotLevel(typed) ? undefined : ''}
							onFocus={(e) => e.target.select()}
							// A phone's decimal keypad may offer a comma (or a dot) depending on its language: both mean the decimal point.
							onChange={(e) =>
								setField(
									e.target.value
										.replace(/,/g, '.')
										.replace(/[^0-9.]/g, '')
										.slice(0, 4)
								)
							}
							onKeyDown={(e) => {
								if (e.key === 'Enter') onClose();
							}}
						/>
					</label>
				</div>

				<p className='r-tm-ivmodal-cp' data-over={cp > cpCap ? '' : undefined}>
					{cp > cpCap ? t('teams:builder.ivOverCap', { name, cp, cap: cpCap }) : `${t('teams:builder.cp')} ${cp}`}
				</p>

				{custom && (
					<div className='r-tm-ivmodal-actions'>
						<button type='button' className='r-tm-ivedit-reset' onClick={() => onChange(undefined)}>
							{t('teams:builder.reset')}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

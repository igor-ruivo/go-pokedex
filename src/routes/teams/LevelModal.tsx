import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../../hooks/useDismiss';
import { cpAt } from '../../lib/pvp-sim/cp';
import { isSlotLevel, type SlotIvs } from '../../lib/team-analysis';

/**
 * The level of one team member (1 to 50, in steps of 0.5; up to 51 for a Best Buddy), in a dialog like the Pokémon picker. Left alone, the level is
 * the highest the league's CP cap allows for the IVs; typing one pins it, but a level that puts the Pokémon over the cap
 * is refused (it says so and is not applied). Edits stay local until Apply is pressed, and the modal stays open until
 * the parent reflects the changed value. "Reset" goes back to following the cap.
 */
export const LevelModal = ({
	name,
	level,
	custom,
	baseStats,
	ivs,
	cpCap,
	buddy = false,
	optimal = false,
	bestLevel,
	onChange,
	onClose,
}: {
	/** The Pokémon's name, for the title. */
	name: string;
	/** The level the member is rated at now. */
	level: number;
	/** It was picked here (otherwise it follows the CP cap). */
	custom: boolean;
	/** What its CP is made of, and the league's cap. */
	baseStats: { atk: number; def: number; hp: number };
	ivs: SlotIvs;
	cpCap: number;
	/** A Best Buddy: the only kind of Pokémon that can be above level 50 (up to 51). */
	buddy?: boolean;
	/** The level is already the best for this Pokémon's Best Buddy state: there is nothing to reset to (no Reset button). */
	optimal?: boolean;
	/** What Reset goes to: a Best Buddy's best level when it is above 50; absent, back to following the CP cap. */
	bestLevel?: number | undefined;
	/** The new level, or `undefined` to follow the CP cap again. */
	onChange: (level: number | undefined) => void;
	onClose: () => void;
}) => {
	const { t } = useTranslation(['teams']);
	const title = t('teams:builder.levelTitle', { name });
	const [field, setField] = useState(String(level));
	const [applying, setApplying] = useState<{ value: number | undefined } | null>(null);
	const closeRef = useRef(onClose);
	closeRef.current = onClose;
	const rootRef = useDismiss<HTMLDivElement>(
		true,
		() => {
			if (!applying) onClose();
		},
		{ dim: false }
	);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
		inputRef.current?.select();
	}, []);

	const current = String(level);
	useEffect(() => {
		if (!applying) {
			setField(current);
			return;
		}
		const persisted = applying.value === undefined ? !custom : current === String(applying.value);
		if (persisted) {
			setApplying(null);
			closeRef.current();
		}
	}, [applying, current, custom]);

	const typed = field === '' ? NaN : Number(field);
	const typedCp = isSlotLevel(typed) ? cpAt(baseStats, ivs, typed) : undefined;
	const overCap = typedCp !== undefined && typedCp > cpCap;
	const maxLevel = buddy ? 51 : 50;
	// 50.5 and 51 exist, but only for a Best Buddy; anything above 51 is simply not a level (no message about Best Buddy).
	const needsBuddy = !buddy && isSlotLevel(typed) && typed > 50;
	const canApply = isSlotLevel(typed) && !needsBuddy && !overCap && field !== current && !applying;
	const apply = (next: number | undefined) => {
		setApplying({ value: next });
		onChange(next);
	};

	return (
		<div className='r-tm-picker-backdrop r-tm-ivmodal-backdrop'>
			<div className='r-tm-picker r-tm-ivmodal' role='dialog' aria-modal='true' aria-label={title} ref={rootRef}>
				<div className='r-tm-picker-head'>
					<h2>{title}</h2>
					<button
						type='button'
						className='r-icon-btn'
						aria-label={t('teams:picker.close')}
						disabled={!!applying}
						onClick={onClose}
					>
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
							placeholder={`1–${maxLevel}`}
							data-invalid={isSlotLevel(typed) && !needsBuddy && !overCap ? undefined : ''}
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
								if (e.key === 'Enter' && canApply) apply(typed);
							}}
						/>
					</label>
				</div>

				<p className='r-tm-ivmodal-cp' data-over={overCap || needsBuddy ? '' : undefined}>
					{overCap
						? t('teams:builder.ivOverCap', { name, cp: typedCp, cap: cpCap })
						: needsBuddy
							? t('teams:builder.levelNeedsBuddy')
							: `${t('teams:builder.cp')} ${typedCp ?? cpAt(baseStats, ivs, level)}`}
				</p>

				<div className='r-tm-ivmodal-actions'>
					{custom && !optimal && (
						<button
							type='button'
							className='r-tm-ivedit-reset'
							disabled={!!applying}
							onClick={() => apply(bestLevel)}
						>
							{t('teams:builder.reset')}
						</button>
					)}
					<button type='button' className='r-tm-btn' disabled={!canApply} onClick={() => apply(typed)}>
						{t('teams:builder.apply')}
					</button>
				</div>
			</div>
		</div>
	);
};

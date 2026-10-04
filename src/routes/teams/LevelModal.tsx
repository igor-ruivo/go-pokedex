import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../../hooks/useDismiss';
import { cpAt } from '../../lib/pvp-sim/cp';
import { isSlotLevel, type SlotIvs } from '../../lib/team-analysis';
import { levelInputState } from '../../lib/team-build';

/**
 * The level of one team member (1 to 50, in steps of 0.5; more with a Best Buddy or a Super Max Mega), in a dialog like the
 * Pokémon picker. Edits stay local until Apply is pressed, and nothing about the league is checked while typing: a level that
 * puts the Pokémon over the CP cap is applied like any other, and the card shows its CP in red. Only a level the Pokémon
 * can't have at all (past what its statuses give) can't be applied. The modal stays open until the parent reflects the changed
 * value. Putting the level (and IVs) back to the best is the card's own Reset.
 */
export const LevelModal = ({
	name,
	level,
	baseStats,
	ivs,
	maxLevel,
	buddyMaxLevel,
	onChange,
	onClose,
}: {
	/** The Pokémon's name, for the title. */
	name: string;
	/** The level the member is rated at now. */
	level: number;
	/** What its CP is made of. */
	baseStats: { atk: number; def: number; hp: number };
	ivs: SlotIvs;
	/** The highest level that can be typed for this Pokémon. */
	maxLevel: number;
	/** The highest it could be if it were also a Best Buddy: a level between the two asks for it (see the message). */
	buddyMaxLevel: number;
	onChange: (level: number) => void;
	onClose: () => void;
}) => {
	const { t } = useTranslation(['teams']);
	const title = t('teams:builder.levelTitle', { name });
	const [field, setField] = useState(String(level));
	const [applying, setApplying] = useState<number | null>(null);
	const closeRef = useRef(onClose);
	closeRef.current = onClose;
	const rootRef = useDismiss<HTMLDivElement>(
		true,
		() => {
			if (applying === null) onClose();
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
		if (applying === null) {
			setField(current);
			return;
		}
		if (current === String(applying)) {
			setApplying(null);
			closeRef.current();
		}
	}, [applying, current]);

	const typed = field === '' ? NaN : Number(field);
	const typedCp = isSlotLevel(typed) ? cpAt(baseStats, ivs, typed) : undefined;
	// Past what the Pokémon reaches without it, only a Best Buddy can go (one level further); beyond what even a Best Buddy
	// reaches it is simply not a level (no message about Best Buddy).
	const { valid, needsBuddy } = levelInputState({ typed, maxLevel, buddyMaxLevel });
	const canApply = valid && field !== current && applying === null;
	const apply = () => {
		if (!valid) return;
		setApplying(typed);
		onChange(typed);
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
						disabled={applying !== null}
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
							data-invalid={valid ? undefined : ''}
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
								if (e.key === 'Enter' && canApply) apply();
							}}
						/>
					</label>
				</div>

				<p className='r-tm-ivmodal-cp' data-over={needsBuddy ? '' : undefined}>
					{needsBuddy
						? t('teams:builder.levelNeedsBuddy', { max: maxLevel })
						: `${t('teams:builder.cp')} ${typedCp ?? cpAt(baseStats, ivs, level)}`}
				</p>

				<div className='r-tm-ivmodal-actions'>
					<button type='button' className='r-tm-btn' disabled={!canApply} onClick={apply}>
						{t('teams:builder.apply')}
					</button>
				</div>
			</div>
		</div>
	);
};

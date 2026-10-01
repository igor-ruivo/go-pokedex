import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../../hooks/useDismiss';
import { cpAt } from '../../lib/pvp-sim/cp';
import { isSlotIvs, type SlotIvs } from '../../lib/team-analysis';

/** How long typing has to pause before the IVs are applied (each change re-rates the team). */
const APPLY_DELAY_MS = 300;

/**
 * The IVs of one team member (attack, defense, HP — each 0 to 15), in a dialog like the Pokémon picker. The page is
 * not dimmed behind it, and a complete, valid set is applied as soon as typing pauses, so the scores in the bar above
 * update while you type. "Reset" puts the member back to the league's best spread. (The level has its own dialog.)
 */
export const IvModal = ({
	name,
	value,
	custom,
	level,
	pinnedLevel,
	baseStats,
	cpCap,
	onChange,
	onClose,
}: {
	/** The Pokémon's name, for the title. */
	name: string;
	/** The IVs the member is rated with now. */
	value: SlotIvs;
	/** They were picked here (not the league's best spread). */
	custom: boolean;
	/** The level the member is rated at, whether it was picked (`pinnedLevel`) or follows the CP cap. */
	level: number;
	pinnedLevel: number | undefined;
	/** What its CP is made of, and the league's cap: IVs that put a picked level over it are refused. */
	baseStats: { atk: number; def: number; hp: number };
	cpCap: number;
	/** The new IVs, or `undefined` for the league's best. */
	onChange: (ivs: SlotIvs | undefined) => void;
	onClose: () => void;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail']);
	const title = t('teams:builder.ivTitle', { name });
	const labels = [
		t('pokemonDetail:hero.stats.atk'),
		t('pokemonDetail:hero.stats.def'),
		t('pokemonDetail:hero.stats.hp'),
	];
	const [fields, setFields] = useState(() => value.map(String));
	const rootRef = useDismiss<HTMLDivElement>(true, onClose, { dim: false });
	const firstRef = useRef<HTMLInputElement>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	// What was last applied from here, so the value coming back doesn't overwrite what is being typed.
	const appliedRef = useRef(value.join('.'));

	useEffect(() => {
		firstRef.current?.focus();
		firstRef.current?.select();
	}, []);

	// The member's IVs changed from outside (Reset, the page's Reset button): show them.
	const current = value.join('.');
	useEffect(() => {
		if (current !== appliedRef.current) {
			appliedRef.current = current;
			setFields(current.split('.'));
		}
	}, [current]);

	const text = fields.join('.');
	const typedIvs = text.split('.').map((field) => (field === '' ? NaN : Number(field)));
	// A level that follows the CP cap always fits; a picked one has to still fit with the new IVs.
	const typedCp = pinnedLevel !== undefined && isSlotIvs(typedIvs) ? cpAt(baseStats, typedIvs, level) : undefined;
	const overCap = typedCp !== undefined && typedCp > cpCap;
	useEffect(() => {
		const next = typedIvs;
		if (!isSlotIvs(next) || overCap || text === current) return;
		const id = setTimeout(() => {
			appliedRef.current = text;
			onChangeRef.current(next);
		}, APPLY_DELAY_MS);
		return () => clearTimeout(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [text, overCap, current]);

	const parsed = fields.map((field) => (field === '' ? NaN : Number(field)));

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
					{labels.map((label, i) => (
						<label key={label}>
							<span>{label}</span>
							<input
								ref={i === 0 ? firstRef : undefined}
								value={fields[i]}
								inputMode='numeric'
								pattern='[0-9]*'
								maxLength={2}
								placeholder='0–15'
								data-invalid={Number.isInteger(parsed[i]) && parsed[i] >= 0 && parsed[i] <= 15 ? undefined : ''}
								onFocus={(e) => e.target.select()}
								onChange={(e) => {
									const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
									setFields((prev) => prev.map((old, k) => (k === i ? digits : old)));
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') onClose();
								}}
							/>
						</label>
					))}
				</div>

				{overCap && (
					<p className='r-tm-ivmodal-cp' data-over=''>
						{t('teams:builder.ivOverCap', { name, cp: typedCp, cap: cpCap })}
					</p>
				)}

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

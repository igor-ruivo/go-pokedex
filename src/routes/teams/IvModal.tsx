import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../../hooks/useDismiss';
import { cpAt } from '../../lib/pvp-sim/cp';
import { isSlotIvs, type SlotIvs } from '../../lib/team-analysis';

/**
 * The IVs of one team member (attack, defense, HP — each 0 to 15), in a dialog like the Pokémon picker. The page is
 * not dimmed behind it. Edits stay local until Apply is pressed; the modal stays open until the changed value is
 * reflected back by the parent. "Reset" puts the member back to the league's best spread.
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
	const [applying, setApplying] = useState<{ value: SlotIvs | undefined } | null>(null);
	const closeRef = useRef(onClose);
	closeRef.current = onClose;
	const rootRef = useDismiss<HTMLDivElement>(
		true,
		() => {
			if (!applying) onClose();
		},
		{ dim: false }
	);
	const firstRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		firstRef.current?.focus();
		firstRef.current?.select();
	}, []);

	const current = value.join('.');
	useEffect(() => {
		if (!applying) {
			setFields(current.split('.'));
			return;
		}
		const persisted = applying.value === undefined ? !custom : current === applying.value.join('.');
		if (persisted) {
			setApplying(null);
			closeRef.current();
		}
	}, [applying, current, custom]);

	const text = fields.join('.');
	const typedIvs = text.split('.').map((field) => (field === '' ? NaN : Number(field)));
	// A level that follows the CP cap always fits; a picked one has to still fit with the new IVs.
	const typedCp = pinnedLevel !== undefined && isSlotIvs(typedIvs) ? cpAt(baseStats, typedIvs, level) : undefined;
	const overCap = typedCp !== undefined && typedCp > cpCap;
	const parsed = fields.map((field) => (field === '' ? NaN : Number(field)));
	const canApply = isSlotIvs(typedIvs) && !overCap && text !== current && !applying;
	const apply = (next: SlotIvs | undefined) => {
		setApplying({ value: next });
		onChange(next);
	};
	const applyTyped = () => {
		if (isSlotIvs(typedIvs) && !overCap) apply(typedIvs);
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
									if (e.key === 'Enter' && canApply) applyTyped();
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

				<div className='r-tm-ivmodal-actions'>
					{custom && (
						<button type='button' className='r-tm-ivedit-reset' disabled={!!applying} onClick={() => apply(undefined)}>
							{t('teams:builder.reset')}
						</button>
					)}
					<button type='button' className='r-tm-btn' disabled={!canApply} onClick={applyTyped}>
						{t('teams:builder.apply')}
					</button>
				</div>
			</div>
		</div>
	);
};

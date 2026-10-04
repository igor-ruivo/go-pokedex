import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../../hooks/useDismiss';
import { isSlotIvs, type SlotIvs } from '../../lib/team-analysis';

/**
 * The IVs of one team member (attack, defense, HP — each 0 to 15), in a dialog like the Pokémon picker. The page is not
 * dimmed behind it. Edits stay local until Apply is pressed, and nothing about the league is checked while typing: IVs that
 * put the Pokémon over the CP cap are applied like any other, and the card shows its CP in red. The modal stays open until
 * the parent reflects the changed value. Putting the IVs (and level) back to the best is the card's own Reset.
 */
export const IvModal = ({
	name,
	value,
	level,
	onChange,
	onClose,
}: {
	/** The Pokémon's name, for the title. */
	name: string;
	/** The IVs the member is rated with now. */
	value: SlotIvs;
	/** The level the member is rated at now, whether it was picked or follows the CP cap: typed IVs pin it. */
	level: number;
	/** The new IVs. `keepLevel`: typed IVs pin the level the member has now. */
	onChange: (ivs: SlotIvs, keepLevel: number) => void;
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
	const [applying, setApplying] = useState<SlotIvs | null>(null);
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
		if (current === applying.join('.')) {
			setApplying(null);
			closeRef.current();
		}
	}, [applying, current]);

	const text = fields.join('.');
	const typedIvs = text.split('.').map((field) => (field === '' ? NaN : Number(field)));
	const canApply = isSlotIvs(typedIvs) && text !== current && !applying;
	const apply = () => {
		if (!isSlotIvs(typedIvs)) return;
		setApplying(typedIvs);
		onChange(typedIvs, level);
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
								onFocus={(e) => e.target.select()}
								onChange={(e) => {
									const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
									setFields((prev) => prev.map((old, k) => (k === i ? digits : old)));
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && canApply) apply();
								}}
							/>
						</label>
					))}
				</div>

				<div className='r-tm-ivmodal-actions'>
					<button type='button' className='r-tm-btn' disabled={!canApply} onClick={apply}>
						{t('teams:builder.apply')}
					</button>
				</div>
			</div>
		</div>
	);
};

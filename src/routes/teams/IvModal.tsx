import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../../hooks/useDismiss';
import { isSlotIvs, type SlotIvs } from '../../lib/team-analysis';

/**
 * The IVs of one team member (attack, defense, HP, each 0 to 15).
 * Edits stay local until Apply is pressed.
 */
export const IvModal = ({
	name,
	value,
	onChange,
	onClose,
}: {
	name: string;
	value: SlotIvs;
	onChange: (ivs: SlotIvs) => void;
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

	const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

	useEffect(() => {
		inputRefs.current[0]?.focus();
		inputRefs.current[0]?.select();
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

	const typedIvs = fields.map((field) => (field === '' ? NaN : Number(field)));
	const canApply = isSlotIvs(typedIvs) && !applying;

	const apply = () => {
		if (!isSlotIvs(typedIvs)) return;
		setApplying(typedIvs);
		onChange(typedIvs);
	};

	const updateField = (index: number, digits: string) => {
		setFields((prev) => prev.map((old, k) => (k === index ? digits : old)));
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
								ref={(el) => {
									inputRefs.current[i] = el;
								}}
								value={fields[i]}
								inputMode='numeric'
								pattern='[0-9]*'
								maxLength={2}
								placeholder='0–15'
								onFocus={(e) => e.target.select()}
								onChange={(e) => updateField(i, e.currentTarget.value.replace(/\D/g, '').slice(0, 2))}
								// Two digits (or a zero) can't be extended into a valid IV: on to the next stat — the focus moves, the page does not
								// scroll. Read on `input`, not `change`: typing a 0 over a selected 0 leaves the value as it was, and React raises no
								// change for that.
								onInput={(e) => {
									const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, 2);
									if (digits.length === 2 || digits === '0') inputRefs.current[i + 1]?.focus({ preventScroll: true });
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

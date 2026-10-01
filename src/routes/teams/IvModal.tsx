import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismiss } from '../../hooks/useDismiss';
import { isSlotIvs, type SlotIvs } from '../../lib/team-analysis';

/**
 * The IVs of one team member (attack, defense, HP — each 0 to 15), in a dialog like the Pokémon picker. Nothing
 * changes until "Apply" (each change re-rates the team); "Best IVs" puts the member back to the league's best spread.
 */
export const IvModal = ({
	name,
	value,
	custom,
	onApply,
	onClose,
}: {
	/** The Pokémon's name, for the title. */
	name: string;
	/** The IVs the member is rated with now. */
	value: SlotIvs;
	/** They were picked here (not the league's best spread). */
	custom: boolean;
	/** The new IVs, or `undefined` for the league's best. */
	onApply: (ivs: SlotIvs | undefined) => void;
	onClose: () => void;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail']);
	const title = t('teams:builder.ivTitle', { name });
	const labels = [t('pokemonDetail:hero.stats.atk'), t('pokemonDetail:hero.stats.def'), t('pokemonDetail:hero.stats.hp')];
	const [fields, setFields] = useState(() => value.map(String));
	const rootRef = useDismiss<HTMLFormElement>(true, onClose);
	const firstRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		firstRef.current?.focus();
		firstRef.current?.select();
	}, []);

	const parsed = fields.map((field) => (field === '' ? NaN : Number(field)));
	const valid = isSlotIvs(parsed);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (isSlotIvs(parsed)) onApply(parsed);
	};

	return (
		<div className='r-tm-picker-backdrop'>
			<form
				className='r-tm-picker r-tm-ivmodal'
				role='dialog'
				aria-modal='true'
				aria-label={title}
				ref={rootRef}
				onSubmit={submit}
			>
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
							/>
						</label>
					))}
				</div>

				<div className='r-tm-ivmodal-actions'>
					{custom && (
						<button type='button' className='r-tm-ivedit-reset' onClick={() => onApply(undefined)}>
							{t('teams:builder.ivReset')}
						</button>
					)}
					<button type='submit' className='r-tm-ivmodal-apply' disabled={!valid}>
						{t('teams:builder.ivApply')}
					</button>
				</div>
			</form>
		</div>
	);
};

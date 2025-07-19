import './AppraisalBar.scss';

import { Slider } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '../contexts/language-context';
import translator, { TranslatorKeys } from '../utils/Translator';

enum Stat {
	Attack,
	Defense,
	HP,
}

interface IAppraisalBarProps {
	attack: number;
	setAttack: (_: React.SetStateAction<number>) => void;
	defense: number;
	setDefense: (_: React.SetStateAction<number>) => void;
	hp: number;
	setHP: (_: React.SetStateAction<number>) => void;
}

const AppraisalBar = ({
	attack,
	setAttack,
	defense,
	setDefense,
	hp,
	setHP,
}: IAppraisalBarProps) => {
	const [debouncingAttack, setDebouncingAttack] = useState(attack);
	const [debouncingDefense, setDebouncingDefense] = useState(defense);
	const [debouncingHP, setDebouncingHP] = useState(hp);
	const { currentLanguage } = useLanguage();

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setAttack(Math.ceil(debouncingAttack));
		}, 200);
		return () => clearTimeout(timeoutId);
	}, [debouncingAttack, setAttack]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setDefense(Math.ceil(debouncingDefense));
		}, 200);
		return () => clearTimeout(timeoutId);
	}, [debouncingDefense, setDefense]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setHP(Math.ceil(debouncingHP));
		}, 200);
		return () => clearTimeout(timeoutId);
	}, [debouncingHP, setHP]);

	const handleCellClick = useCallback(
		(stat: Stat, cellIndex: number) => {
			switch (stat) {
				case Stat.Attack:
					setDebouncingAttack(cellIndex);
					break;
				case Stat.Defense:
					setDebouncingDefense(cellIndex);
					break;
				case Stat.HP:
					setDebouncingHP(cellIndex);
					break;
			}
		},
		[setDebouncingAttack, setDebouncingDefense, setDebouncingHP]
	);

	const handleCellKeyDown = useCallback(
		(stat: Stat, cellIndex: number) =>
			(e: React.KeyboardEvent<HTMLDivElement>) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleCellClick(stat, cellIndex);
				}
			},
		[handleCellClick]
	);

	const handleCellTouch = useCallback(
		(stat: Stat, cellIndex: number) =>
			(e: React.TouchEvent<HTMLDivElement>) => {
				e.preventDefault();
				handleCellClick(stat, cellIndex);
			},
		[handleCellClick]
	);

	const renderStatBar = useCallback(
		(stat: Stat, value: number) => {
			const cells: Array<React.ReactElement> = [];
			for (let i = 0; i < 15; i++) {
				const isActive = i < value;
				const isEnd = i === value - 1 || i === 14;

				const cellClass = ['bar', isActive && 'active hover', isEnd && 'end']
					.filter(Boolean)
					.join(' ');

				cells.push(
					<div
						key={i}
						className={cellClass}
						role='button'
						tabIndex={0}
						aria-pressed={i < value}
						aria-label={`${translator(
							stat === Stat.Attack
								? TranslatorKeys.Attack
								: stat === Stat.Defense
									? TranslatorKeys.Defense
									: TranslatorKeys.HP,
							currentLanguage
						)} ${i + 1}`}
						onClick={() => handleCellClick(stat, i)}
						onKeyDown={handleCellKeyDown(stat, i)}
						onTouchStart={handleCellTouch(stat, i)}
						style={{ outline: 'none' }}
					></div>
				);
			}

			const statBarClass = value === 15 ? 'stat-bar max' : 'stat-bar';

			const statToLang = (stat: Stat) => {
				switch (stat) {
					case Stat.Attack:
						return translator(TranslatorKeys.Attack, currentLanguage);
					case Stat.Defense:
						return translator(TranslatorKeys.Defense, currentLanguage);
					case Stat.HP:
						return translator(TranslatorKeys.HP, currentLanguage);
				}
			};

			return (
				<div className='stat'>
					<h4>
						<div className='stat-current-value'>{statToLang(stat)}</div>
						<span>{value}</span>
					</h4>
					<div className='appraisal-container'>
						<div className='appraisal-slider'>
							<Slider
								size='small'
								aria-label={Stat[stat] + '-slider'}
								onChange={(_event, newValue) => handleCellClick(stat, newValue)}
								min={0}
								max={15}
								step={0.01}
								value={value}
							/>
						</div>
						<div className='appraisal-component'>
							<div className={statBarClass}>{cells}</div>
						</div>
					</div>
				</div>
			);
		},
		[handleCellClick, handleCellKeyDown, handleCellTouch, currentLanguage]
	);

	return (
		<div className='item default-padding appraisal-combo'>
			<div className='pvp-entry with-border fitting-content smooth'>
				<strong>{translator(TranslatorKeys.PickIVs, currentLanguage)}</strong>
			</div>
			<div className='appraisal item vertical-default-padding'>
				{renderStatBar(Stat.Attack, Math.ceil(debouncingAttack))}
				{renderStatBar(Stat.Defense, Math.ceil(debouncingDefense))}
				{renderStatBar(Stat.HP, Math.ceil(debouncingHP))}
			</div>
		</div>
	);
};

export default AppraisalBar;

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../contexts/language-context';
import { useDismiss } from '../hooks/useDismiss';
import { leagueColor, leagueIcon, leagueTitle } from '../lib/league-visuals';
import { extraLeagues, useLeagueDefinitions } from '../queries/leagues';

interface CustomLeaguePickerProps {
	/** The currently-selected league id — the button reads as "on" when it's one of the custom cups. */
	activeId: string;
	onSelect: (id: string) => void;
}

/**
 * One button standing in for every rotating/custom cup: it opens a list of the
 * cups that are active right now and picks one, the same way a chip in
 * `LeaguePicker` picks Great/Ultra/Master/Raid. While a cup is selected the
 * button shows that cup instead of the generic label.
 */
export const CustomLeaguePicker = ({ activeId, onSelect }: CustomLeaguePickerProps) => {
	const { t } = useTranslation(['common']);
	const { currentGameLanguage: gl } = useLanguage();
	const { leagues } = useLeagueDefinitions();
	const [open, setOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	const cups = extraLeagues(leagues);
	const active = cups.find((l) => l.id === activeId);
	const activeIcon = active ? leagueIcon(active.id) : undefined;

	return (
		<div className='r-lgcups' ref={rootRef}>
			<button
				type='button'
				className='r-lgcups-btn'
				data-active={!!active}
				style={active ? { ['--lg-c' as string]: leagueColor(active.id) } : undefined}
				aria-expanded={open}
				aria-haspopup='listbox'
				aria-label={t('common:customLeagues.ariaLabel')}
				onClick={() => setOpen((o) => !o)}
			>
				{active ? (
					activeIcon && <img src={activeIcon} alt='' width={18} height={18} aria-hidden='true' />
				) : (
					<>
						{/* "view columns" glyph — a table frame split into three columns, the middle one highlighted. */}
						<svg
							className='r-lgcups-ic'
							viewBox='0 0 24 24'
							width='16'
							height='16'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							aria-hidden='true'
						>
							<rect x='3' y='4' width='18' height='16' rx='2.5' />
							<rect x='9' y='4' width='6' height='16' fill='currentColor' fillOpacity='0.3' stroke='none' />
							<path d='M9 4v16M15 4v16' strokeLinecap='round' />
						</svg>
							</>
				)}
				<span>{active ? leagueTitle(active, gl).short : t('common:customLeagues.button')}</span>
				<svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
					<path d='M6 9l6 6 6-6' strokeLinecap='round' strokeLinejoin='round' />
				</svg>
			</button>

			{open && (
				<div className='r-lgcups-pop' role='listbox' aria-label={t('common:customLeagues.ariaLabel')}>
					{cups.length === 0 ? (
						<p className='r-lgcups-empty'>{t('common:customLeagues.empty')}</p>
					) : (
						cups.map((l) => {
							const icon = leagueIcon(l.id);
							const selected = l.id === activeId;
							return (
								<button
									key={l.id}
									type='button'
									role='option'
									aria-selected={selected}
									className='r-lgcups-opt'
									data-active={selected}
									onClick={() => {
										setOpen(false);
										onSelect(l.id);
									}}
								>
									{icon && <img src={icon} alt='' width={18} height={18} aria-hidden='true' />}
									<span>{leagueTitle(l, gl).full}</span>
								</button>
							);
						})
					)}
				</div>
			)}
		</div>
	);
};

import './LeaguePicker.scss';

import { useLanguage } from '../contexts/language-context';
import { LeagueType } from '../hooks/useLeague';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';

interface ILeaguePickerProps {
	league: LeagueType;
	handleSetLeague: (newLeague: LeagueType) => void;
}

const LeaguePicker = ({ league, handleSetLeague }: ILeaguePickerProps) => {
	const { currentGameLanguage } = useLanguage();
	const renderCustom = false;

	const handleKeyDown =
		(leagueType: LeagueType) => (e: React.KeyboardEvent<HTMLDivElement>) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleSetLeague(leagueType);
			}
		};

	return (
		<nav className='navigation-header ivs-nav extra-gap'>
			<ul>
				<li>
					<div
						role='button'
						tabIndex={0}
						onClick={() => handleSetLeague(LeagueType.GREAT_LEAGUE)}
						onKeyDown={handleKeyDown(LeagueType.GREAT_LEAGUE)}
						className={
							'header-tab league-picker selectable ' +
							(league === LeagueType.GREAT_LEAGUE ? 'soft' : 'baby-soft')
						}
						aria-pressed={league === LeagueType.GREAT_LEAGUE}
					>
						<img
							height='24'
							width='24'
							src={`/images/leagues/great.png`}
							alt='Great League'
						/>
						{league === LeagueType.GREAT_LEAGUE && (
							<span>
								{gameTranslator(GameTranslatorKeys.Great, currentGameLanguage)}
							</span>
						)}
					</div>
				</li>
				<li>
					<div
						role='button'
						tabIndex={0}
						onClick={() => handleSetLeague(LeagueType.ULTRA_LEAGUE)}
						onKeyDown={handleKeyDown(LeagueType.ULTRA_LEAGUE)}
						className={
							'header-tab league-picker selectable ' +
							(league === LeagueType.ULTRA_LEAGUE ? 'soft' : 'baby-soft')
						}
						aria-pressed={league === LeagueType.ULTRA_LEAGUE}
					>
						<img
							height='24'
							width='24'
							src={`/images/leagues/ultra.png`}
							alt='Ultra League'
						/>
						{league === LeagueType.ULTRA_LEAGUE && <span>Ultra</span>}
					</div>
				</li>
				<li>
					<div
						role='button'
						tabIndex={0}
						onClick={() => handleSetLeague(LeagueType.MASTER_LEAGUE)}
						onKeyDown={handleKeyDown(LeagueType.MASTER_LEAGUE)}
						className={
							'header-tab league-picker selectable ' +
							(league === LeagueType.MASTER_LEAGUE ? 'soft' : 'baby-soft')
						}
						aria-pressed={league === LeagueType.MASTER_LEAGUE}
					>
						<img
							height='24'
							width='24'
							src={`/images/leagues/master.png`}
							alt='Master League'
						/>
						{league === LeagueType.MASTER_LEAGUE && (
							<span>
								{gameTranslator(GameTranslatorKeys.Master, currentGameLanguage)}
							</span>
						)}
					</div>
				</li>
				{renderCustom && (
					<li>
						<div
							role='button'
							tabIndex={0}
							onClick={() => handleSetLeague(LeagueType.CUSTOM_CUP)}
							onKeyDown={handleKeyDown(LeagueType.CUSTOM_CUP)}
							className={
								'header-tab league-picker selectable ' +
								(league === LeagueType.CUSTOM_CUP ? 'soft' : 'baby-soft')
							}
							aria-pressed={league === LeagueType.CUSTOM_CUP}
						>
							<img
								height='24'
								width='24'
								src={`/images/leagues/fantasy-cup.png`}
								alt='Fantasy Cup'
							/>
							{league === LeagueType.CUSTOM_CUP && (
								<span className='league-tooltip'>
									{gameTranslator(
										GameTranslatorKeys.Fantasy,
										currentGameLanguage
									)}
								</span>
							)}
						</div>
					</li>
				)}
				<li>
					<div
						role='button'
						tabIndex={0}
						onClick={() => handleSetLeague(LeagueType.RAID)}
						onKeyDown={handleKeyDown(LeagueType.RAID)}
						className={
							'header-tab league-picker selectable ' +
							(league === LeagueType.RAID ? 'soft' : 'baby-soft')
						}
						aria-pressed={league === LeagueType.RAID}
					>
						<div className='img-padding raid-img-with-contrast'>
							<img
								height='20'
								width='20'
								src={`/images/tx_raid_coin.png`}
								alt='Raids'
							/>
						</div>
						{league === LeagueType.RAID && (
							<span className='league-tooltip'>
								{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}
							</span>
						)}
					</div>
				</li>
			</ul>
		</nav>
	);
};

export default LeaguePicker;

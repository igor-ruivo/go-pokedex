import './pokemon.scss';
import '../components/PokemonImage.scss';
import './calendar.scss';
import './calendar2.scss';

import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import Eggs from '../components/Eggs';
import Events from '../components/Events';
import LoadingRenderer from '../components/LoadingRenderer';
import PokemonHeader from '../components/PokemonHeader';
import Raids from '../components/Raids';
import Rockets from '../components/Rockets';
import Spawns from '../components/Spawns';
import { useLanguage } from '../contexts/language-context';
import { type CalendarTab, routes, useCurrentView } from '../hooks/useCurrentView';
import { usePokemon } from '../queries/pokemon';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import translator, { TranslatorKeys } from '../utils/Translator';

const Calendar2 = () => {
	const { fetchCompleted, errors } = usePokemon();
	const { currentLanguage, currentGameLanguage } = useLanguage();
	const view = useCurrentView();
	const tab: CalendarTab = view.kind === 'calendar' ? view.tab : 'events';

	const imgRes = useMemo(
		() =>
			tab === 'bosses'
				? 'raid-no-bg'
				: tab === 'spawns'
					? 'wild-no-bg'
					: tab === 'eggs'
						? 'eggs-no-bg'
						: tab === 'rockets'
							? 'rocket-no-bg'
							: 'calendar-no-bg',
		[tab]
	);

	return (
		<main className='layout'>
			<div className='pokemon'>
				<div className='pokemon-content'>
					<LoadingRenderer errors={errors} completed={fetchCompleted}>
						{() => (
							<div className='content'>
								<PokemonHeader
									pokemonName={
										tab === 'bosses'
											? gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)
											: tab === 'spawns'
												? translator(TranslatorKeys.Spawns, currentLanguage)
												: tab === 'eggs'
													? translator(TranslatorKeys.Eggs, currentLanguage)
													: tab === 'rockets'
														? translator(TranslatorKeys.Rockets, currentLanguage)
														: translator(TranslatorKeys.Events, currentLanguage)
									}
									type1={undefined}
									type2={undefined}
									defaultTextColor
									defaultBannerColor
								/>
								<div className='pokemon'>
									{fetchCompleted && (
										<div className='item with-small-margin-top events-header-image-container'>
											<img alt='AI' src={`/images/ai/${imgRes}.png`} />
										</div>
									)}

									<nav className='navigation-header normal-text'>
										<ul>
											<li>
												<Link
													to={routes.calendar('events')}
													className={'header-tab no-full-border ' + (tab === 'events' ? 'selected' : '')}
												>
													<span>{translator(TranslatorKeys.Events, currentLanguage)}</span>
												</Link>
											</li>
											<li>
												<Link
													to={routes.calendar('bosses')}
													className={'header-tab no-full-border ' + (tab === 'bosses' ? 'selected' : '')}
												>
													<span>{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}</span>
												</Link>
											</li>
											<li>
												<Link
													to={routes.calendar('spawns')}
													className={'header-tab no-full-border ' + (tab === 'spawns' ? 'selected' : '')}
												>
													<span>{translator(TranslatorKeys.Spawns, currentLanguage)}</span>
												</Link>
											</li>
											<li>
												<Link
													to={routes.calendar('rockets')}
													className={'header-tab no-full-border ' + (tab === 'rockets' ? 'selected' : '')}
												>
													<span>{translator(TranslatorKeys.Rockets, currentLanguage)}</span>
												</Link>
											</li>
											<li>
												<Link
													to={routes.calendar('eggs')}
													className={'header-tab no-full-border ' + (tab === 'eggs' ? 'selected' : '')}
												>
													<span>{translator(TranslatorKeys.Eggs, currentLanguage)}</span>
												</Link>
											</li>
										</ul>
									</nav>

									{tab === 'events' && <Events />}
									{tab === 'bosses' && <Raids />}
									{tab === 'spawns' && <Spawns />}
									{tab === 'rockets' && <Rockets />}
									{tab === 'eggs' && <Eggs />}
								</div>
							</div>
						)}
					</LoadingRenderer>
				</div>
			</div>
		</main>
	);
};

export default Calendar2;

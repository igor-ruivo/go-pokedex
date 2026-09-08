import './App.scss';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import DeleteTrash from './components/DeleteTrash';
import ErrorBoundary from './components/ErrorBoundary';
import Content from './components/Template/Content';
import Footer from './components/Template/Footer';
import Navbar from './components/Template/Navbar';
import { ImageSourceProvider } from './contexts/imageSource-context';
import { LanguageProvider } from './contexts/language-context';
import { NavbarSearchProvider } from './contexts/navbar-search-context';
import { NotificationsProvider } from './contexts/notifications-context';
import NewApp from './new/NewApp';
import { DAY_IN_MS, QUERY_CACHE_BUSTER, queryClient, queryPersister } from './utils/query-client';
import Calendar2 from './views/calendar2';
import Pokedex from './views/pokedex';
import Pokemon from './views/pokemon';

// Server state (the dex-server JSON feeds) lives in TanStack Query — see src/queries/.
// Only genuine client state keeps a Context provider here.
const App = () => {
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{ persister: queryPersister, maxAge: DAY_IN_MS, buster: QUERY_CACHE_BUSTER }}
		>
			<ImageSourceProvider>
				<LanguageProvider>
					<NavbarSearchProvider>
						<NotificationsProvider>
							<HashRouter>
								<Routes>
									{/* Revamp — self-contained, no legacy chrome. */}
									<Route path='/new/*' element={<NewApp />} />
									<Route
										path='/*'
										element={
											<div className='main-wrapper'>
												<Navbar />
												<Content>
													<ErrorBoundary>
														<Routes>
															<Route index element={<Pokedex />} />
															<Route path='pokemon/:speciesId' element={<Pokemon />} />
															<Route path='pokemon/:speciesId/:tab' element={<Pokemon />} />
															<Route path='trash-pokemon' element={<DeleteTrash />} />
															<Route path='calendar' element={<Navigate to='/calendar/events' replace />} />
															<Route path='calendar/:tab' element={<Calendar2 />} />
															<Route path=':league' element={<Pokedex />} />
															<Route path='*' element={<div>404 not found!</div>} />
														</Routes>
													</ErrorBoundary>
												</Content>
												<Footer />
											</div>
										}
									/>
								</Routes>
							</HashRouter>
						</NotificationsProvider>
					</NavbarSearchProvider>
				</LanguageProvider>
			</ImageSourceProvider>
		</PersistQueryClientProvider>
	);
};

export default App;

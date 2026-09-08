import './App.scss';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { HashRouter, Route, Routes } from 'react-router-dom';

import DeleteTrash from './components/DeleteTrash';
import Content from './components/Template/Content';
import Footer from './components/Template/Footer';
import Navbar from './components/Template/Navbar';
import { ImageSourceProvider } from './contexts/imageSource-context';
import { LanguageProvider } from './contexts/language-context';
import { NavbarSearchProvider } from './contexts/navbar-search-context';
import { NotificationsProvider } from './contexts/notifications-context';
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
								<div className='main-wrapper'>
									<Navbar />
									<Content>
										<Routes>
											<Route index path='/' element={<Pokedex />} />
											<Route path='/:listTypeArg' element={<Pokedex />} />
											<Route path='/pokemon/:speciesId' element={<Pokemon />} />
											<Route path='/pokemon/:speciesId/info' element={<Pokemon />} />
											<Route path='/pokemon/:speciesId/moves' element={<Pokemon />} />
											<Route path='/pokemon/:speciesId/counters' element={<Pokemon />} />
											<Route path='/pokemon/:speciesId/tables' element={<Pokemon />} />
											<Route path='/pokemon/:speciesId/strings' element={<Pokemon />} />
											<Route path='/trash-pokemon' element={<DeleteTrash />} />
											<Route path='/calendar/bosses' element={<Calendar2 />} />
											<Route path='/calendar/spawns' element={<Calendar2 />} />
											<Route path='/calendar/rockets' element={<Calendar2 />} />
											<Route path='/calendar/eggs' element={<Calendar2 />} />
											<Route path='/calendar/events' element={<Calendar2 />} />
											<Route path='/*' element={<div>404 not found!</div>} />
										</Routes>
									</Content>
									<Footer />
								</div>
							</HashRouter>
						</NotificationsProvider>
					</NavbarSearchProvider>
				</LanguageProvider>
			</ImageSourceProvider>
		</PersistQueryClientProvider>
	);
};

export default App;

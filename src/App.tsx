import './rvmp.css';
import './components.css';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import Shell from './components/Shell';
import { ImageSourceProvider } from './contexts/imageSource-context';
import { LanguageProvider } from './contexts/language-context';
import { RaidMetricProvider } from './contexts/raid-metric-context';
import Calendar from './routes/Calendar';
import MassDelete from './routes/MassDelete';
import MoveDetail from './routes/MoveDetail';
import Moves from './routes/Moves';
import Placeholder from './routes/Placeholder';
import PokemonDetail from './routes/PokemonDetail';
import Rankings from './routes/Rankings';
import Settings from './routes/Settings';
import Types from './routes/Types';
import { DAY_IN_MS, QUERY_CACHE_BUSTER, queryClient, queryPersister } from './utils/query-client';

// Server state (the dex-server JSON feeds) lives in TanStack Query — see src/queries/.
// Only genuine client state keeps a Context provider here. Everything is scoped
// under the `.rvmp` root class (see Shell) — one self-contained stylesheet.
const App = () => (
	<PersistQueryClientProvider
		client={queryClient}
		persistOptions={{ persister: queryPersister, maxAge: DAY_IN_MS, buster: QUERY_CACHE_BUSTER }}
	>
		<ImageSourceProvider>
			<RaidMetricProvider>
				<LanguageProvider>
					<HashRouter>
						<Routes>
							<Route element={<Shell />}>
								<Route index element={<Rankings />} />
								<Route path='rankings/:league' element={<Rankings />} />
								<Route path='pokemon/:speciesId' element={<PokemonDetail />} />
								<Route path='pokemon/:speciesId/:tab' element={<PokemonDetail />} />
								<Route path='calendar' element={<Navigate to='/calendar/events' replace />} />
								<Route path='calendar/:tab' element={<Calendar />} />
								<Route path='moves' element={<Moves />} />
								<Route path='move/:moveId' element={<MoveDetail />} />
								<Route path='types' element={<Types />} />
								<Route path='trash' element={<MassDelete />} />
								<Route path='tools' element={<Placeholder title='Tools' />} />
								<Route path='settings' element={<Settings />} />
								<Route path='*' element={<Navigate to='/' replace />} />
							</Route>
						</Routes>
					</HashRouter>
				</LanguageProvider>
			</RaidMetricProvider>
		</ImageSourceProvider>
	</PersistQueryClientProvider>
);

export default App;

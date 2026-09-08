import './rvmp.css';
import './components.css';

import { Navigate, Route, Routes } from 'react-router-dom';

import Shell from './components/Shell';
import Placeholder from './routes/Placeholder';
import PokemonDetail from './routes/PokemonDetail';
import Rankings from './routes/Rankings';

/**
 * The revamp lives entirely under /new/*. Everything is scoped by the `.rvmp`
 * root class (see Shell) and shares nothing with the legacy stylesheet.
 */
const NewApp = () => (
	<Routes>
		<Route element={<Shell />}>
			<Route index element={<Rankings />} />
			<Route path='rankings/:league' element={<Rankings />} />
			<Route path='pokemon/:speciesId' element={<PokemonDetail />} />
			<Route path='pokemon/:speciesId/:tab' element={<PokemonDetail />} />
			<Route path='calendar' element={<Navigate to='/new/calendar/events' replace />} />
			<Route path='calendar/:tab' element={<Placeholder title='Calendar' />} />
			<Route path='tools' element={<Placeholder title='Tools' />} />
			<Route path='settings' element={<Placeholder title='Settings' />} />
			<Route path='*' element={<Navigate to='/new' replace />} />
		</Route>
	</Routes>
);

export default NewApp;

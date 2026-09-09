import './rvmp.css';
import './components.css';

import { Navigate, Route, Routes } from 'react-router-dom';

import Shell from './components/Shell';
import Calendar from './routes/Calendar';
import MassDelete from './routes/MassDelete';
import MoveDetail from './routes/MoveDetail';
import Moves from './routes/Moves';
import Placeholder from './routes/Placeholder';
import PokemonDetail from './routes/PokemonDetail';
import Rankings from './routes/Rankings';
import Settings from './routes/Settings';
import Types from './routes/Types';

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
			<Route path='calendar/:tab' element={<Calendar />} />
			<Route path='moves' element={<Moves />} />
			<Route path='move/:moveId' element={<MoveDetail />} />
			<Route path='types' element={<Types />} />
			<Route path='trash' element={<MassDelete />} />
			<Route path='tools' element={<Placeholder title='Tools' />} />
			<Route path='settings' element={<Settings />} />
			<Route path='*' element={<Navigate to='/new' replace />} />
		</Route>
	</Routes>
);

export default NewApp;

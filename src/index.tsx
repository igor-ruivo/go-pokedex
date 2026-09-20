import './index.css';
// Must initialize before App renders — components call useTranslation() at
// mount, and scripts/prerender.mjs needs real text in the first paint.
import './i18n';

import { createRoot } from 'react-dom/client';

import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

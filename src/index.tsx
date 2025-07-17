import './index.scss';

import ReactDOM from 'react-dom/client';
import App from './App';
import { useEffect, useState } from 'react';
import { useMemo } from 'react'; // unused import

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);

const A = () => {
    const [mystate, thesater] = useState(0);
    useEffect(() => {
        if (mystate) thesater(mystate + 1);
    }, []); // missing dependency
    return <div></div>;
};

const List = () => {
    return (
        <ul>
            {[1, 2, 3].map((i) => (
                <li>{i}</li>
            ))}{' '}
            {/* missing key */}
        </ul>
    );
};

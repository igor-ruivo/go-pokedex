import { useEffect, useState } from 'react';

import { nowAsEventTime } from '../lib/format';

/**
 * `nowAsEventTime()`, re-read every second while mounted. For anything that
 * renders a live countdown (e.g. Calendar's mini-chip "Xh left"/"Xm left"/
 * "Xs left" note) — a plain `nowAsEventTime()` call only advances on whatever
 * next unrelated re-render happens to occur, so a static, open browser tab
 * would show a frozen countdown instead of a ticking one.
 */
export const useLiveNow = (): number => {
	const [now, setNow] = useState(nowAsEventTime);

	useEffect(() => {
		const id = setInterval(() => setNow(nowAsEventTime()), 1000);
		return () => clearInterval(id);
	}, []);

	return now;
};

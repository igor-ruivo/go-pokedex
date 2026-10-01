import { useEffect, useState } from 'react';

/**
 * False on the first render, true once the browser has painted it. Gate a heavy subtree behind it so a spinner is
 * what appears first (the navigation lands instantly) and the expensive render happens right after.
 */
export const useAfterPaint = (): boolean => {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		let timer = 0;
		const frame = window.requestAnimationFrame(() => {
			timer = window.setTimeout(() => setReady(true), 0);
		});
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(timer);
		};
	}, []);
	return ready;
};

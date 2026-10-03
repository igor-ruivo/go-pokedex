import { useEffect, useState } from 'react';

export const useDebouncedValue = <T>(value: T, delay: number): T => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
		return () => window.clearTimeout(timeout);
	}, [value, delay]);

	return debouncedValue;
};

import { type ReactNode, useRef } from 'react';

import { usePlayOnChange } from '../hooks/usePlayOnChange';

/** An element (a `span`, or a `div` or `b` with `as`) that fades in again each time `k` (what it shows) changes, but not when it first appears. */
export const Swap = ({
	k,
	className,
	as = 'span',
	children,
}: {
	k: string;
	className?: string;
	as?: 'span' | 'div' | 'b';
	children: ReactNode;
}) => {
	const ref = useRef<HTMLDivElement & HTMLSpanElement>(null);
	usePlayOnChange(ref, k);
	const Tag = as;
	return (
		<Tag ref={ref} className={className}>
			{children}
		</Tag>
	);
};

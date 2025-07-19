import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';

export interface IDetailItem {
	detailId: string;
	onClick: (
		event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
	) => void;
	summary: ReactNode;
	content: ReactNode;
}

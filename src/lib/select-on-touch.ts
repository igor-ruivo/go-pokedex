import type { FocusEvent } from 'react';

/**
 * `onFocus` handler for search boxes: on touch devices (coarse primary pointer) a single tap selects the whole
 * text, so retyping replaces it instead of needing a long-press + "select all". Desktop keeps its normal caret.
 * Deferred a tick because mobile browsers place the caret *after* the focus event fires, which would otherwise
 * undo the selection.
 */
export const selectAllOnTouchFocus = (event: FocusEvent<HTMLInputElement>): void => {
	if (!window.matchMedia('(pointer: coarse)').matches) return;
	const input = event.currentTarget;
	window.setTimeout(() => {
		if (document.activeElement === input) input.setSelectionRange(0, input.value.length);
	}, 0);
};

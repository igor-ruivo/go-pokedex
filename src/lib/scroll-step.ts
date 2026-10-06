/** How many items a click on an arrow moves a row by. */
const STEP_ITEMS = 2;

/**
 * Scrolls a row sideways by a short step: up to the second item that is cut off (or hidden) at the edge, so that it comes fully into
 * view (going back, the second one before). The tabs, chips and pills of the site don't fit in a row by a slot or two, so a couple of
 * items is all the arrows need, with no gallery-sized swipe.
 */
export const scrollOneStep = (row: HTMLElement, direction: 1 | -1) => {
	const box = row.getBoundingClientRect();
	const items = Array.from(row.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
	let delta = 0;
	if (direction === 1) {
		const ahead = items.filter((item) => item.getBoundingClientRect().right > box.right + 1);
		const target = ahead[Math.min(STEP_ITEMS, ahead.length) - 1];
		if (target) delta = target.getBoundingClientRect().right - box.right;
	} else {
		const behind = items.filter((item) => item.getBoundingClientRect().left < box.left - 1).reverse();
		const target = behind[Math.min(STEP_ITEMS, behind.length) - 1];
		if (target) delta = target.getBoundingClientRect().left - box.left;
	}
	row.scrollBy({ left: delta || direction * row.clientWidth * 0.5, behavior: 'smooth' });
};

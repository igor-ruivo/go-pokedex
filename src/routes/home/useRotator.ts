import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

/** How long an item stays before the next one swipes in (the countdown bar runs this long). */
export const ROTATE_MS = 7000;
/** How long the outgoing item stays mounted, to swipe out. */
export const SWIPE_MS = 560;

/** An image to have ready: its address, and the one to use instead when that is missing (a sprite the game assets lack). */
export type Preload = string | { url: string; fallback?: string | undefined };

/** The decoded images already made ready, kept (the most recent ones) so that the browser does not let go of them before they are drawn. */
const kept = new Map<string, HTMLImageElement>();
const KEPT_LIMIT = 120;

const load = (url: string): Promise<boolean> => {
	const held = kept.get(url);
	if (held) return Promise.resolve(true);
	const img = new Image();
	img.src = url;
	return img.decode().then(
		() => {
			kept.set(url, img);
			if (kept.size > KEPT_LIMIT) kept.delete(kept.keys().next().value!);
			return true;
		},
		() => false
	);
};

/**
 * Loads (and decodes) images, so that what uses them can swipe in already drawn. An image that is not there is replaced by its
 * fallback, the one the screen would end up showing. Gives up after a moment.
 */
export const preloadImages = (items: ReadonlyArray<Preload>): Promise<void> =>
	new Promise((resolve) => {
		const timeout = window.setTimeout(resolve, 2500);
		void Promise.all(
			items.map(async (item) => {
				const { url, fallback } = typeof item === 'string' ? { url: item, fallback: undefined } : item;
				if (!(await load(url)) && fallback) await load(fallback);
			})
		).then(() => {
			window.clearTimeout(timeout);
			resolve();
			return undefined;
		});
	});

/** What the clock needs of a showcase: whether it has a next item ready to load, and how to bring it in. */
interface Member {
	/** Resolves once the next item's images are in; none when there is no next item. */
	upcoming: () => Promise<void> | undefined;
	/** Brings the next item in (the item on show swipes out). */
	swap: () => void;
}

/**
 * One clock for every showcase of the page, so that their countdown bars run in step and their items swipe at the same
 * instant: when the time is up it waits until every showcase has its next item loaded, then brings them all in together and
 * starts over. Holding any showcase (pointer or focus) stops the clock where it is for all of them, and letting go carries on
 * from there. Nothing rotates while the tab is in the background.
 */
const clock = (() => {
	const members = new Set<Member>();
	const holders = new Set<string>();
	const listeners = new Set<() => void>();
	let remaining = ROTATE_MS;
	let startedAt = 0;
	let running = false;
	let swapping = false;
	let timer = 0;

	const notify = () => listeners.forEach((l) => l());
	const left = () => (running ? Math.max(0, remaining - (performance.now() - startedAt)) : remaining);

	const start = () => {
		running = true;
		startedAt = performance.now();
		timer = window.setTimeout(expire, remaining);
	};
	const pause = () => {
		window.clearTimeout(timer);
		remaining = left();
		running = false;
	};
	/** Runs when the clock should be going and stops it when it should not. */
	const reconcile = () => {
		const shouldRun = members.size > 0 && holders.size === 0 && !swapping;
		if (shouldRun && !running) start();
		else if (!shouldRun && running) pause();
	};
	function expire() {
		running = false;
		remaining = 0;
		const waiting = [...members].flatMap((m) => m.upcoming() ?? []);
		if (document.hidden || waiting.length === 0) {
			// nothing to bring in yet, or nobody looking: ask again in a moment
			running = true;
			startedAt = performance.now();
			timer = window.setTimeout(expire, 500);
			return;
		}
		swapping = true;
		void Promise.all(waiting).then(() => {
			swapping = false;
			members.forEach((m) => m.swap());
			remaining = ROTATE_MS;
			reconcile();
			return undefined;
		});
	}

	return {
		/** How much of the current cycle has gone, for a bar that starts now to line up with the others. */
		elapsed: () => ROTATE_MS - left(),
		join: (member: Member) => {
			members.add(member);
			reconcile();
			return () => {
				members.delete(member);
				reconcile();
			};
		},
		hold: (source: string, on: boolean) => {
			if (on === holders.has(source)) return;
			if (on) holders.add(source);
			else holders.delete(source);
			reconcile();
			notify();
		},
		isHeld: () => holders.size > 0,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
})();

let showcases = 0;

/** Whether the device's main input can hover (a mouse, a trackpad), as opposed to a touch screen. */
const canHover = (): boolean => window.matchMedia('(hover: hover)').matches;

/**
 * The rotation of a Home showcase: its item swipes out to the left and the next one swipes in, on the page's shared clock (see
 * above). The next item is chosen and preloaded as soon as the current one lands, so it is ready well before its time, and
 * the countdown bar (which restarts with `cycle`) starts over only at the very moment the next item is brought in. Nothing
 * moves for anyone who asked for less motion.
 *
 * `pick` and `preload` are read when needed, so they may change identity freely.
 */
export const useRotator = <T>({
	ready,
	pick,
	preload,
}: {
	/** Whether there is data to pick from. */
	ready: boolean;
	/** Chooses an item other than `not` (the one on show), or none when there is nothing to show. */
	pick: (not?: T) => T | undefined;
	/** Resolves once the item's images are in. */
	preload: (item: T) => Promise<void>;
}) => {
	const [current, setCurrent] = useState<T | undefined>(undefined);
	const [leaving, setLeaving] = useState<T | undefined>(undefined);
	// restarts the countdown bar with each new item
	const [cycle, setCycle] = useState(0);
	const rotated = useRef(false);
	const currentRef = useRef<T | undefined>(undefined);
	currentRef.current = current;
	const pickRef = useRef(pick);
	pickRef.current = pick;
	const preloadRef = useRef(preload);
	preloadRef.current = preload;
	const [id] = useState(() => `showcase-${showcases++}`);

	// the first item, as soon as there is data
	useEffect(() => {
		if (!current && ready) setCurrent(pickRef.current());
	}, [ready, current]);

	// The next item is chosen and its images loaded as soon as the current one lands, so it is ready well before the bar runs out.
	const upcoming = useRef<{ item: T; ready: Promise<void> } | undefined>(undefined);
	useEffect(() => {
		if (!current || !ready) return;
		const item = pickRef.current(current);
		upcoming.current = item === undefined ? undefined : { item, ready: preloadRef.current(item) };
	}, [current, ready]);

	// takes part in the shared clock while there is an item on show
	const showing = !!current;
	useEffect(() => {
		if (!ready || !showing) return;
		return clock.join({
			upcoming: () => upcoming.current?.ready,
			swap: () => {
				const next = upcoming.current;
				if (!next) return;
				const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
				rotated.current = true;
				setLeaving(reduced ? undefined : currentRef.current);
				setCurrent(next.item);
				setCycle((c) => c + 1);
				if (!reduced) window.setTimeout(() => setLeaving(undefined), SWIPE_MS);
			},
		});
	}, [ready, showing]);

	// letting go of a held showcase (or leaving the page) releases the clock
	useEffect(
		() => () => {
			clock.hold(`${id}:pointer`, false);
			clock.hold(`${id}:focus`, false);
		},
		[id]
	);
	const held = useSyncExternalStore(clock.subscribe, clock.isHeld);

	// how far into the shared cycle this showcase's bar starts, so that it lines up with the others
	const barDelay = useMemo(() => -clock.elapsed(), [cycle, showing]);

	return {
		current,
		leaving,
		held,
		cycle,
		/** The (negative) animation delay that puts a bar starting now in step with the shared clock, in ms. */
		barDelay,
		/** Whether an item has swiped in yet (the first one is simply there). */
		rotated: rotated.current,
		/** Spread onto the element that holds the showcase. */
		holdProps: {
			// a touch screen has no hover: the mouse events a tap makes up would hold the clock until the next tap elsewhere
			onMouseEnter: () => {
				if (canHover()) clock.hold(`${id}:pointer`, true);
			},
			onMouseLeave: () => clock.hold(`${id}:pointer`, false),
			onFocus: () => clock.hold(`${id}:focus`, true),
			onBlur: () => clock.hold(`${id}:focus`, false),
		},
	};
};

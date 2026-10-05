import { type RefObject, useLayoutEffect, useRef, useState } from 'react';

/** The default size of a round face. */
export const FACE_SIZE = 52;
/** The most space left between two faces when there is room to spare. */
export const FACE_MAX_GAP = 8;
/** How much of a face the next one covers: they sit close together, overlapping a little. */
export const FACE_OVERLAP = 0.18;

export interface FaceTarget {
	/** How many cells (faces, and the "+N" when there is one) to try to fit. */
	cells: number;
	/** The least size a face may be shrunk to for that. */
	minSize: number;
}

/**
 * On a narrower row the faces shrink to make more of them fit: five cells (four faces and the "+N") if that leaves them at
 * least 40px, else four (36px), else three (34px).
 */
export const DEFAULT_FACE_TARGETS: ReadonlyArray<FaceTarget> = [
	{ cells: 5, minSize: 40 },
	{ cells: 4, minSize: 36 },
	{ cells: 3, minSize: 34 },
];

export interface FaceLayout {
	/** How many cells fit across. */
	count: number;
	/** How big a face is, in px. */
	size: number;
	/** How far apart the left edges of two neighbours are, in px, with the overlap they have by default. */
	step: number;
	/** The room the faces have, in px. */
	room: number;
}

export interface FaceOptions {
	/** The biggest a face gets (default `FACE_SIZE`). */
	maxSize?: number;
	/** What to try to fit, most cells first (default `DEFAULT_FACE_TARGETS`). */
	targets?: ReadonlyArray<FaceTarget>;
}

/**
 * One row of overlapping faces: how many fit across `room` (each after the first adds only its uncovered part), how big they
 * are (`maxSize`, smaller when that fits more of them, see the targets) and how far apart their left edges are.
 */
export const faceLayout = (
	room: number,
	{ maxSize = FACE_SIZE, targets = DEFAULT_FACE_TARGETS }: FaceOptions = {}
): FaceLayout => {
	const layoutFor = (size: number): FaceLayout => {
		const step = Math.max(1, Math.round(size * (1 - FACE_OVERLAP)));
		return { size, step, room, count: Math.max(1, Math.floor((room - size) / step) + 1) };
	};
	const wide = layoutFor(maxSize);
	if (wide.count >= targets[0].cells) return wide;
	for (const { cells, minSize } of targets) {
		const size = Math.floor(room / (1 + (cells - 1) * (1 - FACE_OVERLAP)));
		if (size >= minSize) return layoutFor(Math.min(maxSize, size));
	}
	const last = targets[targets.length - 1];
	return layoutFor(Math.max(last.minSize, Math.floor(room / (1 + (last.cells - 1) * (1 - FACE_OVERLAP)))));
};

/**
 * How far apart the left edges of `cells` faces are once they are spread over the whole room: as far as it allows, up to a
 * small gap between them (never closer than the default overlap).
 */
export const faceStep = ({ size, step, room }: FaceLayout, cells: number): number =>
	cells > 1 ? Math.max(step, Math.min(size + FACE_MAX_GAP, Math.floor((room - size) / (cells - 1)))) : step;

/** Measures the element it is given (less its padding) and lays faces out in it, following it as it is resized. */
export const useFaceLayout = <T extends HTMLElement>(
	options?: FaceOptions
): readonly [RefObject<T | null>, FaceLayout] => {
	const ref = useRef<T>(null);
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const [layout, setLayout] = useState<FaceLayout>(() => ({
		count: 4,
		size: options?.maxSize ?? FACE_SIZE,
		step: Math.round((options?.maxSize ?? FACE_SIZE) * (1 - FACE_OVERLAP)),
		room: 0,
	}));
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () => {
			// the room the faces really have: the box less its padding (which leaves room for the sparkle and the ring)
			const style = getComputedStyle(el);
			const room = el.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
			const next = faceLayout(room, optionsRef.current);
			setLayout((prev) =>
				prev.count === next.count && prev.size === next.size && prev.step === next.step && prev.room === next.room
					? prev
					: next
			);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);
	return [ref, layout] as const;
};

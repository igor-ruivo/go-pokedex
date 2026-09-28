import { useEffect, useRef, useState } from 'react';

import { ImageSource, useImageSource } from '../contexts/imageSource-context';
import type { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { goBaseUrl } from '../utils/Configs';
import { ShadowMark } from './ShadowMark';

/** Horizontal drag past this many px, more horizontal than vertical, counts as a swipe. */
const SWIPE_THRESHOLD = 32;

/**
 * `goImageUrl` / `shinyGoImageUrl` in the game-master are repo-relative
 * (e.g. "248.icon.png") — they must be prefixed with the PokeMiners asset base.
 * `imageUrl` is already an absolute pokemon.com URL.
 */
export const goSpriteUrl = (relativePath: string): string => (relativePath ? goBaseUrl + relativePath : '');

export const spriteUrl = (pokemon: IGamemasterPokemon, source: ImageSource): string => {
	if (source === ImageSource.Shiny && pokemon.shinyGoImageUrl) {
		return goSpriteUrl(pokemon.shinyGoImageUrl);
	}
	if ((source === ImageSource.Shiny || source === ImageSource.GO) && pokemon.goImageUrl) {
		return goSpriteUrl(pokemon.goImageUrl);
	}
	return pokemon.imageUrl || goSpriteUrl(pokemon.goImageUrl);
};

/**
 * Shared `<img onError>` handler for every sprite `<img>` in the app — used
 * directly by both `Sprite` and `SpriteImg` below, and still exported for the
 * rare spot that renders a sprite `<img>` by hand instead of through either.
 * GO/shiny assets 404 for plenty of species (not every one has a PokeMiners
 * icon); falls back to the official artwork once, and if that 404s too
 * there's nothing left to fall back to, so it's left alone rather than
 * looping.
 */
export const handleSpriteError = (pokemon: IGamemasterPokemon) => (e: React.SyntheticEvent<HTMLImageElement>) => {
	const img = e.currentTarget;
	if (pokemon.imageUrl && img.src !== pokemon.imageUrl) {
		img.src = pokemon.imageUrl;
	}
};

// Sequential fade-out-then-fade-in, one `<img>`, no overlap — used by every
// Pokémon sprite in the app (the hero carousel below, and `SpriteImg` further
// down for every plain list/chip/card sprite), so that switching the Sprites
// setting — or, on the hero, tapping/swiping to the next sprite — never just
// swaps `src` in place. The browser keeps showing the OLD bitmap on screen
// until the new one finishes decoding, but the GO/shiny-GO 1.35x zoom
// (components.css, the `[src*='pogo_assets']` attribute selector) re-
// evaluates the instant React sets a new `src` attribute — well before the
// new pixels are actually ready. So the OLD image would otherwise visibly
// jump to the NEW (bigger) size first, and only afterwards would the new
// content pop in, already at that size.
//
// `phase` walks a strict one-way sequence, `idle` -> `fadingOut` -> `loading`
// -> `fadingIn` -> `idle`, driven entirely by real DOM events
// (`onTransitionEnd`/`onLoad`), never a timer: the OLD image fades fully out
// first, `src` only changes once that's visually done (still invisible), and
// the NEW one only starts fading in once it has actually finished loading —
// so the two are never both partway visible at once, and the zoom is already
// correct by the time anything is shown.
//
// The `requestAnimationFrame` pair before `fadingIn` matters more than it
// looks: a cached image's `onLoad` can fire before the browser has ever
// actually painted the just-mounted, `opacity: 0` frame. Flipping straight to
// `opacity: 1` at that point gives the transition no "before" frame to
// animate from, so the browser applies it as an instant, un-animated jump —
// AND, because no transition ever actually started, the `transitionend` this
// whole sequence waits on to reach `idle` never fires either, leaving the
// sprite permanently one phase behind. Two rAFs (not one — a single one can
// still land in the same frame the browser was about to paint anyway)
// reliably force that first paint to happen before the opacity change that's
// supposed to transition away from it.
type FadePhase = 'idle' | 'fadingOut' | 'loading' | 'fadingIn';

const useSequentialFade = (resolved: string) => {
	const [displayed, setDisplayed] = useState(resolved);
	const [phase, setPhase] = useState<FadePhase>('idle');
	const targetRef = useRef(resolved);

	useEffect(() => {
		targetRef.current = resolved;
		if (resolved === displayed) {
			setPhase('idle');
			return;
		}
		setPhase('fadingOut');
	}, [resolved, displayed]);

	const handleTransitionEnd = () => {
		if (phase === 'fadingOut') {
			setDisplayed(targetRef.current);
			setPhase('loading');
		} else if (phase === 'fadingIn') {
			setPhase('idle');
		}
	};
	const handleLoad = () => {
		if (phase !== 'loading') return;
		requestAnimationFrame(() => requestAnimationFrame(() => setPhase('fadingIn')));
	};

	return {
		displayed,
		/** Spread onto the `<img>` alongside `className='r-fade-sprite'` — see
		 *  that class's own rule in components.css for the actual transition. */
		fadeProps: {
			'data-fade': (phase === 'fadingOut' || phase === 'loading' ? 'hidden' : undefined) as string | undefined,
			'onLoad': handleLoad,
			'onTransitionEnd': handleTransitionEnd,
		},
	};
};

/**
 * Drop-in replacement for a plain `<img src={spriteUrl(pokemon, imageSource)}>`
 * — every mini-chip/family-line-chip/calendar-chip/ranking-card sprite in the
 * app renders through this now, so all of them get the same load-gated
 * fade (see `useSequentialFade` above) when the Sprites setting changes.
 * Callers keep their own wrapper markup (`<span className='r-pc-art'>` etc.)
 * exactly as before — this only replaces the bare `<img>` itself.
 */
export const SpriteImg = ({
	pokemon,
	alt = '',
	loading,
	style,
	src,
	ariaHidden,
}: {
	pokemon: IGamemasterPokemon;
	alt?: string;
	loading?: 'lazy' | 'eager';
	style?: React.CSSProperties | undefined;
	/** Override the computed sprite URL — same idea as `<Sprite src>`, for the
	 *  hero's own sticky-topbar mini echo (it tracks the hero carousel's
	 *  current position rather than always the default `spriteUrl`). */
	src?: string | undefined;
	ariaHidden?: boolean;
}) => {
	const { imageSource } = useImageSource();
	const resolved = src ?? spriteUrl(pokemon, imageSource);
	const { displayed, fadeProps } = useSequentialFade(resolved);
	return (
		<img
			src={displayed}
			alt={alt}
			loading={loading}
			decoding='async'
			style={style}
			className='r-fade-sprite'
			aria-hidden={ariaHidden}
			onError={handleSpriteError(pokemon)}
			{...fadeProps}
		/>
	);
};

export const Sprite = ({
	pokemon,
	alt,
	src,
	onTap,
	onSwipeLeft,
	onSwipeRight,
	hint,
}: {
	pokemon: IGamemasterPokemon;
	alt?: string;
	/** Override the computed sprite URL (for the hero sprite carousel). */
	src?: string;
	/** Makes the sprite tappable (cycles the sprite source on the hero). */
	onTap?: () => void;
	/** Touch only — swipe left/right to move through the carousel instead of tapping. */
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	/** Carousel position hint dots under the sprite. */
	hint?: { count: number; active: number };
}) => {
	const { imageSource } = useImageSource();
	const resolved = src ?? spriteUrl(pokemon, imageSource);
	const { displayed, fadeProps } = useSequentialFade(resolved);

	// Touch drag tracking. `touch-action: pan-y` (CSS) hands horizontal drags to
	// us untouched while leaving vertical page scrolling to the browser, so no
	// axis-lock dance is needed here — a gesture that turns out to be mostly
	// vertical just never crosses SWIPE_THRESHOLD on the X axis.
	const startRef = useRef<{ x: number; y: number } | null>(null);
	const swipedRef = useRef(false);
	const canSwipe = !!(onSwipeLeft ?? onSwipeRight);

	return (
		<div
			className='r-sprite'
			data-tappable={onTap ? '' : undefined}
			{...(onTap
				? {
						role: 'button',
						tabIndex: 0,
						onClick: () => {
							// swallow the click a touch swipe leaves in its wake — only a
							// genuine tap (no meaningful drag) should cycle via `onTap`
							if (swipedRef.current) {
								swipedRef.current = false;
								return;
							}
							onTap();
						},
						onKeyDown: (e: React.KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onTap();
							}
						},
					}
				: {})}
			{...(canSwipe
				? {
						onPointerDown: (e: React.PointerEvent) => {
							if (e.pointerType === 'mouse') return;
							startRef.current = { x: e.clientX, y: e.clientY };
						},
						onPointerUp: (e: React.PointerEvent) => {
							const start = startRef.current;
							startRef.current = null;
							if (!start) return;
							const dx = e.clientX - start.x;
							const dy = e.clientY - start.y;
							if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
							swipedRef.current = true;
							if (dx < 0) onSwipeLeft?.();
							else onSwipeRight?.();
						},
						onPointerCancel: () => {
							startRef.current = null;
						},
					}
				: {})}
		>
			{pokemon.isShadow && <ShadowMark className='r-shadow-mark r-sprite-shadow' />}
			<img
				src={displayed}
				alt={alt ?? pokemon.speciesName}
				decoding='async'
				className='r-fade-sprite'
				onError={handleSpriteError(pokemon)}
				{...fadeProps}
			/>
			{hint && hint.count > 1 && (
				<span className='r-sprite-dots' aria-hidden='true'>
					{Array.from({ length: hint.count }, (_, i) => (
						<i key={i} data-on={i === hint.active} />
					))}
				</span>
			)}
		</div>
	);
};

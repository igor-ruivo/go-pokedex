import { useRef } from 'react';

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
				src={resolved}
				alt={alt ?? pokemon.speciesName}
				decoding='async'
				onError={(e) => {
					// a missing GO / shiny asset falls back to the official artwork
					const img = e.currentTarget;
					if (pokemon.imageUrl && img.src !== pokemon.imageUrl) {
						img.src = pokemon.imageUrl;
					}
				}}
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

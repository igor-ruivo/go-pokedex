import { useEffect } from 'react';

/**
 * The number of unread calendar events on the app's icon, through the Badging API (`navigator.setAppBadge`): a home-screen web
 * app on iOS/iPadOS 16.4+, an installed PWA on Android and on desktop Chrome/Edge. Where the API is missing this does nothing.
 *
 * iOS ties badges to the notification permission, which can only be asked for on a tap: the first tap in the app asks for it.
 *
 * The badge can only change while the app is running (it is set when the app opens and whenever an event is read); with no
 * server to push from, an icon that is not opened keeps the number it was left with.
 */
type BadgeNavigator = Navigator & {
	setAppBadge?: (count?: number) => Promise<void>;
	clearAppBadge?: () => Promise<void>;
};

const badgeNavigator = (): BadgeNavigator | undefined => (typeof navigator === 'undefined' ? undefined : navigator);

// iPadOS 13+ reports itself as a Mac, with a touch screen
const isIos = () =>
	/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const applyBadge = (count: number): void => {
	const target = badgeNavigator();
	const done = count > 0 ? target?.setAppBadge?.(count) : target?.clearAppBadge?.();
	done?.catch(() => undefined);
};

/** Asks iOS for the notification permission its badges need, on the first tap (the only place it lets it be asked). */
const askPermissionOnFirstTap = (onGranted: () => void): (() => void) | undefined => {
	if (!isIos() || typeof Notification === 'undefined' || Notification.permission !== 'default') return undefined;
	const ask = () => {
		void Notification.requestPermission()
			.then((result) => result === 'granted' && onGranted())
			.catch(() => undefined);
	};
	window.addEventListener('pointerup', ask, { once: true });
	return () => window.removeEventListener('pointerup', ask);
};

/** Keeps the icon's badge at `count`. `undefined` — not known yet — leaves it as it is. */
export const useSyncAppBadge = (count: number | undefined): void => {
	useEffect(() => {
		if (count === undefined) return undefined;
		applyBadge(count);
		return askPermissionOnFirstTap(() => applyBadge(count));
	}, [count]);
};

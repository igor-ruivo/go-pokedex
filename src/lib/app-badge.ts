import { useEffect, useSyncExternalStore } from 'react';

import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

/**
 * The number of unread calendar events on the app's icon, through the Badging API (`navigator.setAppBadge`). It exists only
 * in an installed app: a home-screen web app on iOS/iPadOS 16.4+, an installed PWA on Android and on desktop Chrome/Edge — so
 * where it is missing, or the page is just a browser tab, the setting is not offered at all.
 *
 * iOS ties badges to the notification permission, which can only be asked for on a tap in the installed app: turning the
 * setting on there asks for it. Elsewhere no permission is involved and the badge is on from the start.
 *
 * The badge can only change while the app is running (it is set when the app opens and whenever an event is read); with no
 * server to push from, an icon that is not opened keeps the number it was left with.
 */
type BadgeNavigator = Navigator & {
	setAppBadge?: (count?: number) => Promise<void>;
	clearAppBadge?: () => Promise<void>;
	standalone?: boolean;
};

const badgeNavigator = (): BadgeNavigator | undefined => (typeof navigator === 'undefined' ? undefined : navigator);

const isStandalone = () =>
	window.matchMedia('(display-mode: standalone)').matches || badgeNavigator()?.standalone === true;

// iPadOS 13+ reports itself as a Mac, with a touch screen
const isIos = () =>
	/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Whether this device can show a badge at all (an installed app whose browser has the API). */
export const isAppBadgeSupported = (): boolean => typeof badgeNavigator()?.setAppBadge === 'function' && isStandalone();

const permissionGranted = (): boolean =>
	!isIos() || (typeof Notification !== 'undefined' && Notification.permission === 'granted');

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const storedChoice = (): boolean => {
	const raw = readPersistentValue(ConfigKeys.AppBadge);
	return raw === null ? !isIos() : raw === 'true';
};

let enabled = false;
let initialised = false;
const current = (): boolean => {
	if (!initialised) {
		initialised = true;
		enabled = storedChoice();
	}
	return enabled && permissionGranted();
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => void listeners.delete(listener);
};

/** Whether the icon badge is on (chosen, and allowed by the OS where that matters). */
export const useAppBadgeEnabled = (): boolean => useSyncExternalStore(subscribe, current, () => false);

/**
 * Turns the badge on or off. Resolves `false` when it could not be turned on because the notification permission iOS wants was
 * refused (it stays off).
 */
export const setAppBadgeEnabled = async (next: boolean): Promise<boolean> => {
	if (next && isIos() && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
		try {
			if ((await Notification.requestPermission()) !== 'granted') return false;
		} catch {
			return false;
		}
	}
	initialised = true;
	enabled = next;
	writePersistentValue(ConfigKeys.AppBadge, String(next));
	notify();
	return true;
};

const applyBadge = (count: number): void => {
	if (!isAppBadgeSupported()) return;
	const target = badgeNavigator();
	const done = count > 0 ? target?.setAppBadge?.(count) : target?.clearAppBadge?.();
	done?.catch(() => undefined);
};

/** Keeps the icon's badge at `count` (cleared when the setting is off). `undefined` — not known yet — leaves it as it is. */
export const useSyncAppBadge = (count: number | undefined): void => {
	const on = useAppBadgeEnabled();
	useEffect(() => {
		if (count !== undefined) applyBadge(on ? count : 0);
	}, [count, on]);
};

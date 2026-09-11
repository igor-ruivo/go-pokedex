import { useEffect, useState } from 'react';

import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';

/** Chrome/Edge's own install-prompt event — not yet in lib.dom.d.ts. */
interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
	window.matchMedia('(display-mode: standalone)').matches ||
	// iOS's own (non-standard) way of exposing the same thing
	(window.navigator as unknown as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);
const isMobile = () => /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);

/**
 * A small dismissible banner nudging mobile visitors to add the site to
 * their home screen — the fullscreen, no-browser-chrome experience otherwise
 * only happened when manually walked through on a friend's phone.
 *   - Android/Chrome: captures the browser's own `beforeinstallprompt` event
 *     (see vite.config.ts — this only fires once a service worker is
 *     registered) and offers a real "Install" button that triggers it.
 *   - iOS Safari: there is no programmatic install API at all, ever — the
 *     only path is Share → "Add to Home Screen", so this just explains that.
 *   - Desktop, anyone already installed (`display-mode: standalone` — or
 *     iOS's own equivalent flag), or anyone who's dismissed it *this
 *     session* (sessionStorage, not persistent — a new tab/visit later gets
 *     offered it again): nothing renders, full stop.
 */
export const InstallPrompt = () => {
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
	const [showIosHint, setShowIosHint] = useState(false);
	// Session-only: dismissing it shouldn't mean never again — a new tab/visit
	// later should get another chance to offer the install.
	const [dismissed, setDismissed] = useState(() => readSessionValue(ConfigKeys.InstallPromptDismissed) === 'true');

	useEffect(() => {
		if (dismissed || isStandalone() || !isMobile()) return;
		if (isIos()) {
			setShowIosHint(true);
			return;
		}
		const onPrompt = (e: Event) => {
			e.preventDefault();
			setDeferred(e as BeforeInstallPromptEvent);
		};
		window.addEventListener('beforeinstallprompt', onPrompt);
		return () => window.removeEventListener('beforeinstallprompt', onPrompt);
	}, [dismissed]);

	const dismiss = () => {
		writeSessionValue(ConfigKeys.InstallPromptDismissed, 'true');
		setDismissed(true);
		setDeferred(null);
		setShowIosHint(false);
	};

	const install = async () => {
		if (!deferred) return;
		await deferred.prompt();
		const { outcome } = await deferred.userChoice;
		// Accepted → the OS install sheet already did its job, don't nag again.
		// Declined → this exact prompt object is now spent (Chrome only lets
		// you call it once), but leave the banner up so the visible "×" still
		// works instead of silently vanishing.
		if (outcome === 'accepted') dismiss();
		else setDeferred(null);
	};

	if (dismissed || (!deferred && !showIosHint)) return null;

	return (
		<div className='r-install' role='dialog' aria-label='Install GO Pokédex'>
			<img className='r-install-ic' src='/logo192.png' alt='' aria-hidden='true' />
			<div className='r-install-copy'>
				<b>Install GO Pokédex</b>
				<span>
					{showIosHint
						? 'Tap Share, then “Add to Home Screen” — full screen, no browser bar.'
						: 'Add it to your home screen for a full-screen, app-like experience.'}
				</span>
			</div>
			{deferred && (
				<button type='button' className='r-install-btn' onClick={() => void install()}>
					Install
				</button>
			)}
			<button type='button' className='r-install-close' aria-label='Dismiss' onClick={dismiss}>
				×
			</button>
		</div>
	);
};

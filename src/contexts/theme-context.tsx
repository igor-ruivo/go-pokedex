import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

export enum Theme {
	System,
	Light,
	Dark,
}

export type ResolvedTheme = 'light' | 'dark';

/** The page colour behind everything, per theme (mirrors `--bg` in theme.css): the browser's own bars and overscroll use it. */
export const THEME_COLOR: Record<ResolvedTheme, string> = { dark: '#0b0e14', light: '#f4f6fb' };

const SYSTEM_LIGHT_QUERY = '(prefers-color-scheme: light)';

const systemTheme = (): ResolvedTheme =>
	typeof window !== 'undefined' && window.matchMedia(SYSTEM_LIGHT_QUERY).matches ? 'light' : 'dark';

interface ThemeContextType {
	/** What the player chose: follow the device (the default), or light, or dark. */
	theme: Theme;
	/** What is actually showing — `System` resolved against the device. Always written to the root's `data-theme`. */
	dataTheme: ResolvedTheme;
	updateTheme: (newTheme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
};

const storedTheme = (): Theme => {
	const cached = readPersistentValue(ConfigKeys.DefaultTheme);
	if (cached === null) return Theme.System;
	const value = Number(cached);
	return [Theme.Light, Theme.Dark].find((t) => Number(t) === value) ?? Theme.System;
};

export const ThemeProvider = (props: React.PropsWithChildren<object>) => {
	const [theme, setTheme] = useState<Theme>(storedTheme);
	const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

	// While following the device, follow it live (the OS switching at sunset, say).
	useEffect(() => {
		const query = window.matchMedia(SYSTEM_LIGHT_QUERY);
		const onChange = () => setSystem(query.matches ? 'light' : 'dark');
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}, []);

	const dataTheme: ResolvedTheme = theme === Theme.Light ? 'light' : theme === Theme.Dark ? 'dark' : system;

	// The page itself (not just the app root) follows too: overscroll, the browser's bars, native controls.
	useEffect(() => {
		const root = document.documentElement;
		root.dataset.theme = dataTheme;
		root.style.colorScheme = dataTheme;
		root.style.backgroundColor = THEME_COLOR[dataTheme];
		// The browser's own bars take their tint from this tag. Safari on an iPhone only reads it as the page loads, so a switch of theme made
		// in the page shows in the tint of the notch and the status bar from the next load on (nothing the page can do about it).
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[dataTheme]);
	}, [dataTheme]);

	const updateTheme = useCallback((newTheme: Theme) => {
		writePersistentValue(ConfigKeys.DefaultTheme, JSON.stringify(newTheme));
		setTheme(newTheme);
	}, []);

	return <ThemeContext.Provider value={{ theme, dataTheme, updateTheme }}>{props.children}</ThemeContext.Provider>;
};

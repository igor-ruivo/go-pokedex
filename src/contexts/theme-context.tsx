import { createContext, useCallback, useContext, useState } from 'react';

import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

export enum Theme {
	System,
	Light,
	Dark,
}

// Light mode needs more polish before it's user-facing — force dark and
// ignore any stored/system preference until it's ready. Flip this back on
// (and re-add the Appearance picker in Settings.tsx / SettingsMenu.tsx) once
// the light palette has been reworked; nothing else needs to change.
const LIGHT_MODE_ENABLED = false;

/** `data-theme` is only written for an explicit choice — `System` resolves
 *  to `undefined` so the `.rvmp` root carries no attribute at all, leaving
 *  it to the plain `prefers-color-scheme` block in rvmp.css. */
const DATA_THEME: Partial<Record<Theme, 'light' | 'dark'>> = {
	[Theme.Light]: 'light',
	[Theme.Dark]: 'dark',
};

interface ThemeContextType {
	theme: Theme;
	/** what to put on the `.rvmp` root's `data-theme` attribute — Shell reads
	 *  this directly, `undefined` meaning "omit the attribute". */
	dataTheme: 'light' | 'dark' | undefined;
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

export const ThemeProvider = (props: React.PropsWithChildren<object>) => {
	const getDefaultTheme = useCallback(() => {
		if (!LIGHT_MODE_ENABLED) return Theme.Dark;
		const cached = readPersistentValue(ConfigKeys.DefaultTheme);
		if (!cached) {
			return Theme.System; // defaults to the device's current setting
		}
		return +cached as Theme;
	}, []);

	const [theme, setTheme] = useState(getDefaultTheme());

	const updateTheme = useCallback((newTheme: Theme) => {
		if (!LIGHT_MODE_ENABLED) return;
		writePersistentValue(ConfigKeys.DefaultTheme, JSON.stringify(newTheme));
		setTheme(newTheme);
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, dataTheme: DATA_THEME[theme], updateTheme }}>
			{props.children}
		</ThemeContext.Provider>
	);
};

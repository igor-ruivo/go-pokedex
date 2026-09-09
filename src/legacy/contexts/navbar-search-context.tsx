import { createContext, useCallback, useContext, useState } from 'react';

import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';

interface NavbarSearchContextType {
	inputText: string;
	updateInputText: (newInputText: string) => void;
}

const NavbarSearchContext = createContext<NavbarSearchContextType | undefined>(undefined);

export const useNavbarSearchInput = (): NavbarSearchContextType => {
	const context = useContext(NavbarSearchContext);
	if (!context) {
		throw new Error('useNavbarSearchInput must be used within a NavbarSearchProvider');
	}
	return context;
};

/**
 * Holds only the live search-box text. The sticky grid filters (types, family
 * tree, mega/shadow/XL toggles) live in the URL — see `useGridFilters`.
 */
export const NavbarSearchProvider = (props: React.PropsWithChildren<object>) => {
	const [inputText, setInputText] = useState(readSessionValue(ConfigKeys.SearchInputText) ?? '');

	const updateInputText = useCallback((newInputText: string) => {
		writeSessionValue(ConfigKeys.SearchInputText, newInputText);
		setInputText(newInputText);
	}, []);

	return (
		<NavbarSearchContext.Provider value={{ inputText, updateInputText }}>{props.children}</NavbarSearchContext.Provider>
	);
};

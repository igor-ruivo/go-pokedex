import { createContext, useCallback, useContext, useState } from 'react';

import type { PokemonTypes } from '../DTOs/PokemonTypes';
import {
	ConfigKeys,
	readPersistentValue,
	readSessionValue,
	writePersistentValue,
	writeSessionValue,
} from '../utils/persistent-configs-handler';

interface NavbarSearchContextType {
	inputText: string;
	updateInputText: (newInputText: string) => void;
	familyTree: boolean;
	toggleFamilyTree: () => void;
	showMega: boolean;
	toggleShowMega: () => void;
	showShadow: boolean;
	toggleShowShadow: () => void;
	showXL: boolean;
	toggleShowXL: () => void;
	type1Filter: PokemonTypes | undefined;
	updateType1: (newType: PokemonTypes | undefined) => void;
	type2Filter: PokemonTypes | undefined;
	updateType2: (newType: PokemonTypes | undefined) => void;
}

const NavbarSearchContext = createContext<NavbarSearchContextType | undefined>(undefined);

export const useNavbarSearchInput = (): NavbarSearchContextType => {
	const context = useContext(NavbarSearchContext);
	if (!context) {
		throw new Error('useNavbarSearchInput must be used within a NavbarSearchProvider');
	}
	return context;
};

const parsePersistentCachedBooleanValue = (key: ConfigKeys, defaultValue: boolean) => {
	const cachedValue = readPersistentValue(key);
	if (cachedValue === null) {
		return defaultValue;
	}
	return cachedValue === 'true';
};

const parseSessionCachedBooleanValue = (key: ConfigKeys, defaultValue: boolean) => {
	const cachedValue = readSessionValue(key);
	if (cachedValue === null) {
		return defaultValue;
	}
	return cachedValue === 'true';
};

const getDefaultType = (key: ConfigKeys) => {
	const cachedValue = readSessionValue(key);
	if (!cachedValue || cachedValue === 'undefined') {
		return undefined;
	}

	const parsed: unknown = JSON.parse(cachedValue);

	const typedValue = parsed as PokemonTypes;
	return typedValue;
};

export const NavbarSearchProvider = (props: React.PropsWithChildren<object>) => {
	const [inputText, setInputText] = useState(readSessionValue(ConfigKeys.SearchInputText) ?? '');
	const [familyTree, setFamilyTree] = useState(parsePersistentCachedBooleanValue(ConfigKeys.ShowFamilyTree, true));
	const [showMega, setShowMega] = useState(parsePersistentCachedBooleanValue(ConfigKeys.ShowMega, true));
	const [showShadow, setShowShadow] = useState(parseSessionCachedBooleanValue(ConfigKeys.ShowShadow, true));
	const [showXL, setShowXL] = useState(parseSessionCachedBooleanValue(ConfigKeys.ShowXL, true));
	const [type1Filter, setType1Filter] = useState(getDefaultType(ConfigKeys.Type1));
	const [type2Filter, setType2Filter] = useState(getDefaultType(ConfigKeys.Type2));

	const updateInputText = useCallback((newInputText: string) => {
		writeSessionValue(ConfigKeys.SearchInputText, newInputText);
		setInputText(newInputText);
	}, []);

	const toggleFamilyTree = useCallback(() => {
		setFamilyTree((p) => {
			writePersistentValue(ConfigKeys.ShowFamilyTree, (!p).toString());
			return !p;
		});
	}, []);

	const toggleShowMega = useCallback(() => {
		setShowMega((p) => {
			writePersistentValue(ConfigKeys.ShowMega, (!p).toString());
			return !p;
		});
	}, []);

	const toggleShowShadow = useCallback(() => {
		setShowShadow((p) => {
			writeSessionValue(ConfigKeys.ShowShadow, (!p).toString());
			return !p;
		});
	}, []);

	const toggleShowXL = useCallback(() => {
		setShowXL((p) => {
			writeSessionValue(ConfigKeys.ShowXL, (!p).toString());
			return !p;
		});
	}, []);

	const updateType2 = useCallback((newType: PokemonTypes | undefined) => {
		writeSessionValue(ConfigKeys.Type2, JSON.stringify(newType));
		setType2Filter(newType);
	}, []);

	const updateType1 = useCallback(
		(newType: PokemonTypes | undefined) => {
			writeSessionValue(ConfigKeys.Type1, JSON.stringify(newType));
			setType1Filter(newType);

			if (newType === undefined) {
				updateType2(undefined);
			}

			if (newType === type2Filter) {
				updateType2(undefined);
			}
		},
		[type2Filter, updateType2]
	);

	return (
		<NavbarSearchContext.Provider
			value={{
				inputText,
				updateInputText,
				familyTree,
				toggleFamilyTree,
				showMega,
				toggleShowMega,
				showShadow,
				toggleShowShadow,
				showXL,
				toggleShowXL,
				type1Filter,
				updateType1,
				type2Filter,
				updateType2,
			}}
		>
			{props.children}
		</NavbarSearchContext.Provider>
	);
};

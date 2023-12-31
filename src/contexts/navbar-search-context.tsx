import { createContext, useContext, useState } from 'react';
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue, writeSessionValue } from '../utils/persistent-configs-handler';

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
}

const NavbarSearchContext = createContext<NavbarSearchContextType | undefined>(undefined);

export const useNavbarSearchInput = (): NavbarSearchContextType => {
    const context = useContext(NavbarSearchContext);
    if (!context) {
        throw new Error("useNavbarSearchInput must be used within a NavbarSearchProvider");
    }
    return context;
};

const parsePersistentCachedBooleanValue = (key: ConfigKeys, defaultValue: boolean) => {
    const cachedValue = readPersistentValue(key);
    if (cachedValue === null) {
        return defaultValue;
    }
    return cachedValue === "true";
}

const parseSessionCachedBooleanValue = (key: ConfigKeys, defaultValue: boolean) => {
    const cachedValue = readSessionValue(key);
    if (cachedValue === null) {
        return defaultValue;
    }
    return cachedValue === "true";
}

export const NavbarSearchProvider = (props: React.PropsWithChildren<{}>) => {

    const [inputText, setInputText] = useState(readSessionValue(ConfigKeys.SearchInputText) ?? "");
    const [familyTree, setFamilyTree] = useState(parsePersistentCachedBooleanValue(ConfigKeys.ShowFamilyTree, true));
    const [showMega, setShowMega] = useState(parsePersistentCachedBooleanValue(ConfigKeys.ShowMega, true));
    const [showShadow, setShowShadow] = useState(parseSessionCachedBooleanValue(ConfigKeys.ShowShadow, true));
    const [showXL, setShowXL] = useState(parseSessionCachedBooleanValue(ConfigKeys.ShowXL, true));

    const updateInputText = (newInputText: string) => {
        writeSessionValue(ConfigKeys.SearchInputText, newInputText);
        setInputText(newInputText);
    }

    const toggleFamilyTree = () => {
        setFamilyTree(p => {
            writePersistentValue(ConfigKeys.ShowFamilyTree, (!p).toString());
            return !p;
        });
    }

    const toggleShowMega = () => {
        setShowMega(p => {
            writePersistentValue(ConfigKeys.ShowMega, (!p).toString());
            return !p;
        });
    }

    const toggleShowShadow = () => {
        setShowShadow(p => {
            writeSessionValue(ConfigKeys.ShowShadow, (!p).toString());
            return !p;
        });
    }

    const toggleShowXL = () => {
        setShowXL(p => {
            writeSessionValue(ConfigKeys.ShowXL, (!p).toString());
            return !p;
        });
    }
  
    return (
        <NavbarSearchContext.Provider value={{ inputText, updateInputText, familyTree, toggleFamilyTree, showMega, toggleShowMega, showShadow, toggleShowShadow, showXL, toggleShowXL }}>
            {props.children}
        </NavbarSearchContext.Provider>
    );
}
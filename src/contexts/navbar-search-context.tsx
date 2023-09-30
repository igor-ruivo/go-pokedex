import { createContext, useContext, useState } from 'react';
import { ConfigKeys, readSessionValue, writeSessionValue } from '../utils/persistent-configs-handler';

interface NavbarSearchContextType {
    inputText: string;
    updateInputText: (newInputText: string) => void;
}

const NavbarSearchContext = createContext<NavbarSearchContextType | undefined>(undefined);

export const useNavbarSearchInput = (): NavbarSearchContextType => {
    const context = useContext(NavbarSearchContext);
    if (!context) {
        throw new Error("useNavbarSearchInput must be used within a NavbarSearchProvider");
    }
    return context;
};

export const NavbarSearchProvider = (props: React.PropsWithChildren<{}>) => {

    const [inputText, setInputText] = useState(readSessionValue(ConfigKeys.SearchInputText) ?? "");

    const updateInputText = (newInputText: string) => {
        writeSessionValue(ConfigKeys.SearchInputText, newInputText);
        setInputText(newInputText);
    }
  
    return (
        <NavbarSearchContext.Provider value={{ inputText, updateInputText }}>
            {props.children}
        </NavbarSearchContext.Provider>
    );
}
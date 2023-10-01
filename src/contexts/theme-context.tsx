import { createContext, useContext, useEffect, useState } from 'react';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../utils/persistent-configs-handler';

export enum Theme {
    Light,
    Dark
}

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

export const ThemeProvider = (props: React.PropsWithChildren<{}>) => {
    const isBrowserDefaultLight = () => window.matchMedia("(prefers-color-scheme: light)").matches;
    const getDefaultTheme = (): Theme => {
        const cachedTheme = readPersistentValue(ConfigKeys.DefaultTheme);
        if (cachedTheme) {
            return +cachedTheme;
        }
        const browserDefault = isBrowserDefaultLight() ? Theme.Light : Theme.Dark;
        //return browserDefault;
        return Theme.Dark; //TODO: only release light mode with ready
    }

    const [theme, setTheme] = useState(getDefaultTheme());

    useEffect(() => {
        if (theme === Theme.Dark) {
            document.body.style.background = "#202023"
            document.body.classList.remove("theme-light");
            document.body.classList.add("theme-dark");
        } else {
            document.body.style.background = "#f8f8fa"
            document.body.classList.remove("theme-dark");
            document.body.classList.add("theme-light");
        }
    }, [theme]);
  
    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === Theme.Light ? Theme.Dark : Theme.Light;
            writePersistentValue(ConfigKeys.DefaultTheme, newTheme.toString());
            return newTheme;
        });
    }
  
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {props.children}
        </ThemeContext.Provider>
    );
}
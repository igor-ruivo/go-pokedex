import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePokemon } from "../../contexts/pokemon-context";
import SearchableDropdown from "../SearchableDropdown";
import "./Navbar.scss";
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue } from "../../utils/persistent-configs-handler";
import { ListType } from "../../views/pokedex";
import { useEffect, useState } from "react";
import { GameLanguage, Language, useLanguage } from "../../contexts/language-context";
import Select from "react-select"
import translator, { TranslatorKeys } from "../../utils/Translator";

enum Theme {
    Light,
    Dark
}

const Navbar = () => {
    const getSystemThemePreference = () => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return Theme.Dark;
        }
        return Theme.Light;
    }

    const [systemDefaultTheme, setSystemDefaultTheme] = useState<Theme>(getSystemThemePreference());

    const getDefaultTheme = () => {
        const currentTheme = readPersistentValue(ConfigKeys.DefaultTheme);
        if (!currentTheme) {
            return systemDefaultTheme;
        }

        return +currentTheme as Theme;
    }

    const [theme, setTheme] = useState<Theme>(getDefaultTheme());
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const [optionsOpened, setOptionsOpened] = useState(false);
    const {currentLanguage, currentGameLanguage, updateCurrentLanguage, updateCurrentGameLanguage} = useLanguage();

    useEffect(() => {
        const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        const themeHandlerFunc = (event: MediaQueryListEvent) => {
            const newColorScheme = event.matches ? Theme.Dark : Theme.Light;
            setSystemDefaultTheme(newColorScheme);
        }

        mediaQueryList.addEventListener('change', themeHandlerFunc);

        return () => mediaQueryList.removeEventListener('change', themeHandlerFunc);
    }, []);

    useEffect(() => {
        switch (getDefaultTheme()) {
            case Theme.Light:
                document.body.classList.add('theme-light');
                document.body.classList.remove('theme-dark');
                break;
            case Theme.Dark:
                document.body.classList.add('theme-dark');
                document.body.classList.remove('theme-light');
                break;
        }
    }, [systemDefaultTheme, theme]);
    
    type EntryType = {
        value: string,
        label: string
    }

    const handleThemeToggle = (newTheme: Theme) => {
        writePersistentValue(ConfigKeys.DefaultTheme, JSON.stringify(newTheme));
        setTheme(newTheme);
    }

    const getDestination = () => {
        if (pathname === "/") {
            return "/";
        }
        let destinationPath = "";
        const previousRankType = readSessionValue(ConfigKeys.LastListType);
        if (previousRankType === null || pathname.includes("great") || pathname.includes("ultra") || pathname.includes("master")) {    
            return "/";
        }

        switch (+previousRankType as ListType) {
            case ListType.GREAT_LEAGUE:
                destinationPath = "great";
                break;
            case ListType.ULTRA_LEAGUE:
                destinationPath = "ultra";
                break;
            case ListType.MASTER_LEAGUE:
                destinationPath = "master";
                break;
        }

        return `/${destinationPath}`;
    }

    type Entry<T> = {
        label: string,
        value: T,
        hint: string
    }

    const languageOptions: Entry<Language>[] = [
        {
            label: "English",
            value: Language.English,
            hint: "https://i.imgur.com/9gMorO5.png"
        },
        {
            label: "Português",
            value: Language.Portuguese,
            hint: "https://i.imgur.com/YUXHN0U.png"
        },
        {
            label: "Bosanski",
            value: Language.Bosnian,
            hint: "https://i.imgur.com/kn0M3hW.png"
        }
    ];

    const themeToHint = (theme: Theme) => {
        switch (theme) {
            case Theme.Light:
                return "🔆";
            case Theme.Dark:
                return "🌙";
        }
    }

    const themeOptions: Entry<Theme>[] = [
        {
            hint: themeToHint(Theme.Light),
            label: "Light",
            value: Theme.Light
        },
        {
            hint: themeToHint(Theme.Dark),
            label: "Dark",
            value: Theme.Dark
        }
    ];

    const gameLanguageOptions: Entry<GameLanguage>[] = [
        {
            label: "English",
            value: GameLanguage.English,
            hint: "https://i.imgur.com/9gMorO5.png"
        },
        {
            label: "Português",
            value: GameLanguage.Portuguese,
            hint: "https://i.imgur.com/YUXHN0U.png"
        }
    ];

    return <>
        <header className="navbar">
            <section className="navbar-section">
                <Link to={getDestination()} className="navbar-logo">
                    <img className="navbar-logo-image" alt="GO-Pokedéx" loading="lazy" decoding="async" src="https://i.imgur.com/eBscnsv.png"/>  
                </Link>
                <button
                    className="navbar-menu"
                    onClick={() => setOptionsOpened(previous => !previous)}
                >
                    <img className={"navbar-menu-img" + (optionsOpened ? " cross" : "")} alt="Menu" loading="lazy" width="24" height="20" decoding="async" src={optionsOpened ? "https://i.imgur.com/SWpKr1C.png" : "https://i.imgur.com/NEVZ0qK.png"}/>
                    <span>{translator(TranslatorKeys.Menu, currentLanguage)}</span>
                </button>
                <div className="search-wrapper">
                    <SearchableDropdown
                        options={!fetchCompleted ? [] : Object.values(gamemasterPokemon).filter(p => {
                            if (pathname.startsWith("/great") || pathname.startsWith("/ultra") || pathname.startsWith("/master") || pathname.startsWith("/pokemon")) {
                                return true;
                            }
                            return !p.isShadow;
                        }).map(p => ({value: p.speciesId, label: p.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} as EntryType))}
                        isLoading={!fetchCompleted}
                        onSelection={(selectedEntry: EntryType) => pathname.startsWith("/pokemon") && navigate(`/pokemon/${selectedEntry.value}${pathname.substring(pathname.lastIndexOf("/"))}`)}
                    />
                </div>
            </section>
        </header>
        <aside className={"options-menu" + (!optionsOpened ? " hidden" : " visible")}>
            <nav className="options-nav">
                <section>
                    <strong>
                        <span className="strong-underline">
                            {translator(TranslatorKeys.Settings, currentLanguage)}
                        </span>
                    </strong>
                    <ul className="options-ul">
                        <li className="options-li">
                            <div className="option-entry">
                                <span>
                                    {translator(TranslatorKeys.Language, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown"
                                    isSearchable={false}
                                    options={languageOptions}
                                    value={languageOptions.find(l => l.value === currentLanguage)}
                                    onChange={v => updateCurrentLanguage(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><img alt="flag" className="country-flag" src={data.hint} height={17} /><span>{data.label}</span></div>}
                                />
                            </div>
                        </li>
                        <li className="options-li">
                            <div className="option-entry">
                                <span>
                                    {translator(TranslatorKeys.GameLanguage, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown"
                                    isSearchable={false}
                                    options={gameLanguageOptions}
                                    value={gameLanguageOptions.find(l => l.value === currentGameLanguage)}
                                    onChange={v => updateCurrentGameLanguage(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><img alt="flag" className="country-flag" src={data.hint} height={17} /><span>{data.label}</span></div>}
                                />
                            </div>
                        </li>
                        <li className="options-li">
                            <div className="option-entry">
                                <span>
                                    {translator(TranslatorKeys.Theme, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown"
                                    isSearchable={false}
                                    options={themeOptions}
                                    value={themeOptions.find(l => l.value === getDefaultTheme())}
                                    onChange={v => handleThemeToggle(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><span>{data.hint} {data.label}</span></div>}
                                />
                            </div>
                        </li>
                    </ul>
                </section>
            </nav>
        </aside>
    </>
}

export default Navbar;
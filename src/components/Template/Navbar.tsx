import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePokemon } from "../../contexts/pokemon-context";
import SearchableDropdown from "../SearchableDropdown";
import "./Navbar.scss";
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue } from "../../utils/persistent-configs-handler";
import { ListType } from "../../views/pokedex";
import { useCallback, useEffect, useState } from "react";
import { GameLanguage, Language, useLanguage } from "../../contexts/language-context";
import Select from "react-select";
import translator, { TranslatorKeys } from "../../utils/Translator";
import { Box } from "@mui/material";
import PokemonImage from "../PokemonImage";
import { ImageSource, useImageSource } from "../../contexts/imageSource-context";
import gameTranslator, { GameTranslatorKeys } from "../../utils/GameTranslator";
import { PokemonTypes } from "../../DTOs/PokemonTypes";
import { useNavbarSearchInput } from "../../contexts/navbar-search-context";

enum ThemeValues {
    Light,
    Dark
}

enum ThemeOptions {
    Light,
    Dark,
    SystemDefault
}
    
export type EntryType = {
    value: string,
    label: string
}

const Navbar = () => {
    const getSystemThemePreference = () => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return ThemeValues.Dark;
        }
        return ThemeValues.Light;
    }

    const [systemDefaultTheme, setSystemDefaultTheme] = useState<ThemeValues>(getSystemThemePreference());

    const getDefaultTheme = () => {
        const currentTheme = readPersistentValue(ConfigKeys.DefaultTheme);
        if (!currentTheme) {
            return ThemeOptions.SystemDefault;
        }

        return +currentTheme as ThemeOptions;
    }

    const getComputedTheme = useCallback(() => {
        const currentTheme = readPersistentValue(ConfigKeys.DefaultTheme);
        if (!currentTheme || currentTheme === ThemeOptions.SystemDefault.toString()) {
            return systemDefaultTheme;
        }

        return +currentTheme as ThemeValues;
    }, [systemDefaultTheme]);

    enum AvailableOptions {
        None,
        Menu,
        Filter
    }

    const [theme, setTheme] = useState<ThemeOptions>(getDefaultTheme());
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const [optionsOpened, setOptionsOpened] = useState(AvailableOptions.None);
    const {currentLanguage, currentGameLanguage, updateCurrentLanguage, updateCurrentGameLanguage} = useLanguage();
    const {imageSource, updateImageSource} = useImageSource();
    const {familyTree, toggleFamilyTree, showMega, toggleShowMega, showShadow, toggleShowShadow, showXL, toggleShowXL} = useNavbarSearchInput();

    useEffect(() => {
        const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        const themeHandlerFunc = (event: MediaQueryListEvent) => {
            const newColorScheme = event.matches ? ThemeValues.Dark : ThemeValues.Light;
            setSystemDefaultTheme(newColorScheme);
        }

        mediaQueryList.addEventListener('change', themeHandlerFunc);

        return () => mediaQueryList.removeEventListener('change', themeHandlerFunc);
    }, []);

    useEffect(() => {
        switch (getComputedTheme()) {
            case ThemeValues.Light:
                document.body.classList.add('theme-light');
                document.body.classList.remove('theme-dark');
                break;
            case ThemeValues.Dark:
                document.body.classList.add('theme-dark');
                document.body.classList.remove('theme-light');
                break;
        }
    }, [getComputedTheme, theme]);

    const handleThemeToggle = (newTheme: ThemeOptions) => {
        writePersistentValue(ConfigKeys.DefaultTheme, JSON.stringify(newTheme));
        setTheme(newTheme);
    }

    const getDestination = () => {
        if (pathname === "/") {
            return "/";
        }
        let destinationPath = "";
        const previousRankType = readSessionValue(ConfigKeys.LastListType);
        if (previousRankType === null || pathname.includes("great") || pathname.includes("ultra") || pathname.includes("master") || pathname.includes("custom") || pathname.includes("raid")) {    
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
            case ListType.CUSTOM_CUP:
                destinationPath = "custom";
                break;
            case ListType.RAID:
                destinationPath = "raid";
                break;
        }

        return `/${destinationPath}`;
    }

    type Entry<T> = {
        label: string,
        value: T,
        hint: string,
        invertOnDarkMode?: boolean
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

    const themeToHint = (theme: ThemeValues) => {
        switch (theme) {
            case ThemeValues.Light:
                return "🔆";
            case ThemeValues.Dark:
                return "🌙";
        }
    }

    const themeOptions: Entry<ThemeOptions>[] = [
        {
            hint: themeToHint(systemDefaultTheme),
            label: translator(TranslatorKeys.SystemDefault, currentLanguage),
            value: ThemeOptions.SystemDefault
        },
        {
            hint: themeToHint(ThemeValues.Light),
            label: translator(TranslatorKeys.LightTheme, currentLanguage),
            value: ThemeOptions.Light
        },
        {
            hint: themeToHint(ThemeValues.Dark),
            label: translator(TranslatorKeys.DarkTheme, currentLanguage),
            value: ThemeOptions.Dark
        }
    ];

    const sourceOptions: Entry<ImageSource>[] = [
        {
            hint: "https://i.imgur.com/nPnjxcq.png",
            label: translator(TranslatorKeys.Official, currentLanguage),
            value: ImageSource.Official
        },
        {
            hint: "https://i.imgur.com/72hP089.png",
            label: "Pokémon GO",
            value: ImageSource.GO
        },
        {
            hint: `${process.env.PUBLIC_URL}/vectors/shiny.svg`,
            invertOnDarkMode: true,
            label: gameTranslator(GameTranslatorKeys.Shiny, currentGameLanguage),
            value: ImageSource.Shiny
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
            hint: "https://i.imgur.com/AEOlghs.png"
        }
    ];

    const typesOptions: Entry<PokemonTypes>[] = Object.keys(PokemonTypes).filter(key => !isNaN(Number(PokemonTypes[key as keyof typeof PokemonTypes]))).map(k => ({
        label: k,
        value: PokemonTypes[k as keyof typeof PokemonTypes],
        hint: `${process.env.PUBLIC_URL}/images/types/${k.toLocaleLowerCase()}.png`
    }));

    return <>
        <header className="navbar">
            <section className="navbar-section">
                <Link to={getDestination()} className="navbar-logo">
                    <img className="navbar-logo-image" alt="GO-Pokedéx" loading="lazy" decoding="async" src="https://i.imgur.com/eBscnsv.png"/>  
                </Link>
                <button
                    className="navbar-menu"
                    onClick={() => setOptionsOpened(p => p === AvailableOptions.Menu ? AvailableOptions.None : AvailableOptions.Menu)}
                >
                    <img className={"navbar-menu-img" + (optionsOpened === AvailableOptions.Menu ? " cross" : "")} alt="Menu" loading="lazy" width="24" height="20" decoding="async" src={optionsOpened === AvailableOptions.Menu ? "https://i.imgur.com/SWpKr1C.png" : "https://i.imgur.com/NEVZ0qK.png"}/>
                    <span>{translator(TranslatorKeys.Menu, currentLanguage)}</span>
                </button>
                <div className="search-wrapper">
                    <SearchableDropdown
                        options={!fetchCompleted ? [] : Object.values(gamemasterPokemon).filter(p => {
                            if (p.aliasId) {
                                return false;
                            }
                            
                            if (pathname.startsWith("/great") || pathname.startsWith("/ultra") || pathname.startsWith("/master") || pathname.startsWith("/custom")) {
                                return !p.isMega/* && (showShadow || !p.isShadow) && (showXL || !needsXLCandy(p, pathname.startsWith("/great") ? 1500 : pathname.startsWith("/ultra") ? 2500 : pathname.startsWith("/custom") ? 500 : 0))*/;
                            }

                            if (pathname.startsWith("/pokemon")) {
                                return true;
                            }

                            if (pathname.startsWith("/raid")) {
                                return true/*(showMega || !p.isMega) && (showShadow || !p.isShadow) && (showXL || !needsXLCandy(p, pathname.startsWith("/great") ? 1500 : pathname.startsWith("/ultra") ? 2500 : pathname.startsWith("/custom") ? 500 : 0))*/;
                            }

                            return !p.isShadow/* && (showMega || !p.isMega)*/;
                        }).map(p => ({value: p.speciesId, label: p.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))} as EntryType))}
                        isLoading={!fetchCompleted}
                        onSelection={(selectedEntry: EntryType) => pathname.startsWith("/pokemon") && navigate(`/pokemon/${selectedEntry.value}${pathname.substring(pathname.lastIndexOf("/"))}`)}
                        renderOption={(props: any, option: EntryType) => (
                            <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                              <PokemonImage
                                pokemon={gamemasterPokemon[option.value]}
                                lazy
                                withName={false}
                                specificHeight={28}
                                specificWidth={28}
                                lowRes
                              />
                              {option.label}
                            </Box>
                        )}
                    />
                </div>
                <button
                    className="navbar-filter"
                    onClick={() => setOptionsOpened(p => p === AvailableOptions.Filter ? AvailableOptions.None : AvailableOptions.Filter)}
                >
                    <img className={"navbar-menu-img invert-dark-mode"} alt="Filter" loading="lazy" width="24" height="20" decoding="async" src={`${process.env.PUBLIC_URL}/images/filter.png`}/>
                </button>
            </section>
        </header>
        <aside className={"options-menu" + (optionsOpened !== AvailableOptions.Menu ? " hidden" : " visible")}>
            <nav className="options-nav">
                <section>
                    <strong>
                        <span className="strong-underline">
                            {translator(TranslatorKeys.LanguageSettings, currentLanguage)}
                        </span>
                    </strong>
                    <ul className="options-ul">
                        <li className="options-li">
                            <div className="option-entry">
                                <span>
                                    {translator(TranslatorKeys.Language, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown navbar-dropdown-menu"
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
                                    className="navbar-dropdown navbar-dropdown-menu"
                                    isSearchable={false}
                                    options={gameLanguageOptions}
                                    value={gameLanguageOptions.find(l => l.value === currentGameLanguage)}
                                    onChange={v => updateCurrentGameLanguage(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><img alt="flag" className="country-flag" src={data.hint} height={17} /><span>{data.label}</span></div>}
                                />
                            </div>
                        </li>
                    </ul>
                    <strong>
                        <span className="strong-underline">
                            {translator(TranslatorKeys.VisualSettings, currentLanguage)}
                        </span>
                    </strong>
                    <ul className="options-ul">
                        <li className="options-li">
                            <div className="option-entry">
                                <span>
                                    {translator(TranslatorKeys.Theme, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown navbar-dropdown-menu"
                                    isSearchable={false}
                                    options={themeOptions}
                                    value={themeOptions.find(l => l.value === getDefaultTheme())}
                                    onChange={v => handleThemeToggle(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><span>{data.hint} {data.label}</span></div>}
                                />
                            </div>
                        </li>
                        <li className="options-li">
                            <div className="option-entry">
                                <span>
                                    {translator(TranslatorKeys.Source, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown navbar-dropdown-menu"
                                    isSearchable={false}
                                    options={sourceOptions}
                                    value={sourceOptions.find(l => l.value === imageSource)}
                                    onChange={v => updateImageSource(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><img alt="flag" className={`${data.invertOnDarkMode ? "invert-dark-mode" : ""} country-flag`} src={data.hint} height={17} /><span>{data.label}</span></div>}
                                />
                            </div>
                        </li>
                    </ul>
                </section>
            </nav>
        </aside>
        <aside className={"filter-menu" + (optionsOpened !== AvailableOptions.Filter ? " hidden" : " visible")}>
            <nav className="options-nav">
                <section>
                    <strong>
                        <span className="strong-underline">
                            Grid Filtering
                        </span>
                    </strong>
                    <ul className="options-ul options-ul-filter">
                        <li className="options-li">
                            <div className="option-entry-row-filter">
                                <input type="checkbox" className="filter-checkbox" checked={familyTree} onChange={toggleFamilyTree}/> Family tree
                            </div>
                            <div className="option-entry-row-filter">
                                <input type="checkbox" className="filter-checkbox" checked={showMega} onChange={toggleShowMega}/> Mega Pokémon
                            </div>
                            <div className="option-entry-row-filter">
                                <input type="checkbox" className="filter-checkbox" checked={showShadow} onChange={toggleShowShadow}/> Shadow Pokémon
                            </div>
                            <div className="option-entry-row-filter">
                                <input type="checkbox" className="filter-checkbox" checked={showXL} onChange={toggleShowXL}/> XL Pokémon
                            </div>
                        </li>
                        <li className="options-li">
                            <div className="option-entry">
                                <span>
                                    Type 1 filter
                                </span>
                                <Select
                                    className="navbar-dropdown"
                                    isSearchable={false}
                                    options={typesOptions}
                                    value={typesOptions[8]}
                                    onChange={() => {}}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><img alt="flag" className="country-flag" src={data.hint} height={17} /><span>{data.label}</span></div>}
                                />
                            </div>
                            <div className="option-entry">
                                <span>
                                    Type 2 filter
                                </span>
                                <Select
                                    className="navbar-dropdown"
                                    isSearchable={false}
                                    options={typesOptions}
                                    value={typesOptions[8]}
                                    onChange={() => {}}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><img alt="flag" className="country-flag" src={data.hint} height={17} /><span>{data.label}</span></div>}
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
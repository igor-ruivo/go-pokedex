import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePokemon } from "../../contexts/pokemon-context";
import SearchableDropdown from "../SearchableDropdown";
import "./Navbar.scss";
import { ConfigKeys, readPersistentValue, readSessionValue, writePersistentValue } from "../../utils/persistent-configs-handler";
import { ListType } from "../../views/pokedex";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GameLanguage, Language, useLanguage } from "../../contexts/language-context";
import Select from "react-select";
import translator, { TranslatorKeys } from "../../utils/Translator";
import { Box } from "@mui/material";
import PokemonImage from "../PokemonImage";
import { ImageSource, useImageSource } from "../../contexts/imageSource-context";
import gameTranslator, { GameTranslatorKeys } from "../../utils/GameTranslator";
import { PokemonTypes } from "../../DTOs/PokemonTypes";
import { useNavbarSearchInput } from "../../contexts/navbar-search-context";
import { translatedType } from "../PokemonInfoImagePlaceholder";

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

export const hideNavbar = (scrollingDown: boolean, accumulatedScrollDownDelta: number, navbar: boolean) => {
    const threshold = 110;

    if (window.scrollY < threshold) {
        // never
        return false;
    }

    if ((window.innerHeight + Math.round(window.scrollY) + threshold / 2) >= document.body.scrollHeight) {
        // always
        return navbar;
    }

    if (scrollingDown && accumulatedScrollDownDelta > threshold) {
        return true;
    }

    if (!scrollingDown && accumulatedScrollDownDelta <= threshold / 2) {
        return true;
    }

    return false;
}

const Navbar = () => {
    const getSystemThemePreference = useCallback(() => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return ThemeValues.Dark;
        }
        return ThemeValues.Light;
    }, []);

    const [systemDefaultTheme, setSystemDefaultTheme] = useState<ThemeValues>(getSystemThemePreference());

    const getDefaultTheme = useCallback(() => {
        const currentTheme = readPersistentValue(ConfigKeys.DefaultTheme);
        if (!currentTheme) {
            return ThemeOptions.SystemDefault;
        }

        return +currentTheme as ThemeOptions;
    }, []);

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
    const {familyTree, toggleFamilyTree, showMega, toggleShowMega, showShadow, toggleShowShadow, showXL, toggleShowXL, type1Filter, updateType1, type2Filter, updateType2} = useNavbarSearchInput();
    const [scrollingDown, setScrollingDown] = useState(false);
    //to detect direction change
    const [prevScrollY, setPrevScrollY] = useState(0);
    const [accumulatedScrollDownDelta, setAccumulatedScrollDownDelta] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
        
            if (currentScrollY > prevScrollY) {
                if (!scrollingDown) {
                    setAccumulatedScrollDownDelta(0);
                }
                setScrollingDown(true);
            } else {
                if (currentScrollY < prevScrollY) {
                    if (scrollingDown) {
                        setAccumulatedScrollDownDelta(0);
                    }
                    setScrollingDown(false);
                }
            }
        
            setAccumulatedScrollDownDelta(p => p + Math.abs(currentScrollY - prevScrollY));
            setPrevScrollY(currentScrollY);
        };
    
        window.addEventListener('scroll', handleScroll);
    
        return () => window.removeEventListener('scroll', handleScroll);
    }, [prevScrollY, scrollingDown, setAccumulatedScrollDownDelta, setScrollingDown, setPrevScrollY]);

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

    const handleThemeToggle = useCallback((newTheme: ThemeOptions) => {
        writePersistentValue(ConfigKeys.DefaultTheme, JSON.stringify(newTheme));
        setTheme(newTheme);
    }, [setTheme]);

    const getDestination = useCallback(() => {
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
    }, [pathname]);

    type Entry<T> = {
        label: string,
        value: T,
        hint: string,
        invertOnDarkMode?: boolean
    }

    const languageOptions: Entry<Language>[] = useMemo(() => [
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
    ], []);

    const themeToHint = useCallback((theme: ThemeValues) => {
        switch (theme) {
            case ThemeValues.Light:
                return "🔆";
            case ThemeValues.Dark:
                return "🌙";
        }
    }, []);

    const themeOptions: Entry<ThemeOptions>[] = useMemo(() => [
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
    ], [systemDefaultTheme, currentLanguage, themeToHint]);

    const sourceOptions: Entry<ImageSource>[] = useMemo(() => [
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
            hint: `/vectors/shiny.svg`,
            invertOnDarkMode: true,
            label: gameTranslator(GameTranslatorKeys.Shiny, currentGameLanguage),
            value: ImageSource.Shiny
        }
    ], [currentLanguage, currentGameLanguage]);

    const gameLanguageOptions: Entry<GameLanguage>[] = useMemo(() => [
        {
            label: "English",
            value: GameLanguage.en,
            hint: "https://i.imgur.com/9gMorO5.png"
        },
        {
            label: "Português",
            value: GameLanguage.ptbr,
            hint: "https://i.imgur.com/AEOlghs.png"
        }
    ], []);

    const typesOptions: Entry<PokemonTypes | undefined>[] = useMemo(() => [{label: translator(TranslatorKeys.Any, currentLanguage), value: undefined, hint: ""}, ...Object.keys(PokemonTypes).filter(key => isNaN(Number(PokemonTypes[key as keyof typeof PokemonTypes]))).map(k => ({
        label: translatedType(PokemonTypes[k as keyof typeof PokemonTypes], currentLanguage),
        value: PokemonTypes[k as keyof typeof PokemonTypes],
        hint: `/images/types/${PokemonTypes[k as keyof typeof PokemonTypes].toString().toLocaleLowerCase()}.png`
    }))], [currentLanguage]);

    const megaDisabled = useMemo(() => pathname.includes("great") || pathname.includes("ultra") || pathname.includes("master") || pathname.includes("custom"), [pathname]);
    const shadowDisabled = useMemo(() => !(pathname.includes("great") || pathname.includes("ultra") || pathname.includes("master") || pathname.includes("custom") || pathname.includes("raid")), [pathname]);
    const xlDisabled = useMemo(() => !(pathname.includes("great") || pathname.includes("ultra") || pathname.includes("custom")), [pathname]);

    const handleModalClick = useCallback((e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        setOptionsOpened(AvailableOptions.None);
        e.stopPropagation();
        e.preventDefault();
    }, [setOptionsOpened, AvailableOptions])

    const hasSessionChanges = useMemo(() => !showShadow || !showXL || type1Filter, [showShadow, showXL, type1Filter]);

    return <>
        <header className={`navbar normal-text ${hideNavbar(scrollingDown, accumulatedScrollDownDelta, true) ? 'nav-hidden' : 'nav-visible'}`}>
            <section className="navbar-section">
                <Link to={getDestination()} className="navbar-logo">
                    <img className="navbar-logo-image" alt="GO-Pokedéx" loading="lazy" decoding="async" src="https://i.imgur.com/eBscnsv.png"/>  
                </Link>
                    <button
                        className="navbar-menu"
                        onClick={() => setOptionsOpened(p => p === AvailableOptions.Menu ? AvailableOptions.None : AvailableOptions.Menu)}
                    >
                        <img className={"navbar-menu-img " + (optionsOpened === AvailableOptions.Menu ? "invert-white-mode " : "invert-dark-mode ") + (optionsOpened === AvailableOptions.Menu ? " cross" : "")} alt="Menu" loading="lazy" width="16.6" height="16.6" decoding="async" src={optionsOpened === AvailableOptions.Menu ? "https://i.imgur.com/SWpKr1C.png" : `/images/cogwheel.png`}/>
                    </button>
                <div className="normal-text-descendants-all">
                    <SearchableDropdown
                        searchOpen={searchOpen}
                        setSearchOpen={setSearchOpen}
                        options={!fetchCompleted ? [] : Object.values(gamemasterPokemon).filter(p => {
                            if (p.aliasId) {
                                return false;
                            }
                            
                            if (pathname.startsWith("/great") || pathname.startsWith("/ultra") || pathname.startsWith("/master") || pathname.startsWith("/custom")) {
                                return !p.isMega/* && (showShadow || !p.isShadow) && (showXL || !needsXLCandy(p, pathname.startsWith("/great") ? 1500 : pathname.startsWith("/ultra") ? 2500 : pathname.startsWith("/custom") ? customCupCPLimit : 0))*/;
                            }

                            if (pathname.includes("pokemon") || pathname.includes("calendar")) {
                                return true;
                            }

                            if (pathname.startsWith("/raid")) {
                                return true/*(showMega || !p.isMega) && (showShadow || !p.isShadow) && (showXL || !needsXLCandy(p, pathname.startsWith("/great") ? 1500 : pathname.startsWith("/ultra") ? 2500 : pathname.startsWith("/custom") ? customCupCPLimit : 0))*/;
                            }

                            return !p.isShadow/* && (showMega || !p.isMega)*/;
                        }).map(p => ({value: p.speciesId, label: p.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage))} as EntryType))}
                        isLoading={!fetchCompleted}
                        onSelection={(selectedEntry: EntryType) => (pathname.includes("pokemon") || pathname.includes("calendar")) && navigate(`/pokemon/${selectedEntry.value}${pathname.substring(pathname.lastIndexOf("/"))}`.replace("/trash-pokemon", "/info").replace("/bosses", "/info").replace("/spawns", "/info").replace("/rockets", "/info").replace("/eggs", "/info").replace("/events", "/info"))}
                        renderOption={(props: any, option: EntryType) => (
                            <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                              <PokemonImage
                                pokemon={gamemasterPokemon[option.value]}
                                lazy
                                withName={false}
                                specificHeight={28}
                                specificWidth={28}
                              />
                              <span className="normal-text-all">{option.label}</span>
                            </Box>
                        )}
                    />
                </div>
                <div className="relative-holder">
                    {hasSessionChanges && !(pathname.includes("pokemon") || pathname.includes("calendar")) && <span className="notifications-counter heavy-weight">!</span>}
                    <button
                        className={`navbar-filter ${pathname.includes("pokemon") || pathname.includes("calendar") ? "unavailable" : ""}`}
                        onClick={() => setOptionsOpened(p => p === AvailableOptions.Filter ? AvailableOptions.None : AvailableOptions.Filter)}
                    >
                        <img className={"navbar-menu-img invert-dark-mode"} alt="Filter" loading="lazy" width="16.6" height="16.6" decoding="async" src={`/images/filter.png`}/>
                    </button>
                </div>
            </section>
        </header>
        <aside className={`options-menu normal-text ${optionsOpened !== AvailableOptions.Menu ? " hidden" : " visible"} ${hideNavbar(scrollingDown, accumulatedScrollDownDelta, true) ? 'menu-hidden' : 'menu-visible'}`}>
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
                                <span className="normal-text">
                                    {translator(TranslatorKeys.Language, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown navbar-dropdown-menu selectable-descendants"
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
                                <span className="normal-text">
                                    {translator(TranslatorKeys.GameLanguage, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown navbar-dropdown-menu selectable-descendants"
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
                                <span className="normal-text">
                                    {translator(TranslatorKeys.Theme, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown navbar-dropdown-menu selectable-descendants"
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
                                <span className="normal-text">
                                    {translator(TranslatorKeys.Source, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown navbar-dropdown-menu selectable-descendants"
                                    isSearchable={false}
                                    options={sourceOptions}
                                    value={sourceOptions.find(l => l.value === imageSource)}
                                    onChange={v => updateImageSource(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container"><img alt="flag" className={`${data.invertOnDarkMode ? "invert-dark-mode" : ""} country-flag`} src={data.hint} height={17} /><span>{data.label}</span></div>}
                                />
                            </div>
                        </li>
                    </ul>
                    <strong>
                        <span className="strong-underline">
                            {translator(TranslatorKeys.NavigationData, currentLanguage)}
                        </span>
                    </strong>
                    <ul className="options-ul">
                        <li className="options-li">
                            <div className="option-entry">
                                <span className="normal-text">
                                    {translator(TranslatorKeys.DeleteNavigationData, currentLanguage)}
                                </span>
                                <div className="fitting-content-width item contrast-border default-side-padding with-pointer important-text" onClick={() => {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    window.location.reload();
                                }}>{translator(TranslatorKeys.Delete, currentLanguage)}</div>
                            </div>
                        </li>
                    </ul>
                </section>
            </nav>
        </aside>
        <div
            className={`fake-modal ${(optionsOpened === AvailableOptions.Menu || searchOpen || (optionsOpened === AvailableOptions.Filter && !(pathname.includes("pokemon") || pathname.includes("calendar")))) ? "show" : "hide"}`}
            onClick={e => handleModalClick(e)}
        />
        <aside className={`filter-menu normal-text ${(optionsOpened !== AvailableOptions.Filter || pathname.includes("pokemon") || pathname.includes("calendar")) ? " hidden" : " visible"} ${hideNavbar(scrollingDown, accumulatedScrollDownDelta, true) ? 'menu-hidden' : 'menu-visible'}`}>
            <nav className="options-nav">
                <section>
                    <strong>
                        <span className="strong-underline normal-text">
                            {translator(TranslatorKeys.GridFiltering, currentLanguage)}
                        </span>
                    </strong>
                    <ul className="options-ul options-ul-filter">
                        <li className="options-li">
                            <div className="option-entry-row-filter" onClick={toggleFamilyTree}>
                                <input type="checkbox" className="filter-checkbox" checked={familyTree} onChange={() => {}}/> {translator(TranslatorKeys.FamilyTree, currentLanguage)}
                            </div>
                            <div onClick={() => {if (!megaDisabled) {toggleShowMega();}}} className={`option-entry-row-filter ${megaDisabled ? "unavailable" : ""}`}>
                                <input type="checkbox" className="filter-checkbox" checked={showMega} disabled={megaDisabled} onChange={() => {}}/> {translator(TranslatorKeys.MegaPokemon, currentLanguage)}
                            </div>
                            <div onClick={() => {if (!shadowDisabled) {toggleShowShadow();}}} className={`option-entry-row-filter ${shadowDisabled ? "unavailable" : ""}`}>
                                <input type="checkbox" className="filter-checkbox" checked={showShadow} disabled={shadowDisabled} onChange={() => {}}/> {translator(TranslatorKeys.ShadowPokemon, currentLanguage)}
                            </div>
                            <div onClick={() => {if (!xlDisabled) {toggleShowXL();}}} className={`option-entry-row-filter ${xlDisabled ? "unavailable" : ""}`}>
                                <input type="checkbox" className="filter-checkbox" checked={showXL} disabled={xlDisabled} onChange={() => {}}/> {translator(TranslatorKeys.XLPokemon, currentLanguage)}
                            </div>
                        </li>
                        <li className="options-li">
                            <div className="option-entry">
                                <span>
                                    {pathname.includes("raid") ? translator(TranslatorKeys.RaidType, currentLanguage) : translator(TranslatorKeys.Type, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown selectable-descendants"
                                    isSearchable={false}
                                    options={typesOptions.filter(e => e.value === undefined || type2Filter === undefined || (pathname.includes("raid") || e.value !== type2Filter))}
                                    value={type1Filter === undefined ? typesOptions[0] : typesOptions.find(l => l.value === type1Filter)}
                                    onChange={(v) => updateType1(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container">{data.hint && <img alt="flag" src={data.hint} height={17} />}<span>{data.label}</span></div>}
                                />
                            </div>
                            {type1Filter !== undefined && !pathname.includes("raid") && <div className="option-entry">
                                <span>
                                    {translator(TranslatorKeys.OrType, currentLanguage)}
                                </span>
                                <Select
                                    className="navbar-dropdown selectable-descendants"
                                    isSearchable={false}
                                    options={typesOptions.filter(e => e.value === undefined || e.value !== type1Filter)}
                                    value={type2Filter === undefined ? typesOptions[0] : typesOptions.find(l => l.value === type2Filter)}
                                    onChange={(v) => updateType2(v!.value)}
                                    formatOptionLabel={(data, _) => <div className="hint-container">{data.hint && <img alt="flag" src={data.hint} height={17} />}<span>{data.label}</span></div>}
                                />
                            </div>}
                        </li>
                    </ul>
                </section>
            </nav>
        </aside>
    </>
}

export default Navbar;
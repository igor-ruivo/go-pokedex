import { useEffect, useMemo, useRef } from 'react';
import PokemonGrid from '../components/PokemonGrid';
import './pokedex.scss';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';
import LoadingRenderer from '../components/LoadingRenderer';
import { usePokemon } from '../contexts/pokemon-context';
import { useNavbarSearchInput } from '../contexts/navbar-search-context';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../contexts/language-context';
import { fetchPokemonFamily, needsXLCandy } from '../utils/pokemon-helper';
import Dictionary from '../utils/Dictionary';
import { customCupCPLimit, usePvp } from '../contexts/pvp-context';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { useRaidRanker } from '../contexts/raid-ranker-context';
import { useMoves } from '../contexts/moves-context';
import PokemonHeader from '../components/PokemonHeader';
import translator, { TranslatorKeys } from '../utils/Translator';
import { translatedType } from '../components/PokemonInfoImagePlaceholder';

export enum ListType {
    POKEDEX,
    GREAT_LEAGUE,
    ULTRA_LEAGUE,
    MASTER_LEAGUE,
    CUSTOM_CUP,
    RAID
}

const Pokedex = () => {
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { moves, movesFetchCompleted } = useMoves();
    const { rankLists, pvpFetchCompleted, pvpErrors } = usePvp();
    const { raidDPS, computeRaidRankerforTypes, raidRankerFetchCompleted } = useRaidRanker();
    const { inputText, familyTree, showShadow, showMega, showXL, type1Filter, type2Filter } = useNavbarSearchInput();

    const {currentLanguage, currentGameLanguage} = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);
    const renderCustom = false;

    let listType = ListType.POKEDEX;
    let cpThreshold = 0;
    const { listTypeArg } = useParams();

    switch (listTypeArg) {
        case undefined:
            listType = ListType.POKEDEX;
            break;
        case "great":
            listType = ListType.GREAT_LEAGUE;
            cpThreshold = 1500;
            break;
        case "ultra":
            listType = ListType.ULTRA_LEAGUE;
            cpThreshold = 2500;
            break;
        case "master":
            listType = ListType.MASTER_LEAGUE;
            break;
        case "custom":
            listType = ListType.CUSTOM_CUP;
            cpThreshold = customCupCPLimit;
            break;
        case "raid":
            listType = ListType.RAID;
            break;
        default:
            throw Error("404 not found!");
    }

    useEffect(() => {
        const computedTypeCollection = type1Filter ? [type1Filter] : undefined;
        if (!fetchCompleted || !movesFetchCompleted || raidRankerFetchCompleted(computedTypeCollection) || listTypeArg !== "raid") {
            return;
        }

        computeRaidRankerforTypes(gamemasterPokemon, moves, computedTypeCollection);
    }, [type1Filter, listTypeArg, fetchCompleted, movesFetchCompleted, gamemasterPokemon, moves, computeRaidRankerforTypes, raidRankerFetchCompleted]);

    const pokemonByDex = useMemo(() => {
        if (!fetchCompleted) {
            return {};
        }
        
        const dict: Dictionary<IGamemasterPokemon[]> = {};

        Object.values(gamemasterPokemon)
        .filter(p => !p.aliasId)
        .forEach(p => {
            if (!dict[p.dex]) {
                dict[p.dex] = [p];
            } else {
                dict[p.dex].push(p);
            }
        });

        return dict;
    }, [gamemasterPokemon, fetchCompleted]);

    const pokemonByFamilyId = useMemo(() => {
        if (!fetchCompleted) {
            return {};
        }

        const dict: Dictionary<IGamemasterPokemon[]> = {};

        Object.values(gamemasterPokemon)
        .filter(p => !p.aliasId)
        .forEach(p => {
            if (!p.familyId) {
                return;
            }

            if (!dict[p.familyId]) {
                dict[p.familyId] = [p];
            } else {
                dict[p.familyId].push(p);
            }
        });

        return dict;
    }, [gamemasterPokemon, fetchCompleted]);

    type DataType = {
        processedList: IGamemasterPokemon[],
        cpStringOverrides: Dictionary<string>,
        rankOverrides: Dictionary<number>
    }

    const data: DataType = useMemo(() => {
        if (!fetchCompleted || !pvpFetchCompleted) {
            return {
                processedList: [],
                cpStringOverrides: {},
                rankOverrides: {}
            };
        }

        let processedList: IGamemasterPokemon[] = [];
        let cpStringOverrides: Dictionary<string> = {};
        let rankOverrides: Dictionary<number> = {};

        const mapper = (r: IRankedPokemon): IGamemasterPokemon => gamemasterPokemon[r.speciesId];
        
        const inputFilter = (p: IGamemasterPokemon, domainFilter: (pokemon: IGamemasterPokemon) => boolean) => {
            if (!inputText) {
                return true;
            }

            if (!familyTree) {
                return baseFilter(p);
            }
            
            const family = fetchPokemonFamily(p, gamemasterPokemon, domainFilter, pokemonByDex, pokemonByFamilyId);
            return Array.from(family).some(baseFilter);
        }

        const baseFilter = (p: IGamemasterPokemon) => p.speciesName.replace("Shadow", gameTranslator(GameTranslatorKeys.Shadow, currentGameLanguage)).toLowerCase().includes(inputText.toLowerCase().trim());
        
        switch (listType) {
            case ListType.POKEDEX:
                const pokedexDomainFilter = (pokemon: IGamemasterPokemon) => !pokemon.isShadow && !pokemon.aliasId && (showMega || !pokemon.isMega) && (type1Filter === undefined || pokemon.types.includes(type1Filter)) && (type2Filter === undefined || pokemon.types.includes(type2Filter));
                const pokedexDomainFilterForFamily = (pokemon: IGamemasterPokemon) => !pokemon.isShadow && !pokemon.aliasId;
                processedList = Object.values(gamemasterPokemon).filter(p => pokedexDomainFilter(p) && inputFilter(p, pokedexDomainFilterForFamily)).sort((p1: IGamemasterPokemon, p2: IGamemasterPokemon) => {
                    // Sort by dex number first
                    if (p1.dex !== p2.dex) {
                      return p1.dex - p2.dex;
                    }
                
                    // Sort Megas higher
                    if (p1.isMega !== p2.isMega) {
                      return p1.isMega ? 1 : -1;
                    }
                
                    // Cache lowercase species names
                    const p1Name = p1.speciesName.toLocaleLowerCase();
                    const p2Name = p2.speciesName.toLocaleLowerCase();
                
                    // Handle '(small)', '(average)', '(large)', '(super)' sizes
                    const sizePriority = ['small', 'average', 'large', 'super'];
                
                    const p1SizeIndex = sizePriority.findIndex(size => p1Name.includes(`(${size})`));
                    const p2SizeIndex = sizePriority.findIndex(size => p2Name.includes(`(${size})`));
                
                    if (p1SizeIndex !== p2SizeIndex) {
                      return p1SizeIndex - p2SizeIndex;
                    }
                
                    // Default to alphabetical order by species name (meaning the forms come at the end, but before the megas, and that the forms are ordered alphabetically)
                    return p1Name.localeCompare(p2Name);
                });
                break;
            case ListType.GREAT_LEAGUE:
            case ListType.ULTRA_LEAGUE:
            case ListType.MASTER_LEAGUE:
            case ListType.CUSTOM_CUP:
                const leaguePool = rankLists[listType - 1] ? Object.values(rankLists[listType - 1]).map(mapper) : [];
                const cupDomainFilter = (pokemon: IGamemasterPokemon) => !pokemon.aliasId && !pokemon.isMega && (showShadow || !pokemon.isShadow) && (showXL || !needsXLCandy(pokemon, cpThreshold)) && (type1Filter === undefined || pokemon.types.includes(type1Filter)) && (type2Filter === undefined || pokemon.types.includes(type2Filter));
                const cupDomainFilterForFamily = (pokemon: IGamemasterPokemon) => !pokemon.aliasId && !pokemon.isMega;
                processedList = leaguePool.filter(p => cupDomainFilter(p) && inputFilter(p, cupDomainFilterForFamily));
                break;
            case ListType.RAID:
                const preProcessedList: IGamemasterPokemon[] = [];
                if (!raidRankerFetchCompleted(type1Filter ? [type1Filter] : undefined)) {
                    processedList = [];
                    break;
                }

                Object.entries(raidDPS[type1Filter ? type1Filter.toString().toLocaleLowerCase() : ""]).forEach(([speciesId, e], idx) => {
                    const raidFilter = (pokemon: IGamemasterPokemon) => !pokemon.aliasId && (showMega || !pokemon.isMega) && (showShadow || !pokemon.isShadow);
                    const raidFilterForFamily = (pokemon: IGamemasterPokemon) => !pokemon.aliasId;
                    if (!raidFilter(gamemasterPokemon[speciesId]) || !inputFilter(gamemasterPokemon[speciesId], raidFilterForFamily)) {
                        return;
                    }

                    preProcessedList.push(gamemasterPokemon[speciesId]);
                    cpStringOverrides[speciesId] = `${Math.round(e.dps * 100) / 100} DPS`;
                    rankOverrides[speciesId] = idx + 1;
                });

                processedList = preProcessedList;
                break;
            default:
                throw new Error(`Missing case in switch for ${listType}`);
        }

        return {
            processedList,
            cpStringOverrides,
            rankOverrides
        };
    }, [gamemasterPokemon, listType, familyTree, showShadow, raidDPS, raidRankerFetchCompleted, showMega, showXL, cpThreshold, type1Filter, type2Filter, rankLists, inputText, fetchCompleted, pvpFetchCompleted, currentGameLanguage, pokemonByDex, pokemonByFamilyId]);

    return (
        <main className="pokedex-layout">
            <PokemonHeader
                pokemonName={(listType !== ListType.RAID && listType !== ListType.POKEDEX) ? `${translator(TranslatorKeys.Best1, currentLanguage)} ${gameTranslator(listType === ListType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : listType === ListType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : GameTranslatorKeys.MasterLeague, currentGameLanguage)} ${translator(TranslatorKeys.Best2, currentLanguage)}` : listType === ListType.RAID ? `${translator(TranslatorKeys.BestRaids1, currentLanguage)} ${type1Filter ? translatedType(type1Filter, currentLanguage) : ''} ${translator(TranslatorKeys.BestRaids2, currentLanguage)} ${gameTranslator(type1Filter ? GameTranslatorKeys.Raids : GameTranslatorKeys.Raid, currentGameLanguage)} ${translator(TranslatorKeys.BestRaids3, currentLanguage)}` : 'Pokédex'}
                type1={undefined}
                type2={undefined}
                defaultTextColor
                defaultBannerColor
                whiteTextColor
                constrained
            />
            <nav className="navigation-header extra-gap leagues bordered-sides">
                <ul>
                    <li>
                        <Link to="/great" className={"header-tab league-picker " + (listType === ListType.GREAT_LEAGUE ? "header-selected" : "header-unselected")}>
                            <img height="24" width="24" src={`${process.env.PUBLIC_URL}/images/leagues/great.png`} alt="Great League"/>
                            {listType === ListType.GREAT_LEAGUE && <span>{gameTranslator(GameTranslatorKeys.Great, currentGameLanguage)}</span>}
                        </Link>
                    </li>
                    <li>
                        <Link to="/ultra" className={"header-tab league-picker " + (listType === ListType.ULTRA_LEAGUE ? "header-selected" : "header-unselected")}>
                            <img height="24" width="24" src={`${process.env.PUBLIC_URL}/images/leagues/ultra.png`} alt="Ultra League"/>
                            {listType === ListType.ULTRA_LEAGUE && <span>Ultra</span>}
                        </Link>
                    </li>
                    <li>
                        <Link to="/master" className={"header-tab league-picker " + (listType === ListType.MASTER_LEAGUE ? "header-selected" : "header-unselected")}>
                            <img height="24" width="24" src={`${process.env.PUBLIC_URL}/images/leagues/master.png`} alt="Master League"/>
                            {listType === ListType.MASTER_LEAGUE && <span>{gameTranslator(GameTranslatorKeys.Master, currentGameLanguage)}</span>}
                        </Link>
                    </li>
                    {renderCustom && <li>
                        <Link to="/custom" className={"header-tab league-picker " + (listType === ListType.CUSTOM_CUP ? "header-selected" : "header-unselected")}>
                            <img height="24" width="24" src={`${process.env.PUBLIC_URL}/images/leagues/fantasy-cup.png`} alt="Fantasy Cup"/>
                            {listType === ListType.CUSTOM_CUP && <span>{gameTranslator(GameTranslatorKeys.Fantasy, currentGameLanguage)}</span>}
                        </Link>
                    </li>}
                    <li>
                        <Link to="/raid" className={"header-tab league-picker " + (listType === ListType.RAID ? "header-selected" : "header-unselected")}>
                            <div className="img-padding"><img className="raid-img-with-contrast" height="20" width="20" src={`${process.env.PUBLIC_URL}/images/tx_raid_coin.png`} alt="Raids"/></div>
                            {listType === ListType.RAID && <span>{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}</span>}
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokedex" ref={containerRef}>
                <LoadingRenderer errors={errors + pvpErrors} completed={fetchCompleted && pvpFetchCompleted && (listType !== ListType.RAID || raidRankerFetchCompleted(type1Filter ? [type1Filter] : undefined))}>
                    <PokemonGrid pokemonInfoList={data.processedList} cpStringOverrides={data.cpStringOverrides} rankOverrides={data.rankOverrides} listType={listType} containerRef={containerRef}/>
                </LoadingRenderer>
            </div>
        </main>
    );
}
export default Pokedex;
import { useCallback, useMemo, useRef } from 'react';
import PokemonGrid from '../components/PokemonGrid';
import './pokedex.scss';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';
import LoadingRenderer from '../components/LoadingRenderer';
import { usePokemon } from '../contexts/pokemon-context';
import { useNavbarSearchInput } from '../contexts/navbar-search-context';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../contexts/language-context';
import { computeDPSEntry, fetchPokemonFamily, getAllChargedMoves, needsXLCandy } from '../utils/pokemon-helper';
import Dictionary from '../utils/Dictionary';
import { usePvp } from '../contexts/pvp-context';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { dpsEntry } from '../components/PokemonInfoBanner';
import { useMoves } from '../contexts/moves-context';

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
    const { rankLists, pvpFetchCompleted, pvpErrors } = usePvp();
    const { moves, movesFetchCompleted } = useMoves();
    const { inputText, familyTree, showShadow, showMega, showXL, type1Filter, type2Filter } = useNavbarSearchInput();
    const {currentGameLanguage} = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);
    const renderCustom = true;

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
            cpThreshold = 500;
            break;
        case "raid":
            listType = ListType.RAID;
            break;
        default:
            throw Error("404 not found!");
    }

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

    const rankOnlyFilteredTypePokemon = false; //TODO: connect to settings

    const typeFilter = useCallback((p: IGamemasterPokemon, forcedType: string) => {
        if (!fetchCompleted || !movesFetchCompleted) {
            return false;
        }

        if (!forcedType) {
            return true;
        }

        if (rankOnlyFilteredTypePokemon) {
            if (!p.types.map(t => t.toString().toLocaleLowerCase()).includes(forcedType.toLocaleLowerCase())) {
                return false;
            }
        }

        return getAllChargedMoves(p, moves, gamemasterPokemon).some(m => moves[m].type === forcedType);
    }, [rankOnlyFilteredTypePokemon, moves, gamemasterPokemon, fetchCompleted, movesFetchCompleted]);

    const computeComparisons = useCallback((forcedType = "") => {
        if (!fetchCompleted || !movesFetchCompleted) {
            return [];
        }

        const comparisons: dpsEntry[] = [];
        Object.values(gamemasterPokemon)
            .filter(p => !p.aliasId && typeFilter(p, forcedType))
            .forEach(p => comparisons.push(computeDPSEntry(p, gamemasterPokemon, moves, 15, 100, forcedType)));
        return comparisons.sort((e1: dpsEntry, e2: dpsEntry) => e2.dps - e1.dps);
    }, [gamemasterPokemon, fetchCompleted, movesFetchCompleted, typeFilter, moves]);

    const computedComparisons = useMemo(() => computeComparisons(), [computeComparisons]);

    const computedTypeComparisons = useMemo(() => {
        if (type1Filter === undefined) {
            return computedComparisons;
        }
        
        return computeComparisons(type1Filter.toString().toLocaleLowerCase());
    }, [computeComparisons, type1Filter, computedComparisons]);

    type DataType = {
        processedList: IGamemasterPokemon[],
        cpStringOverrides: Dictionary<string>,
        rankOverrides: Dictionary<number>
    }

    const data: DataType = useMemo(() => {
        if (!fetchCompleted || !pvpFetchCompleted || !movesFetchCompleted) {
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
                processedList = Object.values(gamemasterPokemon).filter(p => pokedexDomainFilter(p) && inputFilter(p, pokedexDomainFilterForFamily));
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
                computedTypeComparisons.forEach((e, idx) => {
                    const raidFilter = (pokemon: IGamemasterPokemon) => !pokemon.aliasId && (showMega || !pokemon.isMega) && (showShadow || !pokemon.isShadow);
                    const raidFilterForFamily = (pokemon: IGamemasterPokemon) => !pokemon.aliasId;
                    if (!raidFilter(gamemasterPokemon[e.speciesId]) || !inputFilter(gamemasterPokemon[e.speciesId], raidFilterForFamily)) {
                        return;
                    }

                    preProcessedList.push(gamemasterPokemon[e.speciesId]);
                    cpStringOverrides[e.speciesId] = `${Math.round(e.dps * 100) / 100} DPS`;
                    rankOverrides[e.speciesId] = idx + 1;
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
    }, [gamemasterPokemon, listType, familyTree, showShadow, showMega, showXL, cpThreshold, type1Filter, type2Filter, rankLists, inputText, movesFetchCompleted, computedTypeComparisons, fetchCompleted, pvpFetchCompleted, currentGameLanguage, pokemonByDex, pokemonByFamilyId]);

    return (
        <main className="pokedex-layout">
            <nav className="navigation-header extra-gap leagues">
                <ul>
                    <li>
                        <Link to="/great" className={"header-tab league-picker " + (listType === ListType.GREAT_LEAGUE ? "selected" : "")}>
                            <img height="32" width="32" src={`${process.env.PUBLIC_URL}/images/leagues/great.png`} alt="Great League"/>
                            {listType === ListType.GREAT_LEAGUE && <span>{gameTranslator(GameTranslatorKeys.Great, currentGameLanguage)}</span>}
                        </Link>
                    </li>
                    <li>
                        <Link to="/ultra" className={"header-tab league-picker " + (listType === ListType.ULTRA_LEAGUE ? "selected" : "")}>
                            <img height="32" width="32" src={`${process.env.PUBLIC_URL}/images/leagues/ultra.png`} alt="Ultra League"/>
                            {listType === ListType.ULTRA_LEAGUE && <span>Ultra</span>}
                        </Link>
                    </li>
                    <li>
                        <Link to="/master" className={"header-tab league-picker " + (listType === ListType.MASTER_LEAGUE ? "selected" : "")}>
                            <img height="32" width="32" src={`${process.env.PUBLIC_URL}/images/leagues/master.png`} alt="Master League"/>
                            {listType === ListType.MASTER_LEAGUE && <span>{gameTranslator(GameTranslatorKeys.Master, currentGameLanguage)}</span>}
                        </Link>
                    </li>
                    {renderCustom && <li>
                        <Link to="/custom" className={"header-tab league-picker " + (listType === ListType.CUSTOM_CUP ? "selected" : "")}>
                            <img height="32" width="32" src={`${process.env.PUBLIC_URL}/images/leagues/holiday.png`} alt="Holiday Cup"/>
                            {listType === ListType.CUSTOM_CUP && <span>{gameTranslator(GameTranslatorKeys.Holiday, currentGameLanguage)}</span>}
                        </Link>
                    </li>}
                    <li>
                        <Link to="/raid" className={"header-tab league-picker " + (listType === ListType.RAID ? "selected" : "")}>
                            <div className="img-padding"><img className="raid-img-with-contrast" height="24" width="24" src={`${process.env.PUBLIC_URL}/images/raid.webp`} alt="Raids"/></div>
                            {listType === ListType.RAID && <span>{gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}</span>}
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokedex" ref={containerRef}>
                <LoadingRenderer errors={errors + pvpErrors} completed={fetchCompleted && pvpFetchCompleted && movesFetchCompleted}>
                    <PokemonGrid pokemonInfoList={data.processedList} cpStringOverrides={data.cpStringOverrides} rankOverrides={data.rankOverrides} listType={listType} containerRef={containerRef}/>
                </LoadingRenderer>
            </div>
        </main>
    );
}
export default Pokedex;
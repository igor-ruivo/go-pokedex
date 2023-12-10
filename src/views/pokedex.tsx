import { useMemo, useRef, useState } from 'react';
import PokemonGrid from '../components/PokemonGrid';
import './pokedex.scss';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';
import LoadingRenderer from '../components/LoadingRenderer';
import { usePokemon } from '../contexts/pokemon-context';
import { useNavbarSearchInput } from '../contexts/navbar-search-context';
import { Link, useParams } from 'react-router-dom';
import translator, { TranslatorKeys } from '../utils/Translator';
import { useLanguage } from '../contexts/language-context';
import { fetchPokemonFamily } from '../utils/pokemon-helper';
import Dictionary from '../utils/Dictionary';
import { usePvp } from '../contexts/pvp-context';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';

export enum ListType {
    POKEDEX,
    GREAT_LEAGUE,
    ULTRA_LEAGUE,
    MASTER_LEAGUE,
    CUSTOM_CUP
}

const getDefaultShowFamilyTree = () => true; // TODO: implement toggle later readPersistentValue(ConfigKeys.ShowFamilyTree) === "true";

const Pokedex = () => {
    const [showFamilyTree] = useState(getDefaultShowFamilyTree());
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { rankLists, pvpFetchCompleted, pvpErrors } = usePvp();
    const { inputText } = useNavbarSearchInput();
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);

    let listType = ListType.POKEDEX;
    const { listTypeArg } = useParams();

    switch (listTypeArg) {
        case undefined:
            listType = ListType.POKEDEX;
            break;
        case "great":
            listType = ListType.GREAT_LEAGUE;
            break;
        case "ultra":
            listType = ListType.ULTRA_LEAGUE;
            break;
        case "master":
            listType = ListType.MASTER_LEAGUE;
            break;
        case "custom":
            listType = ListType.CUSTOM_CUP;
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

    const data = useMemo(() => {
        if (!fetchCompleted || !pvpFetchCompleted) {
            return [];
        }

        let processedList: IGamemasterPokemon[] = [];

        const mapper = (r: IRankedPokemon): IGamemasterPokemon => gamemasterPokemon[r.speciesId];
        
        const inputFilter = (p: IGamemasterPokemon, domainFilter: (pokemon: IGamemasterPokemon) => boolean) => {
            if (!inputText) {
                return true;
            }

            if (!showFamilyTree) {
                return baseFilter(p);
            }
            
            const family = fetchPokemonFamily(p, gamemasterPokemon, domainFilter, pokemonByDex, pokemonByFamilyId);
            return Array.from(family).some(baseFilter);
        }

        const baseFilter = (p: IGamemasterPokemon) => p.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage)).toLowerCase().includes(inputText.toLowerCase().trim());
        
        switch (listType) {
            case ListType.POKEDEX:
                const domainFilter = (pokemon: IGamemasterPokemon) => !pokemon.isShadow && !pokemon.aliasId;
                processedList = Object.values(gamemasterPokemon).filter(p => domainFilter(p) && inputFilter(p, domainFilter));
                break;
            case ListType.GREAT_LEAGUE:
            case ListType.ULTRA_LEAGUE:
            case ListType.MASTER_LEAGUE:
            case ListType.CUSTOM_CUP:
                const leaguePool = Object.values(rankLists[listType - 1]).map(mapper);
                processedList = leaguePool.filter(p => inputFilter(p, (pokemon: IGamemasterPokemon) => !pokemon.isMega && !pokemon.aliasId));
                break;
            default:
                throw new Error(`Missing case in switch for ${listType}`);
        }

        return processedList;
    }, [gamemasterPokemon, listType, rankLists, inputText, fetchCompleted, pvpFetchCompleted, showFamilyTree, currentLanguage, pokemonByDex, pokemonByFamilyId]);

    return (
        <main className="layout">
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
                    <li>
                        <Link to="/custom" className={"header-tab league-picker " + (listType === ListType.CUSTOM_CUP ? "selected" : "")}>
                            <img height="32" width="32" src={`${process.env.PUBLIC_URL}/images/leagues/retro.png`} alt="Retro Cup"/>
                            {listType === ListType.CUSTOM_CUP && <span>{gameTranslator(GameTranslatorKeys.Retro, currentGameLanguage)}</span>}
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokedex" ref={containerRef}>
                <LoadingRenderer errors={errors + pvpErrors} completed={fetchCompleted && pvpFetchCompleted}>
                    <PokemonGrid pokemonInfoList={data} listType={listType} containerRef={containerRef}/>
                </LoadingRenderer>
            </div>
        </main>
    );
}
export default Pokedex;
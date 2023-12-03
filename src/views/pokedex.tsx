import { useMemo, useState } from 'react';
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
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';
import { fetchPokemonFamily } from '../utils/pokemon-helper';
import Dictionary from '../utils/Dictionary';
import { usePvp } from '../contexts/pvp-context';

export enum ListType {
    POKEDEX,
    GREAT_LEAGUE,
    ULTRA_LEAGUE,
    MASTER_LEAGUE
}

const getDefaultShowFamilyTree = () => true; // TODO: implement toggle later readPersistentValue(ConfigKeys.ShowFamilyTree) === "true";

const Pokedex = () => {
    const [showFamilyTree] = useState(getDefaultShowFamilyTree());
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { rankLists, pvpFetchCompleted, pvpErrors } = usePvp();
    const { inputText } = useNavbarSearchInput();
    const {currentLanguage, currentGameLanguage} = useLanguage();

    // TEMP DEBUG
    /*
    if (fetchCompleted && gamemasterPokemon && Object.keys(gamemasterPokemon).length) {
        
        const movesSet = new Set<string>();
        
        Object.values(gamemasterPokemon).map(p => p.fastMoves).forEach(v => v.forEach(vv => movesSet.add(vv)));
        Object.values(gamemasterPokemon).map(p => p.chargedMoves).forEach(v => v.forEach(vv => movesSet.add(vv)));
        Object.values(gamemasterPokemon).map(p => p.eliteMoves).forEach(v => v.forEach(vv => movesSet.add(vv)));
        Object.values(gamemasterPokemon).map(p => p.legacyMoves).forEach(v => v.forEach(vv => movesSet.add(vv)));

            movesSet.forEach(m => {
                const moveKey = GameTranslatorKeys[m as keyof typeof GameTranslatorKeys];
                if (!isTranslated(moveKey)) {
                    console.log(m);
                } else {
                    const move = moves[m];
                    const engMove = move.name;
                    if (engMove !== gameTranslator(moveKey, GameLanguage.English)) {
                        console.error(m);
                    }
                }
            });
    }
    */

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
            <nav className="navigation-header">
                <ul>
                    <li>
                        <Link to="/great" className={"header-tab " + (listType === ListType.GREAT_LEAGUE ? "selected" : "")}>
                            <img height="24" width="24" src="https://i.imgur.com/JFlzLTU.png" alt="Great League"/>
                            <span>{gameTranslator(GameTranslatorKeys.Great, currentGameLanguage)}</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/ultra" className={"header-tab " + (listType === ListType.ULTRA_LEAGUE ? "selected" : "")}>
                            <img height="24" width="24" src="https://i.imgur.com/jtA6QiL.png" alt="Ultra League"/>
                            <span>Ultra</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/master" className={"header-tab " + (listType === ListType.MASTER_LEAGUE ? "selected" : "")}>
                            <img height="24" width="24" src="https://i.imgur.com/vJOBwfH.png" alt="Master League"/>
                            <span>{gameTranslator(GameTranslatorKeys.Master, currentGameLanguage)}</span>
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokedex">
                <LoadingRenderer errors={errors + pvpErrors} completed={fetchCompleted && pvpFetchCompleted}>
                    <PokemonGrid pokemonInfoList={data} listType={listType} />
                </LoadingRenderer>
            </div>
        </main>
    );
}
export default Pokedex;
import { useMemo, useState } from 'react';
import PokemonGrid from '../components/PokemonGrid';
import './pokedex.scss';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';
import LoadingRenderer from '../components/LoadingRenderer';
import { ConfigKeys, readPersistentValue } from '../utils/persistent-configs-handler';
import { usePokemon } from '../contexts/pokemon-context';
import { useNavbarSearchInput } from '../contexts/navbar-search-context';
import { Link, useParams } from 'react-router-dom';

export enum ListType {
    POKEDEX,
    GREAT_LEAGUE,
    ULTRA_LEAGUE,
    MASTER_LEAGUE
}

const getDefaultShowFamilyTree = () => readPersistentValue(ConfigKeys.ShowFamilyTree) === "true";

const Pokedex = () => {
    const [showFamilyTree, setShowFamilyTree] = useState(getDefaultShowFamilyTree());
    const { gamemasterPokemon, rankLists, fetchCompleted, errors } = usePokemon();
    const { inputText } = useNavbarSearchInput();

    let listType = ListType.POKEDEX;
    const { listTypeArg } = useParams();

    switch (listTypeArg) {
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
            listType = ListType.POKEDEX;
            break;
    }

    const prepareData = () => {
        if (!fetchCompleted) {
            return [];
        }

        let processedList: IGamemasterPokemon[] = [];

        // TODO: improve with a Map<speciesID, IGamemasterPokemon>
        const mapper = (r: IRankedPokemon): IGamemasterPokemon => gamemasterPokemon.find(p => p.speciesId === r.speciesId) as IGamemasterPokemon;
        
        const inputFilter = (p: IGamemasterPokemon, targetPokemon: IGamemasterPokemon[]) => {
            if (!p.familyId || !showFamilyTree) {
                return baseFilter(p);
            }

            const wholeFamilyNames = targetPokemon
                .filter(pokemon => pokemon.familyId === p.familyId);

            return wholeFamilyNames.some(baseFilter);
        }

        const baseFilter = (p: IGamemasterPokemon) => p.speciesName.toLowerCase().includes(inputText.toLowerCase().trim());
        
        const rankingsFamilyPokemonPool = gamemasterPokemon.filter(p => !p.isMega);
        
        switch (listType) {
            case ListType.POKEDEX:
                const pokedexPool = gamemasterPokemon.filter(p => !p.isShadow);
                processedList = pokedexPool
                    .filter(p => inputFilter(p, pokedexPool));
                break;
            case ListType.GREAT_LEAGUE:
            case ListType.ULTRA_LEAGUE:
            case ListType.MASTER_LEAGUE:
                const leaguePool = rankLists[listType - 1].map(mapper);
                processedList = leaguePool.filter(p => inputFilter(p, rankingsFamilyPokemonPool));
                break;
            default:
                throw new Error(`Missing case in switch for ${listType}`);
        }

        return processedList;
    }

    const data = useMemo(prepareData, [gamemasterPokemon, listType, rankLists, inputText, fetchCompleted, showFamilyTree]);

    return (
        <main className="pokedex-layout">
            <nav className="navigation-header">
                <ul>
                    <li>
                        <Link to="/great" className={"header-tab " + (listType === ListType.GREAT_LEAGUE ? "selected" : "")}>
                            <img height="24" width="24" src="https://www.stadiumgaming.gg/frontend/assets/img/great.png"/>
                            <span>Great</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/ultra" className={"header-tab " + (listType === ListType.ULTRA_LEAGUE ? "selected" : "")}>
                            <img height="24" width="24" src="https://www.stadiumgaming.gg/frontend/assets/img/ultra.png"/>
                            <span>Ultra</span>
                        </Link>
                    </li>
                    <li>
                        <Link to="/master" className={"header-tab " + (listType === ListType.MASTER_LEAGUE ? "selected" : "")}>
                            <img height="24" width="24" src="https://www.stadiumgaming.gg/frontend/assets/img/master.png"/>
                            <span>Master</span>
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="pokedex">
                <LoadingRenderer errors={errors} completed={fetchCompleted}>
                    <PokemonGrid pokemonInfoList={data} listType={listType} />
                </LoadingRenderer>
            </div>
        </main>
    );
}
export default Pokedex;
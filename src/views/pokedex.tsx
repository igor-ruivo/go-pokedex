import { useMemo, useState } from 'react';
import PokemonGrid from '../components/PokemonGrid';
import './pokedex.scss';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';
import LoadingRenderer from '../components/LoadingRenderer';
import { usePokemon } from '../contexts/pokemon-context';
import { useNavbarSearchInput } from '../contexts/navbar-search-context';
import { Link, useParams } from 'react-router-dom';

export enum ListType {
    POKEDEX,
    GREAT_LEAGUE,
    ULTRA_LEAGUE,
    MASTER_LEAGUE
}

const getDefaultShowFamilyTree = () => true; // TODO: implement toggle later readPersistentValue(ConfigKeys.ShowFamilyTree) === "true";

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

    const data = useMemo(() => {
        if (!fetchCompleted) {
            return [];
        }

        let processedList: IGamemasterPokemon[] = [];

        const mapper = (r: IRankedPokemon): IGamemasterPokemon => gamemasterPokemon[r.speciesId];
        
        const inputFilter = (p: IGamemasterPokemon, targetPokemon: IGamemasterPokemon[]) => {
            if (!p.familyId || !showFamilyTree) {
                return baseFilter(p);
            }

            const wholeFamilyNames = targetPokemon
                .filter(pokemon => pokemon.familyId === p.familyId);

            return wholeFamilyNames.some(baseFilter);
        }

        const baseFilter = (p: IGamemasterPokemon) => p.speciesName.toLowerCase().includes(inputText.toLowerCase().trim());
        
        const rankingsFamilyPokemonPool = Object.values(gamemasterPokemon).filter(p => !p.isMega);
        
        switch (listType) {
            case ListType.POKEDEX:
                const pokedexPool = Object.values(gamemasterPokemon).filter(p => !p.isShadow);
                processedList = pokedexPool
                    .filter(p => inputFilter(p, pokedexPool));
                break;
            case ListType.GREAT_LEAGUE:
            case ListType.ULTRA_LEAGUE:
            case ListType.MASTER_LEAGUE:
                const leaguePool = Object.values(rankLists[listType - 1]).map(mapper);
                processedList = leaguePool.filter(p => inputFilter(p, rankingsFamilyPokemonPool));
                break;
            default:
                throw new Error(`Missing case in switch for ${listType}`);
        }

        return processedList;
    }, [gamemasterPokemon, listType, rankLists, inputText, fetchCompleted, showFamilyTree]);

    return (
        <main className="pokedex-layout">
            <nav className="navigation-header">
                <ul>
                    <li>
                        <Link to="/great" className={"header-tab " + (listType === ListType.GREAT_LEAGUE ? "selected" : "")}>
                            <img height="24" width="24" src="https://i.imgur.com/JFlzLTU.png" alt="Great League"/>
                            <span>Great</span>
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
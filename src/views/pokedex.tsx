import { useContext, useMemo, useState } from 'react';
import PokemonGrid from '../components/PokemonGrid';
import './pokedex.scss';
import ControlPanel, { ListType } from '../components/ControlPanel';
import { IGamemasterPokemon } from '../DTOs/IGamemasterPokemon';
import { IRankedPokemon } from '../DTOs/IRankedPokemon';
import PokemonContext from '../contexts/pokemon-context';
import LoadingRenderer from '../components/LoadingRenderer';

const Pokedex = () => {
    const { gamemasterPokemon, rankLists, fetchCompleted, errors} = useContext(PokemonContext);
    const [inputText, setInputText] = useState("");
    const [listType, setListType] = useState(ListType.POKEDEX);
    const [showFamilyTree, setShowFamilyTree] = useState(false);

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

    const data = useMemo(prepareData, [gamemasterPokemon, listType, inputText, rankLists, fetchCompleted, showFamilyTree]);

    return (
        <div className="pokedex">
            <LoadingRenderer errors={errors} completed={fetchCompleted}>
                <>
                    <div>
                        <ControlPanel onSearchInputChange={setInputText} onChangeListType={setListType} listType={listType} showFamilyTree={showFamilyTree} onShowFamilyTree={setShowFamilyTree}/>
                    </div>
                    <PokemonGrid pokemonInfoList={data} listType={listType} />
                </>
            </LoadingRenderer>
        </div>
    );
}
export default Pokedex;
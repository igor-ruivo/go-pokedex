import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import "./PokemonMoves.scss"
import { fetchPokemonFamily, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";
import { usePokemon } from "../contexts/pokemon-context";
import { Link, useLocation } from "react-router-dom";
import translator, { TranslatorKeys } from "../utils/Translator";
import PokemonImage from "./PokemonImage";
import movesTranslator, { MovesTranslatorKeys } from "../utils/MovesTranslator";
import { ListType } from "../views/pokedex";

interface IPokemonMoves {
    pokemon: IGamemasterPokemon;
    league: ListType;
}

const PokemonMoves = ({pokemon, league}: IPokemonMoves) => {
    const {currentLanguage} = useLanguage();

    const {gamemasterPokemon, moves, fetchCompleted, rankLists} = usePokemon();
    const {pathname} = useLocation();
    
    if (!fetchCompleted || !gamemasterPokemon) {
        return <></>;
    }

    const greatLeagueMoveset = rankLists[0][pokemon.speciesId]?.moveset ?? [];
    const ultraLeagueMoveset = rankLists[1][pokemon.speciesId]?.moveset ?? [];
    const masterLeagueMoveset = rankLists[2][pokemon.speciesId]?.moveset ?? [];

    const relevantMoveSet = league === ListType.GREAT_LEAGUE ? greatLeagueMoveset : league === ListType.ULTRA_LEAGUE ? ultraLeagueMoveset : masterLeagueMoveset;
    
    const fastMoveClassName = `move-card background-${moves[relevantMoveSet[0]]?.type}`;
    const chargedMove1ClassName = `move-card background-${moves[relevantMoveSet[1]]?.type}`;
    const chargedMove2ClassName = `move-card background-${moves[relevantMoveSet[2]]?.type}`;
    
    const fastMoveTranslatorKey = MovesTranslatorKeys[relevantMoveSet[0] as keyof typeof MovesTranslatorKeys];
    const chargedMove1TranslatorKey = MovesTranslatorKeys[relevantMoveSet[1] as keyof typeof MovesTranslatorKeys];
    const chargedMove2TranslatorKey = MovesTranslatorKeys[relevantMoveSet[2] as keyof typeof MovesTranslatorKeys];

    const fastMoveTypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[0]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[0]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    const chargedMove1TypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[1]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[1]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    const chargedMove2TypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[2]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[2]]?.type.substring(1)) as keyof typeof TranslatorKeys];
                    
    const fastMoveUrl = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[relevantMoveSet[0]]?.type}.png`;
    const chargedMove1Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[relevantMoveSet[1]]?.type}.png`;
    const chargedMove2Url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[relevantMoveSet[2]]?.type}.png`;


    const similarPokemon = fetchPokemonFamily(pokemon, gamemasterPokemon);

    return (
        <div className="banner_layout">
            {similarPokemon.size > 1 && <div className="img-container">
                <div className="img-family">
                    {Array.from(similarPokemon).sort(sortPokemonByBattlePowerDesc).map(p => (
                        <div key = {p.speciesId} className="img-family-container">
                            <Link to={`/pokemon/${p.speciesId}${pathname.substring(pathname.lastIndexOf("/"))}`}>
                                <PokemonImage pokemon={p} withName={false}/>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>}
            <h3 className="moves-title">
                {translator(TranslatorKeys.RecommendedMoves, currentLanguage)}
            </h3>
            <ul className="moves-list">
                {rankLists[(league as number) - 1][pokemon.speciesId] ? 
                    <div className="moves-list">
                        <div className={fastMoveClassName}>
                            <div className="move-card-content">
                                <strong className="move-detail move-name">
                                    <img title={translator(fastMoveTypeTranslatorKey ?? moves[relevantMoveSet[0]].type, currentLanguage)} alt={translator(fastMoveTypeTranslatorKey ?? moves[relevantMoveSet[0]].type, currentLanguage)} height="32" width="32" src={fastMoveUrl}/>
                                    {movesTranslator(fastMoveTranslatorKey ?? relevantMoveSet[0], currentLanguage) + (pokemon.eliteMoves.includes(relevantMoveSet[0]) ? " *" : pokemon.legacyMoves.includes(relevantMoveSet[0]) ? " †" : "")}
                                </strong>
                                <strong className="move-detail move-stats">
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[0]].power}
                                        <img src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                    </span>
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[0]].energyGain}
                                        <img src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                    </span>
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[0]].cooldown}
                                        <img src="https://i.imgur.com/RIdKYJG.png" width={10} height={15}/>
                                    </span>
                                </strong>
                            </div>
                        </div>
                        <div className={chargedMove1ClassName}>
                            <div className="move-card-content">
                                <strong className="move-detail move-name">
                                    <img title={translator(chargedMove1TypeTranslatorKey ?? moves[relevantMoveSet[1]].type, currentLanguage)} alt={translator(chargedMove1TypeTranslatorKey ?? moves[relevantMoveSet[1]].type, currentLanguage)} height="32" width="32" src={chargedMove1Url}/>
                                    {movesTranslator(chargedMove1TranslatorKey ?? relevantMoveSet[1], currentLanguage) + (pokemon.eliteMoves.includes(relevantMoveSet[1]) ? " *" : pokemon.legacyMoves.includes(relevantMoveSet[1]) ? " †" : "")}
                                </strong>
                                <strong className="move-detail move-stats">
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[1]].power}
                                        <img src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                    </span>
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[1]].energy}
                                        <img src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                    </span>
                                </strong>
                            </div>
                        </div>
                        <div className={chargedMove2ClassName}>
                            <div className="move-card-content">
                                <strong className="move-detail move-name">
                                    <img title={translator(chargedMove2TypeTranslatorKey ?? moves[relevantMoveSet[2]].type, currentLanguage)} alt={translator(chargedMove2TypeTranslatorKey ?? moves[relevantMoveSet[2]].type, currentLanguage)} height="32" width="32" src={chargedMove2Url}/>
                                    {movesTranslator(chargedMove2TranslatorKey ?? relevantMoveSet[2], currentLanguage) + (pokemon.eliteMoves.includes(relevantMoveSet[2]) ? " *" : pokemon.legacyMoves.includes(relevantMoveSet[2]) ? " †" : "")}
                                </strong>
                                <strong className="move-detail move-stats">
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[2]].power}
                                        <img src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                    </span>
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[2]].energy}
                                        <img src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                    </span>
                                </strong>
                            </div>
                        </div>
                    </div> :
                    <span className="unavailable_moves">
                        {translator(TranslatorKeys.RecommendedMovesUnavailable, currentLanguage)}<br></br>
                        {pokemon.speciesName} {translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} {translator(league === ListType.GREAT_LEAGUE ? TranslatorKeys.GreatLeague : league === ListType.ULTRA_LEAGUE ? TranslatorKeys.UltraLeague : TranslatorKeys.MasterLeague, currentLanguage)}
                    </span>
                }
            </ul>
            <h3 className="moves-title">
                {translator(TranslatorKeys.FastMoves, currentLanguage)}
            </h3>
            <ul className="moves-list">
                {
                    pokemon.fastMoves.map(m => {
                        const className = `move-card background-${moves[m].type}`;
                        const movesTranslatorKey = MovesTranslatorKeys[m as keyof typeof MovesTranslatorKeys];
                        const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                        const url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[m].type}.png`;

                        return (
                            <li key={m}>
                                <div className={className}>
                                    <div className="move-card-content">
                                        <strong className="move-detail move-name">
                                            <img title={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} alt={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} height="32" width="32" src={url}/>
                                            {movesTranslator(movesTranslatorKey ?? m, currentLanguage) + (pokemon.eliteMoves.includes(m) ? " *" : pokemon.legacyMoves.includes(m) ? " †" : "")}
                                        </strong>
                                        <strong className="move-detail move-stats">
                                            <span className="move-stats-content">
                                                {moves[m].power}
                                                <img src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                            </span>
                                            <span className="move-stats-content">
                                                {moves[m].energyGain}
                                                <img src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                            </span>
                                            <span className="move-stats-content">
                                                {moves[m].cooldown}
                                                <img src="https://i.imgur.com/RIdKYJG.png" width={10} height={15}/>
                                            </span>
                                        </strong>
                                    </div>
                                </div>
                            </li>
                        )
                    })
                }
                
            </ul>
            <h3 className="moves-title charged-attacks">
                {translator(TranslatorKeys.ChargedMoves, currentLanguage)}
            </h3>
            <ul className="moves-list">
                {
                    pokemon.chargedMoves.map(m => {
                        const className = `move-card background-${moves[m].type}`;
                        const movesTranslatorKey = MovesTranslatorKeys[m as keyof typeof MovesTranslatorKeys];
                        const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                        const url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[m].type}.png`;

                        return (
                            <li key={m}>
                                <div className={className}>
                                    <div className="move-card-content">
                                        <strong className="move-detail move-name">
                                            <img title={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} alt={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} height="32" width="32" src={url}/>
                                            {movesTranslator(movesTranslatorKey ?? m, currentLanguage) + (pokemon.eliteMoves.includes(m) ? " *" : pokemon.legacyMoves.includes(m) ? " †" : "")}
                                        </strong>
                                        <strong className="move-detail move-stats">
                                            <span className="move-stats-content">
                                                {moves[m].power}
                                                <img src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                            </span>
                                            <span className="move-stats-content">
                                                {moves[m].energy}
                                                <img src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                            </span>
                                        </strong>
                                    </div>
                                </div>
                            </li>
                        )
                    })
                }
            </ul>
        </div>
    );
}

export default PokemonMoves;
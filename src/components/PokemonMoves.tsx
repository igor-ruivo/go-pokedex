import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import "./PokemonMoves.scss"
import { fetchPokemonFamily, sortPokemonByBattlePowerDesc } from "../utils/pokemon-helper";
import { usePokemon } from "../contexts/pokemon-context";
import { Link, useLocation } from "react-router-dom";
import translator, { TranslatorKeys } from "../utils/Translator";
import PokemonImage from "./PokemonImage";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { LeagueType } from "../hooks/useLeague";
import { usePvp } from "../contexts/pvp-context";
import { useMoves } from "../contexts/moves-context";
import { useGameTranslation } from "../contexts/gameTranslation-context";

interface IPokemonMoves {
    pokemon: IGamemasterPokemon;
    league: LeagueType;
}

const PokemonMoves = ({pokemon, league}: IPokemonMoves) => {
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const {gameTranslation, gameTranslationFetchCompleted} = useGameTranslation();
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {moves, movesFetchCompleted} = useMoves();
    const {pathname} = useLocation();
    
    if (!fetchCompleted || !gameTranslationFetchCompleted || !pvpFetchCompleted || !movesFetchCompleted || !gamemasterPokemon || !pokemon) {
        return <></>;
    }

    const greatLeagueMoveset = rankLists[0][pokemon.speciesId]?.moveset ?? [];
    const ultraLeagueMoveset = rankLists[1][pokemon.speciesId]?.moveset ?? [];
    const masterLeagueMoveset = rankLists[2][pokemon.speciesId]?.moveset ?? [];
    const customLeagueMoveset = rankLists[3][pokemon.speciesId]?.moveset ?? [];

    const relevantMoveSet = league === LeagueType.GREAT_LEAGUE ? greatLeagueMoveset : league === LeagueType.ULTRA_LEAGUE ? ultraLeagueMoveset : league === LeagueType.CUSTOM_CUP ? customLeagueMoveset : masterLeagueMoveset;
    
    const fastMoveClassName = `move-card background-${moves[relevantMoveSet[0]]?.type}`;
    const chargedMove1ClassName = `move-card background-${moves[relevantMoveSet[1]]?.type}`;
    const chargedMove2ClassName = `move-card background-${moves[relevantMoveSet[2]]?.type}`;

    const translateMoveFromMoveId = (moveId: string) => {
        const typedMove = moves[moveId];
        const vid = typedMove.vId;
        return gameTranslation[vid].name;
    }

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
                        <div key = {p.speciesId} className={`img-family-container ${p.speciesId === pokemon.speciesId ? "selected" : ""}`}>
                            <Link to={`/pokemon/${p.speciesId}${pathname.substring(pathname.lastIndexOf("/"))}`}>
                                <PokemonImage pokemon={p} withName={false} withMetadata={false}/>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>}
            <h3 className="moves-title">
                {translator(TranslatorKeys.RecommendedMoves, currentLanguage)}
            </h3>
            <ul className="moves-list">
                {rankLists[league as number][pokemon.speciesId] ? 
                    <div className="moves-list">
                        <div className={fastMoveClassName}>
                            <div className="move-card-content">
                                <strong className="move-detail move-name">
                                    <img title={translator(fastMoveTypeTranslatorKey ?? moves[relevantMoveSet[0]].type, currentLanguage)} alt={translator(fastMoveTypeTranslatorKey ?? moves[relevantMoveSet[0]].type, currentLanguage)} height="32" width="32" src={fastMoveUrl}/>
                                    {translateMoveFromMoveId(relevantMoveSet[0]) + (pokemon.eliteMoves.includes(relevantMoveSet[0]) ? " *" : pokemon.legacyMoves.includes(relevantMoveSet[0]) ? " †" : "")}
                                </strong>
                                <strong className="move-detail move-stats">
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[0]].pvpPower}
                                        <img alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                    </span>
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[0]].pvpEnergyDelta}
                                        <img alt="energy gain" src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                    </span>
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[0]].pvpDuration}s
                                        <img alt="cooldown" src="https://i.imgur.com/RIdKYJG.png" width={10} height={15}/>
                                    </span>
                                </strong>
                            </div>
                        </div>
                        <div className={chargedMove1ClassName}>
                            <div className="move-card-content">
                                <strong className="move-detail move-name">
                                    <img title={translator(chargedMove1TypeTranslatorKey ?? moves[relevantMoveSet[1]].type, currentLanguage)} alt={translator(chargedMove1TypeTranslatorKey ?? moves[relevantMoveSet[1]].type, currentLanguage)} height="32" width="32" src={chargedMove1Url}/>
                                    {translateMoveFromMoveId(relevantMoveSet[1]) + (pokemon.eliteMoves.includes(relevantMoveSet[1]) ? " *" : pokemon.legacyMoves.includes(relevantMoveSet[1]) ? " †" : "")}
                                </strong>
                                <strong className="move-detail move-stats">
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[1]].pvpPower}
                                        <img alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                    </span>
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[1]].pvpEnergyDelta * -1}
                                        <img alt="energy cost" src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                    </span>
                                </strong>
                            </div>
                        </div>
                        <div className={chargedMove2ClassName}>
                            <div className="move-card-content">
                                <strong className="move-detail move-name">
                                    <img title={translator(chargedMove2TypeTranslatorKey ?? moves[relevantMoveSet[2]].type, currentLanguage)} alt={translator(chargedMove2TypeTranslatorKey ?? moves[relevantMoveSet[2]].type, currentLanguage)} height="32" width="32" src={chargedMove2Url}/>
                                    {translateMoveFromMoveId(relevantMoveSet[2]) + (pokemon.eliteMoves.includes(relevantMoveSet[2]) ? " *" : pokemon.legacyMoves.includes(relevantMoveSet[2]) ? " †" : "")}
                                </strong>
                                <strong className="move-detail move-stats">
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[2]].pvpPower}
                                        <img alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                    </span>
                                    <span className="move-stats-content">
                                        {moves[relevantMoveSet[2]].pvpEnergyDelta * -1}
                                        <img alt="energy cost" src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                    </span>
                                </strong>
                            </div>
                        </div>
                    </div> :
                    <span className="unavailable_moves">
                        {translator(TranslatorKeys.RecommendedMovesUnavailable, currentLanguage)}<br></br>
                        {pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} {translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} {gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.CUSTOM_CUP ? GameTranslatorKeys.RetroCup : GameTranslatorKeys.MasterLeague, currentGameLanguage)}
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
                        const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                        const url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[m].type}.png`;

                        return (
                            <li key={m}>
                                <div className={className}>
                                    <div className="move-card-content">
                                        <strong className="move-detail move-name">
                                            <img title={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} alt={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} height="32" width="32" src={url}/>
                                            {translateMoveFromMoveId(m) + (pokemon.eliteMoves.includes(m) ? " *" : pokemon.legacyMoves.includes(m) ? " †" : "")}
                                        </strong>
                                        <strong className="move-detail move-stats">
                                            <span className="move-stats-content">
                                                {moves[m].pvpPower}
                                                <img alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                            </span>
                                            <span className="move-stats-content">
                                                {moves[m].pvpEnergyDelta}
                                                <img alt="energy gain" src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                                            </span>
                                            <span className="move-stats-content">
                                                {moves[m].pvpDuration}s
                                                <img alt="cooldown" src="https://i.imgur.com/RIdKYJG.png" width={10} height={15}/>
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
                        const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                        const url = `https://storage.googleapis.com/nianticweb-media/pokemongo/types/${moves[m].type}.png`;

                        return (
                            <li key={m}>
                                <div className={className}>
                                    <div className="move-card-content">
                                        <strong className="move-detail move-name">
                                            <img title={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} alt={translator(typeTranslatorKey ?? moves[m].type, currentLanguage)} height="32" width="32" src={url}/>
                                            {translateMoveFromMoveId(m) + (pokemon.eliteMoves.includes(m) ? " *" : pokemon.legacyMoves.includes(m) ? " †" : "")}
                                        </strong>
                                        <strong className="move-detail move-stats">
                                            <span className="move-stats-content">
                                                {moves[m].pvpPower}
                                                <img alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                                            </span>
                                            <span className="move-stats-content">
                                                {moves[m].pvpEnergyDelta * -1}
                                                <img alt="energy gain" src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
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
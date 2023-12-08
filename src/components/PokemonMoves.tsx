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
import React from "react";

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

    const movesSorter = (m1: string, m2: string) => {
        const move1 = moves[m1];
        const move2 = moves[m2];
        if (isStabMove(m1) && !isStabMove(m2)) {
            return -1;
        }
        if (hasBuffs(m1) && !hasBuffs(m2)) {
            return -1;
        }
        if (isStabMove(m2) && !isStabMove(m1)) {
            return 1;
        }
        if (hasBuffs(m2) && !hasBuffs(m1)) {
            return 1;
        }
        if (pokemon.eliteMoves.includes(m1) && !pokemon.eliteMoves.includes(m2)) {
            return -1;
        }
        if (pokemon.eliteMoves.includes(m2) && !pokemon.eliteMoves.includes(m1)) {
            return 1;
        }
        if (pokemon.legacyMoves.includes(m1) && !pokemon.legacyMoves.includes(m2)) {
            return -1;
        }
        if (pokemon.legacyMoves.includes(m2) && !pokemon.legacyMoves.includes(m1)) {
            return 1;
        }

        return (move1.type.localeCompare(move2.type));
    }

    const fastMoveTypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[0]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[0]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    const chargedMove1TypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[1]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[1]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    const chargedMove2TypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[2]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[2]]?.type.substring(1)) as keyof typeof TranslatorKeys];
                    
    const fastMoveUrl = `${process.env.PUBLIC_URL}/images/types/${moves[relevantMoveSet[0]]?.type}.webp`;
    const chargedMove1Url = `${process.env.PUBLIC_URL}/images/types/${moves[relevantMoveSet[1]]?.type}.webp`;
    const chargedMove2Url = `${process.env.PUBLIC_URL}/images/types/${moves[relevantMoveSet[2]]?.type}.webp`;

    const similarPokemon = fetchPokemonFamily(pokemon, gamemasterPokemon);

    const leagueName = gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.MASTER_LEAGUE ? GameTranslatorKeys.MasterLeague : GameTranslatorKeys.RetroCup, currentGameLanguage);

    const isStabMove = (moveId: string) => pokemon.types.map(t => { const stringVal = t.toString(); return stringVal.toLocaleLowerCase() }).includes(moves[moveId].type.toLocaleLowerCase());
    const hasBuffs = (moveId: string) => !!moves[moveId].pvpBuffs;

    const renderMove = (moveId: string, typeTranslatorKey: TranslatorKeys, moveUrl: string, className: string, isChargedMove: boolean) => {
        return <li>
            <div className={className}>
                <div className="move-card-content">
                    <strong className="move-detail move-name">
                        <img title={translator(typeTranslatorKey ?? moves[moveId].type, currentLanguage)} alt={translator(typeTranslatorKey ?? moves[moveId].type, currentLanguage)} height="36" width="36" src={moveUrl}/>
                        {translateMoveFromMoveId(moveId) + (pokemon.eliteMoves.includes(moveId) ? " *" : pokemon.legacyMoves.includes(moveId) ? " †" : "")}
                    </strong>
                    <strong className="move-detail move-stats">
                        <span className="move-stats-content">
                            {Math.round(moves[moveId].pvpPower * (isStabMove(moveId) ? 1.2 : 1) * 10) / 10}
                            <img className="invert-light-mode" alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={14}/>
                        </span>
                        <span className="move-stats-content">
                            {moves[moveId].pvpEnergyDelta * (isChargedMove ? -1 : 1)}
                            <img className="invert-light-mode" alt="energy gain" src="https://i.imgur.com/Ztp5sJE.png" width={10} height={15}/>
                        </span>
                        {!isChargedMove && <span className="move-stats-content">
                            {moves[moveId].pvpDuration}s
                            <img className="invert-light-mode" alt="cooldown" src="https://i.imgur.com/RIdKYJG.png" width={10} height={15}/>
                        </span>}
                    </strong>
                </div>
            </div>
            <div className="buffs-placeholder">
                {hasBuffs(moveId) && <details className="buff-panel">
                    <summary>
                        <img className="invert-dark-mode" alt="Special effects" loading="lazy" width="10" height="10" decoding="async" src="https://db.pokemongohub.net/vectors/magic.svg"/>
                        {translator(TranslatorKeys.Special, currentLanguage)}
                    </summary>
                    <p>
                        <strong>{translateMoveFromMoveId(moveId)}</strong> {translator(TranslatorKeys.Has, currentLanguage)} <strong>{moves[moveId].pvpBuffs!.chance * 100}% {translator(TranslatorKeys.Chance, currentLanguage)}</strong> {translator(TranslatorKeys.To, currentLanguage)}:
                    </p>
                    <ul className="buff-panel-buff">
                        {moves[moveId].pvpBuffs!.buffs.map(b => <li key={b.buff}>{translator(b.quantity >= 0 ? TranslatorKeys.Increase : TranslatorKeys.Lower, currentLanguage)} {translator(TranslatorKeys[b.buff as keyof typeof TranslatorKeys], currentLanguage)} {(b.quantity > 0 ? (((b.quantity + 4) / 4) - 1) * 100 + "%" : b.quantity * -1 + " " + translator(b.quantity === -1 ? TranslatorKeys.Stage : TranslatorKeys.Stages, currentLanguage))}</li>)}
                    </ul>
                </details>}
                {isStabMove(moveId) && <details className="buff-panel">
                    <summary>
                        STAB
                    </summary>
                        <p>
                            <i>"<b>S</b>ame <b>T</b>ype <b>A</b>ttack <b>B</b>onus"</i> - {translator(TranslatorKeys.STAB, currentLanguage)}
                        </p>
                </details>}
                {pokemon.eliteMoves.includes(moveId) && <details className="buff-panel">
                    <summary>
                        {translator(TranslatorKeys.EliteMove, currentLanguage)}
                    </summary>
                        <p>
                            {translator(TranslatorKeys.Elite, currentLanguage)} {gameTranslator(GameTranslatorKeys.EliteTM, currentGameLanguage)}.
                        </p>
                </details>}
                {!pokemon.eliteMoves.includes(moveId) && pokemon.legacyMoves.includes(moveId) && <details className="buff-panel">
                    <summary>
                        {translator(TranslatorKeys.LegacyMove, currentLanguage)}
                    </summary>
                        <p>
                            {translator(TranslatorKeys.Legacy, currentLanguage)}
                        </p>
                </details>}
            </div>
        </li>
    }

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
            <div className="recommended-moves">
                <div className="recommended-moves-content menu-item">
                    <h3 className="moves-title">
                        {`${translator(TranslatorKeys.RecommendedMoves, currentLanguage)} (${leagueName})`}
                    </h3>
                    <ul className="moves-list">
                        {rankLists[league as number][pokemon.speciesId] ? 
                            <div className="moves-list">
                            <p>
                                {translator(TranslatorKeys.RecommendedMovesInfo1, currentLanguage)} {pokemon.speciesName} {translator(TranslatorKeys.RecommendedMovesInfo2, currentLanguage)} {leagueName}.
                            </p>
                            <div className="menu-item">
                                {renderMove(relevantMoveSet[0], fastMoveTypeTranslatorKey, fastMoveUrl, fastMoveClassName, false)}
                            </div>
                                <div className="recommended-charged-moves menu-item">
                                    {renderMove(relevantMoveSet[1], chargedMove1TypeTranslatorKey, chargedMove1Url, chargedMove1ClassName, true)}
                                    {renderMove(relevantMoveSet[2], chargedMove2TypeTranslatorKey, chargedMove2Url, chargedMove2ClassName, true)}
                                </div>
                            </div> :
                            <span className="unavailable_moves">
                                {translator(TranslatorKeys.RecommendedMovesUnavailable, currentLanguage)}<br></br>
                                {pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} {translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} {gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.CUSTOM_CUP ? GameTranslatorKeys.RetroCup : GameTranslatorKeys.MasterLeague, currentGameLanguage)}
                            </span>
                        }
                    </ul>
                </div>
            </div>
            <div className="moves-display-layout">
                <div className="fast-moves-section menu-item">
                    <h3 className="moves-title">
                        {translator(TranslatorKeys.FastMoves, currentLanguage)}
                    </h3>
                    <ul className="moves-list">
                        {
                            pokemon.fastMoves
                            .sort(movesSorter)
                            .map(m => {
                                const className = `move-card background-${moves[m].type}`;
                                const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                                const url = `${process.env.PUBLIC_URL}/images/types/${moves[m]?.type}.webp`;
                                return (
                                    <React.Fragment key={m}>
                                        {renderMove(m, typeTranslatorKey, url, className, false)}
                                    </React.Fragment>
                                )
                            })
                        }
                    </ul>
                </div>
                <div className="charged-moves-section menu-item">
                    <h3 className="moves-title">
                        {translator(TranslatorKeys.ChargedMoves, currentLanguage)}
                    </h3>
                    <ul className="moves-list">
                        {
                            pokemon.chargedMoves
                            .sort(movesSorter)
                            .map(m => {
                                const className = `move-card background-${moves[m].type}`;
                                const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                                const url = `${process.env.PUBLIC_URL}/images/types/${moves[m]?.type}.webp`;
                                return (
                                    <React.Fragment key={m}>
                                        {renderMove(m, typeTranslatorKey, url, className, true)}
                                    </React.Fragment>
                                )
                            })
                        }
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default PokemonMoves;
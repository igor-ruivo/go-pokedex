import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import "./PokemonMoves.scss"
import { usePokemon } from "../contexts/pokemon-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { LeagueType } from "../hooks/useLeague";
import { usePvp } from "../contexts/pvp-context";
import { useMoves } from "../contexts/moves-context";
import { useGameTranslation } from "../contexts/gameTranslation-context";
import React, { useEffect, useState } from "react";
import ListEntry from "./ListEntry";

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
    const [fastMovesCollapsed, setFastMovesCollapsed] = useState(true);
    const [chargedMovesCollapsed, setChargedMovesCollapsed] = useState(true);
    
    useEffect(() => {
        if (!fastMovesCollapsed || !chargedMovesCollapsed) {
            window.scrollTo(0, document.body.scrollHeight);
        }
    }, [fastMovesCollapsed, chargedMovesCollapsed]);

    if (!fetchCompleted || !gameTranslationFetchCompleted || !pvpFetchCompleted || !movesFetchCompleted || !gamemasterPokemon || !pokemon) {
        return <></>;
    }

    const greatLeagueMoveset = rankLists[0][pokemon.speciesId]?.moveset ?? [];
    const ultraLeagueMoveset = rankLists[1][pokemon.speciesId]?.moveset ?? [];
    const masterLeagueMoveset = rankLists[2][pokemon.speciesId]?.moveset ?? [];
    const customLeagueMoveset = rankLists[3][pokemon.speciesId]?.moveset ?? [];

    const relevantMoveSet = league === LeagueType.GREAT_LEAGUE ? greatLeagueMoveset : league === LeagueType.ULTRA_LEAGUE ? ultraLeagueMoveset : league === LeagueType.CUSTOM_CUP ? customLeagueMoveset : masterLeagueMoveset;
    
    const fastMoveClassName = `background-${moves[relevantMoveSet[0]]?.type}`;
    const chargedMove1ClassName = `background-${moves[relevantMoveSet[1]]?.type}`;
    const chargedMove2ClassName = `background-${moves[relevantMoveSet[2]]?.type}`;

    const translateMoveFromMoveId = (moveId: string) => {
        const typedMove = moves[moveId];
        const vid = typedMove.vId;
        return gameTranslation[vid].name;
    }

    const movesSorter = (m1: string, m2: string) => {
        const move1 = moves[m1];
        const move2 = moves[m2];

        const specialComparison = (hasBuffs(m2) ? 1 : 0) - (hasBuffs(m1) ? 1 : 0);
        if (specialComparison !== 0) {
            return specialComparison;
        }

        const eliteComparison = (pokemon.eliteMoves.includes(m2) ? 1 : 0) - (pokemon.eliteMoves.includes(m1) ? 1 : 0);
        if (eliteComparison !== 0) {
            return eliteComparison;
        }

        const legacyComparison = (pokemon.legacyMoves.includes(m2) ? 1 : 0) - (pokemon.legacyMoves.includes(m1) ? 1 : 0);
        if (legacyComparison !== 0) {
            return legacyComparison;
        }

        const stabComparison = (isStabMove(m2) ? 1 : 0) - (isStabMove(m1) ? 1 : 0);
        if (stabComparison !== 0) {
            return stabComparison;
        }

        const typeComparison = (move1.type.localeCompare(move2.type));
        if (typeComparison !== 0) {
            return typeComparison;
        }

        return translateMoveFromMoveId(m1).localeCompare(translateMoveFromMoveId(m2));
    }

    const fastMoveTypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[0]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[0]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    const chargedMove1TypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[1]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[1]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    const chargedMove2TypeTranslatorKey = TranslatorKeys[(moves[relevantMoveSet[2]]?.type.substring(0, 1).toLocaleUpperCase() + moves[relevantMoveSet[2]]?.type.substring(1)) as keyof typeof TranslatorKeys];
    
    const fastMoveUrl = `${process.env.PUBLIC_URL}/images/types/${moves[relevantMoveSet[0]]?.type}.png`;
    const chargedMove1Url = `${process.env.PUBLIC_URL}/images/types/${moves[relevantMoveSet[1]]?.type}.png`;
    const chargedMove2Url = `${process.env.PUBLIC_URL}/images/types/${moves[relevantMoveSet[2]]?.type}.png`;

    const leagueName = gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.MASTER_LEAGUE ? GameTranslatorKeys.MasterLeague : GameTranslatorKeys.HolidayCup, currentGameLanguage);

    const isStabMove = (moveId: string) => pokemon.types.map(t => { const stringVal = t.toString(); return stringVal.toLocaleLowerCase() }).includes(moves[moveId].type.toLocaleLowerCase());
    const hasBuffs = (moveId: string) => !!moves[moveId].pvpBuffs;
    
    const computeIdAttr = (moveId: string, isRecommended: boolean) => `details-${moveId}-${isRecommended ? "rec" : "all"}`;

    const detailsClickHandler = (e: MouseEvent, elementId: string) => {
        const details = document.getElementById(elementId) as HTMLDetailsElement;
        if (details) {
            details.open = !details.open;
            e.stopPropagation();
            e.preventDefault();
        }
    }

    const renderBuffDetailItem = (moveId: string, isRecommended: boolean) => {
        const idAttr = computeIdAttr(moveId, isRecommended);

        return {
            detailId: `${idAttr}-buff`,
            onClick: (event: any) => detailsClickHandler(event, `${idAttr}-buff`),
            summary: <>
                <img className="invert-dark-mode" alt="Special effects" loading="lazy" width="10" height="10" decoding="async" src="https://db.pokemongohub.net/vectors/magic.svg"/>
                {translator(TranslatorKeys.Special, currentLanguage)}
            </>,
            content: <>
                <p>
                    <strong>{translateMoveFromMoveId(moveId)}</strong> {translator(TranslatorKeys.Has, currentLanguage)} <strong>{moves[moveId].pvpBuffs!.chance * 100}% {translator(TranslatorKeys.Chance, currentLanguage)}</strong> {translator(TranslatorKeys.To, currentLanguage)}:
                </p>
                <ul className="buff-panel-buff">
                    {moves[moveId].pvpBuffs!.buffs
                        .map(b => <li key={b.buff}>
                            {translator(b.quantity >= 0 ? TranslatorKeys.Increase : TranslatorKeys.Lower, currentLanguage)} {translator(TranslatorKeys[b.buff as keyof typeof TranslatorKeys], currentLanguage)} {(b.quantity > 0 ? (((b.quantity + 4) / 4) - 1) * 100 + "% " + translator(TranslatorKeys.BaseValue, currentLanguage) : b.quantity * -1 + " " + translator(b.quantity === -1 ? TranslatorKeys.Stage : TranslatorKeys.Stages, currentLanguage))}
                        </li>)
                    }
                </ul>
            </>
        }
    }

    const renderEliteDetailItem = (moveId: string, isRecommended: boolean, isLegacy: boolean) => {
        const idAttr = computeIdAttr(moveId, isRecommended);

        return {
            detailId: `${idAttr}-${isLegacy ? "legacy" : "elite"}`,
            onClick: (event: any) => detailsClickHandler(event, `${idAttr}-${isLegacy ? "legacy" : "elite"}`),
            summary: <>
                {translator(isLegacy ? TranslatorKeys.LegacyMove : TranslatorKeys.EliteMove, currentLanguage)}
            </>,
            content: <>
                <p>
                    {translator(isLegacy ? TranslatorKeys.Legacy : TranslatorKeys.Elite, currentLanguage)} {!isLegacy && gameTranslator(GameTranslatorKeys.EliteTM, currentGameLanguage)}{!isLegacy && `.`}
                </p>
            </>
        }
    }

    const renderStabDetailItem = (moveId: string, isRecommended: boolean) => {
        const idAttr = computeIdAttr(moveId, isRecommended);

        return {
            detailId: `${idAttr}-stab`,
            onClick: (event: any) => detailsClickHandler(event, `${idAttr}-stab`),
            summary: <>
                STAB
            </>,
            content: <>
                <p>
                    <i>"<b>S</b>ame <b>T</b>ype <b>A</b>ttack <b>B</b>onus"</i> - {translator(TranslatorKeys.STAB, currentLanguage)}
                </p>
            </>
        }
    }

    const renderDetails = (moveId: string, isRecommended: boolean) => {
        const details = [];

        if (hasBuffs(moveId)) {
            details.push(renderBuffDetailItem(moveId, isRecommended));
        }

        if (pokemon.eliteMoves.includes(moveId)) {
            details.push(renderEliteDetailItem(moveId, isRecommended, false))
        }

        if (!pokemon.eliteMoves.includes(moveId) && pokemon.legacyMoves.includes(moveId)) {
            details.push(renderEliteDetailItem(moveId, isRecommended, true))
        }

        if (isStabMove(moveId)) {
            details.push(renderStabDetailItem(moveId, isRecommended))
        }

        return details;
    }

    const renderMove = (moveId: string, typeTranslatorKey: TranslatorKeys, moveUrl: string, className: string, isChargedMove: boolean, isRecommended: boolean) => {
        return <ListEntry
            mainIcon={
                {
                    imageDescription: translator(typeTranslatorKey ?? moves[moveId].type, currentLanguage),
                    image: <div className="img-padding"><img height={28} width={28} src={moveUrl} alt={translator(typeTranslatorKey ?? moves[moveId].type, currentLanguage)}/></div>,
                    imageSideText: translateMoveFromMoveId(moveId) + (pokemon.eliteMoves.includes(moveId) ? " *" : pokemon.legacyMoves.includes(moveId) ? " †" : ""),
                    withBackground: true
                }
            }
            backgroundColorClassName={className}
            secondaryContent={[
                <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-atk`}>
                    {Math.round(moves[moveId].pvpPower * (isStabMove(moveId) ? 1.2 : 1) * (pokemon.isShadow ? 1.2 : 1) * 10) / 10}
                    <img className="invert-light-mode" alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={16}/>
                </React.Fragment>,
                <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-eng`}>
                    {moves[moveId].pvpEnergyDelta * (isChargedMove ? -1 : 1)}
                    <img className="invert-light-mode" alt="energy gain" src="https://i.imgur.com/Ztp5sJE.png" width={11} height={16}/>
                </React.Fragment>,
                !isChargedMove && <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-cd`}>
                    {moves[moveId].pvpDuration}s
                    <img className="invert-light-mode" alt="cooldown" src="https://i.imgur.com/RIdKYJG.png" width={11} height={16}/>
                </React.Fragment>
            ]}
            toggledContent={[
                !isChargedMove && <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-dps`}>
                    {Math.round(moves[moveId].pvpPower * (isStabMove(moveId) ? 1.2 : 1) * (pokemon.isShadow ? 1.2 : 1) / moves[moveId].pvpDuration * 100) / 100} DPS
                </React.Fragment>,
                !isChargedMove && <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-eps`}>
                {Math.round(moves[moveId].pvpEnergyDelta / moves[moveId].pvpDuration * 100) / 100} EPS
                </React.Fragment>,
                isChargedMove && <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-dpe`}>
                {Math.round(moves[moveId].pvpPower * (isStabMove(moveId) ? 1.2 : 1) * (pokemon.isShadow ? 1.2 : 1) / moves[moveId].pvpEnergyDelta * -1 * 100) / 100} DPE
                </React.Fragment>
            ]}
            details={renderDetails(moveId, isRecommended)}
        />
    }

    return (
        <div className="banner_layout">
            <div className="recommended-moves">
                <div className="recommended-moves-content menu-item">
                    <h3 className="moves-title recommended-title">
                        {`${translator(TranslatorKeys.RecommendedMoves, currentLanguage)} (${leagueName})`}
                    </h3>
                    <ul className="moves-list extra-padding sparse-list">
                        {rankLists[league as number][pokemon.speciesId] ? 
                            <div className="moves-list extra-padding sparse-list">
                                <div className="with-bottom-border">
                                    {renderMove(relevantMoveSet[0], fastMoveTypeTranslatorKey, fastMoveUrl, fastMoveClassName, false, true)}
                                </div>
                                <div className="recommended-charged-moves">
                                    {renderMove(relevantMoveSet[1], chargedMove1TypeTranslatorKey, chargedMove1Url, chargedMove1ClassName, true, true)}
                                    {renderMove(relevantMoveSet[2], chargedMove2TypeTranslatorKey, chargedMove2Url, chargedMove2ClassName, true, true)}
                                </div>
                            </div> :
                            <span className="unavailable_moves">
                                {translator(TranslatorKeys.RecommendedMovesUnavailable, currentLanguage)}<br></br>
                                {pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} {translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} {gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.CUSTOM_CUP ? GameTranslatorKeys.HolidayCup : GameTranslatorKeys.MasterLeague, currentGameLanguage)}
                            </span>
                        }
                    </ul>
                </div>
            </div>
            <div className="moves-display-layout">
                <div className="menu-item">
                    <div onClick={() => {setFastMovesCollapsed(c => !c)}} className={`moves-title ${fastMovesCollapsed ? "hidden" : ""} all-moves fast-moves-section`}>
                        <h3>
                            {translator(TranslatorKeys.FastMoves, currentLanguage)}
                        </h3>
                        <figure className="chevron move-card hidden-in-big-screens">
                            <img className="invert-dark-mode" alt="All available Fast Moves" loading="lazy" width="18" height="18" decoding="async" src={`${process.env.PUBLIC_URL}/vectors/chevron-${fastMovesCollapsed ? "down" : "up"}.svg`} />
                        </figure>
                    </div>
                    <ul className={`moves-list ${fastMovesCollapsed ? "hidden" : ""} no-padding sparse-list`}>
                        {
                            pokemon.fastMoves
                            .sort(movesSorter)
                            .map(m => {
                                const className = `background-${moves[m].type}`;
                                const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                                const url = `${process.env.PUBLIC_URL}/images/types/${moves[m]?.type}.png`;
                                return (
                                    <React.Fragment key={m}>
                                        {renderMove(m, typeTranslatorKey, url, className, false, false)}
                                    </React.Fragment>
                                )
                            })
                        }
                    </ul>
                </div>
                <div className="menu-item">
                    <div onClick={() => {setChargedMovesCollapsed(c => !c)}} className={`moves-title ${chargedMovesCollapsed ? "hidden" : ""} all-moves charged-moves-section`}>
                        <h3>
                            {translator(TranslatorKeys.ChargedMoves, currentLanguage)}
                        </h3>
                        <figure className="chevron move-card hidden-in-big-screens">
                            <img className="invert-dark-mode" alt="All available Charged Moves" loading="lazy" width="18" height="18" decoding="async" src={`${process.env.PUBLIC_URL}/vectors/chevron-${chargedMovesCollapsed ? "down" : "up"}.svg`} />
                        </figure>
                    </div>
                    <ul className={`moves-list ${chargedMovesCollapsed ? "hidden" : ""} no-padding sparse-list`}>
                        {
                            pokemon.chargedMoves
                            .sort(movesSorter)
                            .map(m => {
                                const className = `background-${moves[m].type}`;
                                const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                                const url = `${process.env.PUBLIC_URL}/images/types/${moves[m]?.type}.png`;
                                return (
                                    <React.Fragment key={m}>
                                        {renderMove(m, typeTranslatorKey, url, className, true, false)}
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
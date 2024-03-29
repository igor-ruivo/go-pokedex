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
import React, { useEffect, useMemo, useState } from "react";
import ListEntry from "./ListEntry";
import { Effectiveness, calculateDamage, computeDPSEntry, getAllChargedMoves, getAllFastMoves, translateMoveFromMoveId } from "../utils/pokemon-helper";
import { PokemonTypes } from "../DTOs/PokemonTypes";
import { translatedType } from "./PokemonInfoImagePlaceholder";
import { useRaidRanker } from "../contexts/raid-ranker-context";

interface IPokemonMoves {
    pokemon: IGamemasterPokemon;
    level: number;
    league: LeagueType;
}

const PokemonMoves = ({pokemon, level, league}: IPokemonMoves) => {
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const {gameTranslation, gameTranslationFetchCompleted} = useGameTranslation();
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {moves, movesFetchCompleted} = useMoves();
    const { raidDPS, computeRaidRankerforTypes, raidRankerFetchCompleted } = useRaidRanker();
    const [fastMovesCollapsed, setFastMovesCollapsed] = useState(false);
    const [chargedMovesCollapsed, setChargedMovesCollapsed] = useState(false);
    const [raidAttackType, setRaidAttackType] = useState<string>("");

    const type = useMemo(() => {
        if (!raidAttackType) {
            return undefined;
        }

        return [(raidAttackType.substring(0, 1).toLocaleUpperCase() + raidAttackType.substring(1).toLocaleLowerCase()) as unknown as PokemonTypes];
    }, [raidAttackType]);

    useEffect(() => {
        if (!fetchCompleted || !movesFetchCompleted || raidRankerFetchCompleted(type)) {
            return;
        }

        computeRaidRankerforTypes(gamemasterPokemon, moves, type);
    }, [fetchCompleted, movesFetchCompleted, type, gamemasterPokemon, moves, computeRaidRankerforTypes, raidRankerFetchCompleted, raidAttackType]);

    if (!raidRankerFetchCompleted(type) || !fetchCompleted || !gameTranslationFetchCompleted || !pvpFetchCompleted || !movesFetchCompleted || !gamemasterPokemon || !pokemon) {
        return <></>;
    }

    const greatLeagueMoveset = rankLists[0][pokemon.speciesId]?.moveset ?? [];
    const ultraLeagueMoveset = rankLists[1][pokemon.speciesId]?.moveset ?? [];
    const masterLeagueMoveset = rankLists[2][pokemon.speciesId]?.moveset ?? [];
    const customLeagueMoveset = rankLists[3] ? (rankLists[3][pokemon.speciesId]?.moveset ?? []) : [];

    const raidComputation = raidDPS[type ? type[0].toString().toLocaleLowerCase() : ""][pokemon.speciesId] ?? computeDPSEntry(pokemon, gamemasterPokemon, moves, 15, 100, raidAttackType);
    const raidMoveset: [string, string] = [raidComputation.fastMove, raidComputation.chargedMove];
    const realDps = computeDPSEntry(pokemon, gamemasterPokemon, moves, 15, level, raidAttackType, undefined, raidMoveset);

    const relevantMoveSet = league === LeagueType.GREAT_LEAGUE ? greatLeagueMoveset : league === LeagueType.ULTRA_LEAGUE ? ultraLeagueMoveset : league === LeagueType.CUSTOM_CUP ? customLeagueMoveset : league === LeagueType.MASTER_LEAGUE ? masterLeagueMoveset : raidMoveset;

    const movesSorter = (m1: string, m2: string) => {
        const move1 = moves[m1];
        const move2 = moves[m2];

        const m1Index = relevantMoveSet.indexOf(m1);
        const m2Index = relevantMoveSet.indexOf(m2);

        const recommendedComparison = (m2Index !== -1 ? 1 : 0) - (m1Index !== -1 ? 1 : 0);
        if (recommendedComparison !== 0) {
            return recommendedComparison;
        }

        if (m1Index !== -1 && m2Index !== -1) {
            const indexesDraw = m2Index - m1Index;
            if (indexesDraw !== 0) {
                return indexesDraw * -1;
            }
        }

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

        return translateMoveFromMoveId(m1, moves, gameTranslation).localeCompare(translateMoveFromMoveId(m2, moves, gameTranslation));
    }
    
    const isStabMove = (moveId: string) => pokemon.types.map(t => { const stringVal = t.toString(); return stringVal.toLocaleLowerCase() }).includes(moves[moveId].type.toLocaleLowerCase());
    const hasBuffs = (moveId: string) => league !== LeagueType.RAID && !!moves[moveId].pvpBuffs;
    
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
                    <strong>{translateMoveFromMoveId(moveId, moves, gameTranslation)}</strong> {translator(TranslatorKeys.Has, currentLanguage)} <strong>{moves[moveId].pvpBuffs!.chance * 100}% {translator(TranslatorKeys.Chance, currentLanguage)}</strong> {translator(TranslatorKeys.To, currentLanguage)}:
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

    const relevantMovePower = (moveId: string) => {
        switch (league) {
            case LeagueType.RAID:
                return moves[moveId].pvePower;
            default:
                return moves[moveId].pvpPower;
        }
    };

    const relevantMoveEnergy = (moveId: string) => {
        switch (league) {
            case LeagueType.RAID:
                return moves[moveId].pveEnergyDelta;
            default:
                return moves[moveId].pvpEnergyDelta;
        }
    };

    const relevantMoveDuration = (moveId: string) => {
        switch (league) {
            case LeagueType.RAID:
                return moves[moveId].pveDuration;
            default:
                return moves[moveId].pvpDuration;
        }
    };

    const renderMove = (moveId: string, typeTranslatorKey: TranslatorKeys, moveUrl: string, className: string, isChargedMove: boolean, isRecommended: boolean) => {
        return <ListEntry
            mainIcon={
                {
                    imageDescription: translator(typeTranslatorKey ?? moves[moveId].type, currentLanguage),
                    image: <div className="img-padding"><img height={20} width={20} src={moveUrl} alt={translator(typeTranslatorKey ?? moves[moveId].type, currentLanguage)}/></div>,
                    imageSideText: translateMoveFromMoveId(moveId, moves, gameTranslation) + (pokemon.eliteMoves.includes(moveId) ? " *" : pokemon.legacyMoves.includes(moveId) ? " †" : ""),
                    withBackground: true
                }
            }
            backgroundColorClassName={className}
            secondaryContent={[
                <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-atk`}>
                    {Math.round(calculateDamage(pokemon.atk, relevantMovePower(moveId), isStabMove(moveId), pokemon.isShadow, false, league === LeagueType.RAID && raidAttackType && raidAttackType === moves[moveId].type ? Effectiveness.Effective : Effectiveness.Normal, 15, level) * 10) / 10}
                    <img className="invert-light-mode" alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={16}/>
                </React.Fragment>,
                <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-eng`}>
                    {relevantMoveEnergy(moveId) * (isChargedMove ? -1 : 1)}
                    <img className="invert-light-mode" alt="energy gain" src="https://i.imgur.com/Ztp5sJE.png" width={11} height={16}/>
                </React.Fragment>,
                (!isChargedMove || league === LeagueType.RAID) && <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-cd`}>
                    {relevantMoveDuration(moveId)}s
                    <img className="invert-light-mode" alt="cooldown" src="https://i.imgur.com/RIdKYJG.png" width={11} height={16}/>
                </React.Fragment>
            ]}
            toggledContent={[
                !isChargedMove && <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-dps`}>
                    {Math.round(calculateDamage(pokemon.atk, relevantMovePower(moveId), isStabMove(moveId), pokemon.isShadow, false, league === LeagueType.RAID && raidAttackType && raidAttackType === moves[moveId].type ? Effectiveness.Effective : Effectiveness.Normal, 15, level) / relevantMoveDuration(moveId) * 100) / 100} DPS
                </React.Fragment>,
                !isChargedMove && <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-eps`}>
                {Math.round(relevantMoveEnergy(moveId) / relevantMoveDuration(moveId) * 100) / 100} EPS
                </React.Fragment>,
                isChargedMove && <React.Fragment key={`${moveId}-${isRecommended ? "rec" : "all"}-dpe`}>
                {relevantMoveEnergy(moveId) !== 0 ? (Math.round(calculateDamage(pokemon.atk, relevantMovePower(moveId), isStabMove(moveId), pokemon.isShadow, false, league === LeagueType.RAID && raidAttackType && raidAttackType === moves[moveId].type ? Effectiveness.Effective : Effectiveness.Normal, 15, level) / relevantMoveEnergy(moveId) * -1 * 100) / 100) : "∞"} DPE
                </React.Fragment>
            ]}
            details={renderDetails(moveId, isRecommended)}
            slim
            soft
            defaultBackgroundStyle="normal-entry"
        />
    }

    return (
        <div className="banner_layout">
            {league === LeagueType.RAID && <><div className="raid-container item">
                <div className="overflowing">
                <div className="img-family">
                    {Array.from(new Set(getAllChargedMoves(pokemon, moves, gamemasterPokemon).map(m => moves[m].type))).filter(t => t !== "normal")
                    .map(t => (
                        <div className="clickable" key = {t} onClick={() => {
                            if (t === raidAttackType) {
                                setRaidAttackType("");
                            } else {
                                setRaidAttackType(t);
                            }
                        }}>
                            <strong className={`move-detail ${t === raidAttackType ? "soft" : "baby-soft"} normal-padding item ${t === raidAttackType ? "extra-padding-right" : ""}`}>
                                <div className="img-padding"><img height={30} width={30} alt="type" src={`${process.env.PUBLIC_URL}/images/types/${t}.png`}/></div>
                                {t === raidAttackType && translatedType((t.substring(0, 1).toLocaleUpperCase() + t.substring(1)) as unknown as PokemonTypes, currentLanguage)}
                            </strong>
                        </div>
                    ))}
                </div></div>
                <span className="with-padding">
                    <>
                        {!raidAttackType ? <span>{translator(TranslatorKeys.Overall, currentLanguage)}</span> : <span>{translator(TranslatorKeys.Focused1, currentLanguage)}</span>}
                        <strong className="cp-container">{translatedType((raidAttackType.substring(0, 1).toLocaleUpperCase() + raidAttackType.substring(1)) as unknown as PokemonTypes, currentLanguage)}</strong>
                        <span>{raidAttackType && translator(TranslatorKeys.Focused2, currentLanguage)}</span>
                        <span>{raidAttackType && translator(TranslatorKeys.Effective, currentLanguage)},</span>
                        <span>{` ${translator(TranslatorKeys.CanDeal, currentLanguage)}`}</span>
                        <strong className="cp-container"> {Math.round(realDps.dps * 100) / 100} DPS</strong>
                        <span>{` ${translator(TranslatorKeys.Using, currentLanguage)}`}</span>
                        <strong className="cp-container">{` ${translateMoveFromMoveId(raidComputation.fastMove, moves, gameTranslation)}`}</strong>
                        <span>{` ${translator(TranslatorKeys.And, currentLanguage)}`}</span>
                        <strong className="cp-container">{` ${translateMoveFromMoveId(raidComputation.chargedMove, moves, gameTranslation)}`}</strong>
                        .
                    </>
                </span>
            </div>
            </>}
            {league !== LeagueType.RAID && <div className="menu-item centered"><div>{relevantMoveSet.length > 0 ? <><strong className="cp-container">{`${translateMoveFromMoveId(relevantMoveSet[0], moves, gameTranslation)}`}</strong><span>{` ${translator(TranslatorKeys.RecommendedFast, currentLanguage)}.`}</span><strong className="cp-container">{` ${translateMoveFromMoveId(relevantMoveSet[1], moves, gameTranslation)}`}</strong>{relevantMoveSet[2] && <><span>{` ${translator(TranslatorKeys.And, currentLanguage)}`}</span><strong className="cp-container">{` ${translateMoveFromMoveId(relevantMoveSet[2], moves, gameTranslation)}`}</strong></>}<span>{` ${translator(relevantMoveSet[2] ? TranslatorKeys.RecommendedCharged : TranslatorKeys.RecommendedChargedSingle, currentLanguage)}.`}</span></> : `${pokemon.speciesName} ${translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} ${gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.MASTER_LEAGUE ? GameTranslatorKeys.MasterLeague : GameTranslatorKeys.FantasyCup, currentGameLanguage)}...`}</div></div>}
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
                    <ul className={`moves-list ${fastMovesCollapsed ? "hidden" : ""} no-padding slim-list`}>
                        {
                            getAllFastMoves(pokemon, moves).length > 0 ?
                            getAllFastMoves(pokemon, moves)
                            .sort(movesSorter)
                            .map(m => {
                                const className = relevantMoveSet.includes(m) ? `background-${moves[m].type}` : "normal-entry";
                                const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                                const url = `${process.env.PUBLIC_URL}/images/types/${moves[m]?.type}.png`;
                                return (
                                    <React.Fragment key={m}>
                                        {renderMove(m, typeTranslatorKey, url, className, false, false)}
                                    </React.Fragment>
                                )
                            }) : <span className="centered">{translator(TranslatorKeys.NoResults, currentLanguage)}</span>
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
                    <ul className={`moves-list ${chargedMovesCollapsed ? "hidden" : ""} no-padding slim-list`}>
                        {
                            getAllChargedMoves(pokemon, moves, gamemasterPokemon).length > 0 ?
                            getAllChargedMoves(pokemon, moves, gamemasterPokemon)
                            .sort(movesSorter)
                            .map(m => {
                                const className = relevantMoveSet.includes(m) ? `background-${moves[m].type}` : "normal-entry";
                                const typeTranslatorKey = TranslatorKeys[(moves[m].type.substring(0, 1).toLocaleUpperCase() + moves[m].type.substring(1)) as keyof typeof TranslatorKeys];
                                const url = `${process.env.PUBLIC_URL}/images/types/${moves[m]?.type}.png`;
                                return (
                                    <React.Fragment key={m}>
                                        {renderMove(m, typeTranslatorKey, url, className, true, false)}
                                    </React.Fragment>
                                )
                            }) : <span className="centered">{translator(TranslatorKeys.NoResults, currentLanguage)}</span>
                        }
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default PokemonMoves;
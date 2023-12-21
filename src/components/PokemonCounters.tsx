import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import "./PokemonMoves.scss"
import { usePokemon } from "../contexts/pokemon-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { LeagueType } from "../hooks/useLeague";
import { usePvp } from "../contexts/pvp-context";
import React, { useEffect, useMemo, useState } from "react";
import ListEntry from "./ListEntry";
import PokemonImage from "./PokemonImage";
import { useLocation, useNavigate } from "react-router-dom";
import { ImageSource, useImageSource } from "../contexts/language-context copy";
import { computeDPSEntry } from "../utils/pokemon-helper";
import { useMoves } from "../contexts/moves-context";
import { MatchUp } from "../DTOs/IRankedPokemon";
import { useGameTranslation } from "../contexts/gameTranslation-context";
import { ConfigKeys, readPersistentValue, writePersistentValue } from "../utils/persistent-configs-handler";

interface IPokemonCounters {
    pokemon: IGamemasterPokemon;
    league: LeagueType;
}

type dpsEntry = {
    fastMoveId: string;
    chargedMoveId: string;
    dps: number;
    speciesId: string;
    fastMoveDamage: number;
    chargedMoveDamage: number;
}

const parsePersistentCachedNumberValue = (key: ConfigKeys, defaultValue: number) => {
    const cachedValue = readPersistentValue(key);
    if (!cachedValue) {
        return defaultValue;
    }
    return +cachedValue;
}

const parsePersistentCachedBooleanValue = (key: ConfigKeys, defaultValue: boolean) => {
    const cachedValue = readPersistentValue(key);
    if (cachedValue === null) {
        return defaultValue;
    }
    return cachedValue === "true";
}

const PokemonCounters = ({pokemon, league}: IPokemonCounters) => {
    const [shadow, setShadow] = useState(parsePersistentCachedBooleanValue(ConfigKeys.Shadow, true));
    const [mega, setMega] = useState(parsePersistentCachedBooleanValue(ConfigKeys.Mega, true));
    const [top, setTop] = useState(parsePersistentCachedNumberValue(ConfigKeys.ShowEntries, 5));
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {gameTranslation, gameTranslationFetchCompleted} = useGameTranslation();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const {moves, movesFetchCompleted} = useMoves();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const {imageSource} = useImageSource();
    const resourcesNotReady = !fetchCompleted || !gameTranslationFetchCompleted || !movesFetchCompleted || !pvpFetchCompleted || !gamemasterPokemon || !pokemon;
    
    useEffect(() => {
        writePersistentValue(ConfigKeys.ShowEntries, top.toString());
    }, [top]);

    useEffect(() => {
        writePersistentValue(ConfigKeys.Mega, mega.toString());
    }, [mega]);

    useEffect(() => {
        writePersistentValue(ConfigKeys.Shadow, shadow.toString());
    }, [shadow]);

    const comparisons = useMemo(() => {
        if (resourcesNotReady) {
            return [];
        }

        const comparisons: dpsEntry[] = [];
        Object.values(gamemasterPokemon)
            .filter(p => !p.aliasId)
            .forEach(p => comparisons.push(computeDPSEntry(p, moves, 15, 100, "", pokemon)));
        return comparisons.sort((e1: dpsEntry, e2: dpsEntry) => e2.dps - e1.dps);
    }, [resourcesNotReady, gamemasterPokemon, moves, pokemon]);

    if (resourcesNotReady) {
        return <></>;
    }

    const greatLeagueMatchUps = rankLists[0][pokemon.speciesId]?.matchups ?? [];
    const greatLeagueCounters = rankLists[0][pokemon.speciesId]?.counters ?? [];
    const ultraLeagueMatchUps = rankLists[1][pokemon.speciesId]?.matchups ?? [];
    const ultraLeagueCounters = rankLists[1][pokemon.speciesId]?.counters ?? [];
    const masterLeagueMatchUps = rankLists[2][pokemon.speciesId]?.matchups ?? [];
    const masterLeagueCounters = rankLists[2][pokemon.speciesId]?.counters ?? [];
    const customLeagueMatchUps = rankLists[3][pokemon.speciesId]?.matchups ?? [];
    const customLeagueCounters = rankLists[3][pokemon.speciesId]?.counters ?? [];

    const relevantMatchUps = league === LeagueType.GREAT_LEAGUE ? greatLeagueMatchUps : league === LeagueType.ULTRA_LEAGUE ? ultraLeagueMatchUps : league === LeagueType.CUSTOM_CUP ? customLeagueMatchUps : masterLeagueMatchUps;
    const relevantCounters = league === LeagueType.GREAT_LEAGUE ? greatLeagueCounters : league === LeagueType.ULTRA_LEAGUE ? ultraLeagueCounters : league === LeagueType.CUSTOM_CUP ? customLeagueCounters : masterLeagueCounters;

    const leagueName = gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.MASTER_LEAGUE ? GameTranslatorKeys.MasterLeague : league === LeagueType.CUSTOM_CUP ? GameTranslatorKeys.HolidayCup : GameTranslatorKeys.Raids, currentGameLanguage);

    const renderPvPEntry = (pokemon: IGamemasterPokemon, score: number, className: string) => {
        const type1 = pokemon.types[0];
        const type2 = pokemon.types.length > 1 ? pokemon.types[1] : undefined;

        return <ListEntry
            mainIcon={
                {
                    imageDescription: pokemon.speciesName,
                    image: <div className={`${imageSource !== ImageSource.Official ? "" : "img-small-padding"}`}><PokemonImage pokemon={pokemon} specificHeight={imageSource !== ImageSource.Official ? 36 : 32} specificWidth={imageSource !== ImageSource.Official ? 36 : 32} withName={false}/></div>,
                    imageSideText: pokemon.speciesShortName,
                    withBackground: true
                }
            }
            backgroundColorClassName={className}
            secondaryContent={[
                <React.Fragment key={pokemon.speciesId}>
                    {score >= 500 ? <span className="win with-shadow with-brightness">{score / 10}%</span> : <span className="lose with-shadow with-brightness">{score / 10}%</span>}
                </React.Fragment>
            ]}
            onClick={() => navigate(`/pokemon/${pokemon.speciesId}${pathname.substring(pathname.lastIndexOf("/"))}`)}
            specificBackgroundStyle={`linear-gradient(45deg, var(--type-${type1}) 72%, var(--type-${type2 ??  type1}) 72%)`}
        />
    }

    const translateMoveFromMoveId = (moveId: string) => {
        const typedMove = moves[moveId];
        const vid = typedMove.vId;
        return gameTranslation[vid].name;
    }

    const detailsClickHandler = (e: MouseEvent, elementId: string) => {
        const details = document.getElementById(elementId) as HTMLDetailsElement;
        if (details) {
            details.open = !details.open;
            e.stopPropagation();
            e.preventDefault();
        }
    }

    const renderBuffDetailItem = (moveId: string, attack: number, speciesId: string) => {
        return {
            detailId: `${moveId}-${speciesId}`,
            onClick: (event: any) => detailsClickHandler(event, `${moveId}-${speciesId}`),
            summary: <>
                <img alt="Special effects" loading="lazy" width="14" height="14" decoding="async" src={`${process.env.PUBLIC_URL}/images/types/${moves[moveId].type}.png`}/>
                {translateMoveFromMoveId(moveId)}
            </>,
            content: <>
                <p>
                    <strong className="move-detail no-extra-padding">
                        {attack}
                        <img className="invert-light-mode" alt="damage" src="https://i.imgur.com/uzIMRdH.png" width={14} height={16}/>
                        {Math.abs(moves[moveId].pveEnergyDelta)}
                        <img className="invert-light-mode" alt="energy gain" src="https://i.imgur.com/Ztp5sJE.png" width={11} height={16}/>
                        {moves[moveId].pveDuration}s
                        <img className="invert-light-mode" alt="cooldown" src="https://i.imgur.com/RIdKYJG.png" width={11} height={16}/>
                    </strong>
                </p> 
            </>
        }
    }

    const renderRaidEntry = (pokemon: IGamemasterPokemon, dps: number, fastMove: string, chargedMove: string, className: string, fastMoveDamage: number, chargedMoveDamage: number) => {
        const type1 = pokemon.types[0];
        const type2 = pokemon.types.length > 1 ? pokemon.types[1] : undefined;

        return <ListEntry
            mainIcon={
                {
                    imageDescription: pokemon.speciesName,
                    image: <div className={`${imageSource !== ImageSource.Official ? "" : "img-small-padding"}`}><PokemonImage pokemon={pokemon} specificHeight={imageSource !== ImageSource.Official ? 36 : 32} specificWidth={imageSource !== ImageSource.Official ? 36 : 32} withName={false}/></div>,
                    imageSideText: pokemon.speciesShortName,
                    withBackground: true
                }
            }
            backgroundColorClassName={className}
            secondaryContent={[
                <React.Fragment key={pokemon.speciesId}>
                    {<span className="with-shadow with-brightness">{Math.round(dps * 100) / 100} DPS</span>}
                </React.Fragment>
            ]}
            onClick={() => navigate(`/pokemon/${pokemon.speciesId}${pathname.substring(pathname.lastIndexOf("/"))}`)}
            specificBackgroundStyle={`linear-gradient(45deg, var(--type-${type1}) 72%, var(--type-${type2 ??  type1}) 72%)`}
            details={[renderBuffDetailItem(fastMove, fastMoveDamage, pokemon.speciesId), renderBuffDetailItem(chargedMove, chargedMoveDamage, pokemon.speciesId)]}
        />
    }

    return (
        <div className="banner_layout">
            {league === LeagueType.RAID &&
                <div className="extra-ivs-options item default-padding block-column">
                    <span>
                        {translator(TranslatorKeys.In, currentLanguage).substring(0, 1).toLocaleUpperCase() + translator(TranslatorKeys.In, currentLanguage).substring(1)} {gameTranslator(GameTranslatorKeys.Raids, currentGameLanguage)}, {translator(TranslatorKeys.RaidsIntro, currentLanguage)} {pokemon.speciesName}:
                    </span>
                    <br/>
                    <br/>
                    <div className="justified">
                        {translator(TranslatorKeys.Show, currentLanguage)}&nbsp;<select value={top} onChange={e => setTop(+e.target.value)} className="select-level">
                            <option key={5} value={5}>{5}</option>
                            <option key={10} value={10}>{10}</option>
                            <option key={20} value={20}>{20}</option>
                            <option key={30} value={30}>{30}</option>
                            <option key={50} value={50}>{50}</option>
                        </select>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Mega <input type="checkbox" checked={mega} onChange={() => setMega(p => !p)}/>&nbsp;&nbsp;
                        {translator(TranslatorKeys.Shadow, currentLanguage)} <input type="checkbox" checked={shadow} onChange={() => setShadow(p => !p)}/>
                    </div>
                </div>
            }
            {league !== LeagueType.RAID && <span className="item default-padding">
                {translator(TranslatorKeys.TopKeyCountersIntro, currentLanguage)} {pokemon.speciesName} {translator(TranslatorKeys.In, currentLanguage)} {gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.CUSTOM_CUP ? GameTranslatorKeys.HolidayCup : GameTranslatorKeys.MasterLeague, currentGameLanguage)}:
            </span>}
            <div className={`${league !== LeagueType.RAID ? "counters-display-layout" : "raid-counters-display-layout"}`}>
                {league !== LeagueType.RAID && <div className="menu-item">
                    <div className={`moves-title all-moves fast-moves-section`}>
                        <h3>
                            {`${pokemon.speciesShortName} ${translator(TranslatorKeys.StrongAgainst, currentLanguage)} (${leagueName}):`}
                        </h3>
                    </div>
                    <ul className={`moves-list no-padding sparse-list`}>
                        {rankLists[league as number][pokemon.speciesId] ?
                            relevantMatchUps
                            .map(m => {
                                const pokemon = gamemasterPokemon[m.speciesId];
                                const className = `background-${pokemon.types[0].toString().toLocaleLowerCase()}`;
                                return (
                                    <React.Fragment key={m.speciesId}>
                                        {renderPvPEntry(pokemon, m.rating, className)}
                                    </React.Fragment>
                                )
                            }) :
                            <span className="unavailable_moves">
                                {pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} {translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} {gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.CUSTOM_CUP ? GameTranslatorKeys.HolidayCup : GameTranslatorKeys.MasterLeague, currentGameLanguage)}
                            </span>
                        }
                    </ul>
                </div>}
                <div className="menu-item">
                    <div className={`moves-title all-moves charged-moves-section`}>
                        <h3>
                            {`${pokemon.speciesShortName} ${translator(TranslatorKeys.WeakAgainst, currentLanguage)} (${leagueName}):`}
                        </h3>
                    </div>
                    <ul className={`moves-list no-padding sparse-list`}>
                        {league === LeagueType.RAID ?
                            comparisons
                            .filter(o => (shadow || !gamemasterPokemon[o.speciesId].isShadow) && (mega || !gamemasterPokemon[o.speciesId].isMega))
                            .slice(0, top)
                            .map(m => {
                                const pokemon = gamemasterPokemon[m.speciesId];
                                const className = `background-${pokemon.types[0].toString().toLocaleLowerCase()}`;
                                return (
                                    <React.Fragment key={m.speciesId}>
                                        {renderRaidEntry(pokemon, (m as dpsEntry).dps, (m as dpsEntry).fastMoveId, (m as dpsEntry).chargedMoveId, className, (m as dpsEntry).fastMoveDamage, (m as dpsEntry).chargedMoveDamage)}
                                    </React.Fragment>
                                )
                            }) :
                            rankLists[league as number][pokemon.speciesId] ?
                            relevantCounters
                            .map(m => {
                                const pokemon = gamemasterPokemon[m.speciesId];
                                const className = `background-${pokemon.types[0].toString().toLocaleLowerCase()}`;
                                return (
                                    <React.Fragment key={m.speciesId}>
                                        {renderPvPEntry(pokemon, (m as MatchUp).rating, className)}
                                    </React.Fragment>
                                )
                            }) :
                            <span className="unavailable_moves">
                                {pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} {translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} {gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.CUSTOM_CUP ? GameTranslatorKeys.HolidayCup : GameTranslatorKeys.MasterLeague, currentGameLanguage)}
                            </span>
                        }
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default PokemonCounters;
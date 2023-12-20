import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useLanguage } from "../contexts/language-context";
import "./PokemonMoves.scss"
import { usePokemon } from "../contexts/pokemon-context";
import translator, { TranslatorKeys } from "../utils/Translator";
import gameTranslator, { GameTranslatorKeys } from "../utils/GameTranslator";
import { LeagueType } from "../hooks/useLeague";
import { usePvp } from "../contexts/pvp-context";
import React from "react";
import ListEntry from "./ListEntry";
import PokemonImage from "./PokemonImage";
import { useLocation, useNavigate } from "react-router-dom";
import { ImageSource, useImageSource } from "../contexts/language-context copy";

interface IPokemonCounters {
    pokemon: IGamemasterPokemon;
    league: LeagueType;
}

const PokemonCounters = ({pokemon, league}: IPokemonCounters) => {
    const {currentLanguage, currentGameLanguage} = useLanguage();
    const {gamemasterPokemon, fetchCompleted} = usePokemon();
    const {rankLists, pvpFetchCompleted} = usePvp();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const {imageSource} = useImageSource();

    if (league === LeagueType.RAID) {
        return <div className="item default-padding">
            {translator(TranslatorKeys.WIP, currentLanguage)}
        </div>
    }

    if (!fetchCompleted || !pvpFetchCompleted || !gamemasterPokemon || !pokemon) {
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

    const leagueName = gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.MASTER_LEAGUE ? GameTranslatorKeys.MasterLeague : GameTranslatorKeys.HolidayCup, currentGameLanguage);

    const renderEntry = (pokemon: IGamemasterPokemon, score: number, className: string) => {
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

    return (
        <div className="banner_layout">
            <div className="counters-display-layout">
                <div className="menu-item">
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
                                        {renderEntry(pokemon, m.rating, className)}
                                    </React.Fragment>
                                )
                            }) :
                            <span className="unavailable_moves">
                                {pokemon.speciesName.replace("Shadow", translator(TranslatorKeys.Shadow, currentLanguage))} {translator(TranslatorKeys.UnrankedPokemonForLeague, currentLanguage)} {gameTranslator(league === LeagueType.GREAT_LEAGUE ? GameTranslatorKeys.GreatLeague : league === LeagueType.ULTRA_LEAGUE ? GameTranslatorKeys.UltraLeague : league === LeagueType.CUSTOM_CUP ? GameTranslatorKeys.HolidayCup : GameTranslatorKeys.MasterLeague, currentGameLanguage)}
                            </span>
                        }
                    </ul>
                </div>
                <div className="menu-item">
                    <div className={`moves-title all-moves charged-moves-section`}>
                        <h3>
                            {`${pokemon.speciesShortName} ${translator(TranslatorKeys.WeakAgainst, currentLanguage)} (${leagueName}):`}
                        </h3>
                    </div>
                    <ul className={`moves-list no-padding sparse-list`}>
                        {rankLists[league as number][pokemon.speciesId] ?
                            relevantCounters
                            .map(m => {
                                const pokemon = gamemasterPokemon[m.speciesId];
                                const className = `background-${pokemon.types[0].toString().toLocaleLowerCase()}`;
                                return (
                                    <React.Fragment key={m.speciesId}>
                                        {renderEntry(pokemon, m.rating, className)}
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
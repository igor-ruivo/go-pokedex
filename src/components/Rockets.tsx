import React, { useState } from "react";
import { useCalendar } from "../contexts/raid-bosses-context";
import PokemonMiniature from "./PokemonMiniature";
import ListEntry from "./ListEntry";
import { IRocketGrunt } from "../DTOs/INews";
import { usePokemon } from "../contexts/pokemon-context";
import { ConfigKeys, readSessionValue, writeSessionValue } from "../utils/persistent-configs-handler";
import useResize from "../hooks/useResize";
import LoadingRenderer from "./LoadingRenderer";

const Rockets = () => {
    const { leekRockets, leekRocketsFetchCompleted, leekRocketsErrors } = useCalendar();
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const { x } = useResize();

    const [expandedRocket, setExpandedRocket] = useState(readSessionValue(ConfigKeys.ExpandedRocket) ?? "");

    const renderMove = (m: IRocketGrunt, moveUrl: string, className: string) => {
        const colorVar = m.type ? `type-${m.type.substring(0, 1).toLocaleUpperCase() + m.type.substring(1)}` : undefined;

        return <ListEntry
            mainIcon={
                {
                    imageDescription: "",
                    image: <div className="img-padding guaranteedWidth"><img height={20} width={20} src={moveUrl} /></div>,
                    imageSideText: m.phrase,
                    withBackground: true
                }
            }
            expandable
            expanded={expandedRocket === m.trainerId}
            setExpanded={() => {
                setExpandedRocket(p => {
                    const newVal = p === m.trainerId ? "" : m.trainerId;
                    writeSessionValue(ConfigKeys.ExpandedRocket, newVal);
                    return newVal;
                });
            }}
            expandedContent={
                <div className='row-container'>
                    <div className='in-row round-border' style={colorVar ? { backgroundColor: `var(--${colorVar})` } : undefined}>
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? { border: `3px solid var(--${colorVar})` } : { border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>1</span>
                            <div className='in-row'>{m.tier1.map(id =>
                                <div key={id} className="mini-card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(0) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`} />}
                                    <div className={`mini-card-wrapper rocket-card-wrapper ${m.catchableTiers.includes(0) ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[id]} forceShadowAdorner linkToShadowVersion={m.catchableTiers.includes(0)} />
                                    </div>
                                </div>
                            )}</div></div>
                    </div>
                    <div className='in-row round-border' style={colorVar ? { backgroundColor: `var(--${colorVar})` } : undefined}>
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? { border: `3px solid var(--${colorVar})` } : { border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>2</span>
                            <div className='in-row'>{m.tier2.map(id =>
                                <div key={id} className="mini-card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(1) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`} />}
                                    <div className={`mini-card-wrapper rocket-card-wrapper ${m.catchableTiers.includes(1) ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[id]} forceShadowAdorner linkToShadowVersion={m.catchableTiers.includes(1)} />
                                    </div>
                                </div>
                            )}</div></div>
                    </div>
                    <div className='in-row round-border' style={colorVar ? { backgroundColor: `var(--${colorVar})` } : undefined}>
                        <div className={`in-row rockets-row-wrapper ${colorVar ? "not-softer" : "softer"}`} style={colorVar ? { border: `3px solid var(--${colorVar})` } : { border: `3px solid var(--borderColor2)` }}>
                            <span className='aligned-text-marker'>3</span>
                            <div className='in-row'>{m.tier3.map(id =>
                                <div key={id} className="mini-card-wrapper-padding dynamic-size relative">
                                    {m.catchableTiers.includes(2) && <img className="background-absolute-img-grunt" src={`${process.env.PUBLIC_URL}/images/pokeball.png`} />}
                                    <div className={`mini-card-wrapper rocket-card-wrapper ${m.catchableTiers.includes(2) ? "with-golden-border" : ""}`}>
                                        <PokemonMiniature pokemon={gamemasterPokemon[id]} forceShadowAdorner linkToShadowVersion={m.catchableTiers.includes(2)} />
                                    </div>
                                </div>
                            )}</div></div>
                    </div>
                </div>
            }
            backgroundColorClassName={className}
            slimmer
            slim
            soft
            defaultBackgroundStyle="normal-entry"
        />
    }

    return <LoadingRenderer errors={errors + leekRocketsErrors} completed={fetchCompleted && leekRocketsFetchCompleted}>
        <div className="moves-display-layout-big normal-text">
            <div className="menu-item">
                <ul className={`calendar-list no-padding`}>
                    {
                        leekRockets.slice(0, x > 1002 ? Math.round(leekRockets.length / 2) : leekRockets.length).map(m => {
                            const className = m.type ? `background-${m.type}` : "normal-entry";
                            const resName = m.type ? `types/${m.type}.png` : m.trainerId.includes("Sierra") ? "NPC/sierra.webp" : m.trainerId.includes("Cliff") ? "NPC/cliff.webp" : m.trainerId.includes("Giovanni") ? "NPC/giovanni.webp" : m.trainerId.includes("Arlo") ? "NPC/arlo.webp" : m.trainerId.includes("Female") ? "NPC/female-grunt.png" : "NPC/male-grunt.webp";
                            const url = `${process.env.PUBLIC_URL}/images/${resName}`;
                            return (
                                <React.Fragment key={m.trainerId}>
                                    {renderMove(m, url, className)}
                                </React.Fragment>
                            )
                        })
                    }
                </ul>
            </div>
            {x > 1002 && <div className="menu-item">
                <ul className={`calendar-list no-padding`}>
                    {
                        leekRockets.slice(Math.round(leekRockets.length / 2)).map(m => {
                            const className = m.type ? `background-${m.type}` : "normal-entry";
                            const resName = m.type ? `types/${m.type}.png` : m.trainerId.includes("Sierra") ? "NPC/sierra.webp" : m.trainerId.includes("Cliff") ? "NPC/cliff.webp" : m.trainerId.includes("Giovanni") ? "NPC/giovanni.webp" : m.trainerId.includes("Arlo") ? "NPC/arlo.webp" : m.trainerId.includes("Female") ? "NPC/female-grunt.png" : "NPC/male-grunt.webp";
                            const url = `${process.env.PUBLIC_URL}/images/${resName}`;
                            return (
                                <React.Fragment key={m.trainerId}>
                                    {renderMove(m, url, className)}
                                </React.Fragment>
                            )
                        })
                    }
                </ul>
            </div>}
        </div>
    </LoadingRenderer>;
}

export default Rockets;
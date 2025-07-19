import { useCallback, useState } from "react";
import { sortEntries } from "../DTOs/INews";
import { usePokemon } from "../contexts/pokemon-context";
import { useCalendar } from "../contexts/raid-bosses-context";
import LoadingRenderer from "./LoadingRenderer";
import PokemonMiniature from "./PokemonMiniature";
import translator, { TranslatorKeys } from "../utils/Translator";
import { useLanguage } from "../contexts/language-context";
import Section from "./Template/Section";
import { ConfigKeys, readSessionValue, writeSessionValue } from "../utils/persistent-configs-handler";

const Eggs = () => {
    const { currentEggs, errorLoadingCurrentEggs, currentEggsFetchCompleted } = useCalendar();
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const [currentEgg, setCurrentEgg] = useState(readSessionValue(ConfigKeys.ExpandedEgg) ?? "0");
    const {currentLanguage, currentGameLanguage} = useLanguage();

    const idxToEggName = useCallback((idx: number) => {
        switch (idx) {
            case 0:
                return "2 km";
            case 1:
                return "5 km";
            case 2:
                return "7 km";
            case 3:
                return "10 km";
            case 4:
                return "12 km";
        }
    }, []);

    const idxToEgg = useCallback((idx: number) => {
        switch (idx) {
            case 0:
                return "2km";
            case 1:
                return "5km";
            case 2:
                return "7km";
            case 3:
                return "10km";
            case 4:
                return "12km";
        }
    }, []);

    const idxToKind = useCallback((idx: number) => {
        switch (idx) {
            case 0:
                return 2;
            case 1:
                return 5;
            case 2:
                return 7;
            case 3:
                return 10;
            case 4:
                return 12;
        }
    }, []);

    return <LoadingRenderer errors={errorLoadingCurrentEggs + errors} completed={fetchCompleted && currentEggsFetchCompleted}>
        {() => <Section title={translator(TranslatorKeys.FeaturedEggs, currentLanguage)}>
            <div>
                <div className="raid-container">
                    <div className="overflowing">
                        <div className="img-family">
                            {[currentEggs.filter(e => e.kind === "2"), currentEggs.filter(e => e.kind === "5"), currentEggs.filter(e => e.kind === "7"), currentEggs.filter(e => e.kind === "10"), currentEggs.filter(e => e.kind === "12")]
                                .map((t, i) => (
                                    <div className="clickable" key={i} onClick={() => {setCurrentEgg(String(i)); writeSessionValue(ConfigKeys.ExpandedEgg, String(i))}}>
                                        <strong className={`small-move-detail ${String(i) === currentEgg ? "soft" : "baby-soft"} smallish-padding normal-text item ${String(i) === currentEgg ? "small-extra-padding-right" : ""}`}>
                                            <div className="img-padding"><img className="with-img-dropShadow" height={22} width={22} style={{ width: "auto" }} alt="type" src={`/images/eggs/${idxToEgg(i)}.png`} /></div>
                                            {String(i) === currentEgg && idxToEggName(i)}
                                        </strong>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
                <div className='with-flex contained'>
                    {currentEggs.filter(r => Object.values(r.comment?.en ?? {}).length === 0 && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p =>
                        <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                            <div className={`mini-card-wrapper`}>
                                <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                            </div>
                        </div>)}
                </div>
                {currentEggs.length > 0 && currentEggs.some(e => e.comment && e.comment[currentGameLanguage] && Object.values(e.comment[currentGameLanguage]).length > 0 && e.kind === String(idxToKind(+currentEgg))) && <div className='centered-text with-xl-padding'>
                    <strong>{currentEggs.find(e => e.kind === String(idxToKind(+currentEgg)) && e.comment && e.comment[currentGameLanguage])!.comment![currentGameLanguage]}:</strong>
                </div>}
                <div className='with-flex contained'>
                    {currentEggs.filter(r => r.comment && r.comment[currentGameLanguage] && Object.values(r.comment[currentGameLanguage]).length > 0 && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p => <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                        <div className={`mini-card-wrapper`}>
                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                        </div>
                    </div>)}
                </div>
            </div>
        </Section>}
    </LoadingRenderer>;
}

export default Eggs;
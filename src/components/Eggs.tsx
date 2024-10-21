import { useCallback, useState } from "react";
import { sortEntries } from "../DTOs/INews";
import { usePokemon } from "../contexts/pokemon-context";
import { useCalendar } from "../contexts/raid-bosses-context";
import LoadingRenderer from "./LoadingRenderer";
import PokemonMiniature from "./PokemonMiniature";
import translator, { TranslatorKeys } from "../utils/Translator";
import { Language, useLanguage } from "../contexts/language-context";
import Section from "./Template/Section";

const Eggs = () => {
    const { leekEggs, leekEggsErrors, leekEggsFetchCompleted } = useCalendar();
    const { gamemasterPokemon, fetchCompleted, errors } = usePokemon();
    const [currentEgg, setCurrentEgg] = useState("0");
    const {currentLanguage} = useLanguage();

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

    return <LoadingRenderer errors={leekEggsErrors + errors} completed={fetchCompleted && leekEggsFetchCompleted}>
        <Section title={translator(TranslatorKeys.FeaturedEggs, currentLanguage)}>
            <div>
                <div className="raid-container">
                    <div className="overflowing">
                        <div className="img-family">
                            {[(leekEggs?.eggs ?? []).filter(e => e.kind === "2"), (leekEggs?.eggs ?? []).filter(e => e.kind === "5"), (leekEggs?.eggs ?? []).filter(e => e.kind === "7"), (leekEggs?.eggs ?? []).filter(e => e.kind === "10"), (leekEggs?.eggs ?? []).filter(e => e.kind === "12")]
                                .map((t, i) => (
                                    <div className="clickable" key={i} onClick={() => setCurrentEgg(String(i))}>
                                        <strong className={`small-move-detail ${String(i) === currentEgg ? "soft" : "baby-soft"} smallish-padding normal-text item ${String(i) === currentEgg ? "small-extra-padding-right" : ""}`}>
                                            <div className="img-padding"><img height={22} width={22} style={{ width: "auto" }} alt="type" src={`${process.env.PUBLIC_URL}/images/eggs/${idxToEgg(i)}.png`} /></div>
                                            {String(i) === currentEgg && idxToEggName(i)}
                                        </strong>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
                <div className='with-flex contained'>
                    {(leekEggs?.eggs ?? []).filter(r => !r.comment && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p =>
                        <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                            <div className={`mini-card-wrapper`}>
                                <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                            </div>
                        </div>)}
                </div>
                {(leekEggs?.eggs?.length ?? 0) > 0 && leekEggs?.eggs!.some(e => e.comment && e.kind === String(idxToKind(+currentEgg))) && <div className='centered-text with-xl-padding'>
                    <strong>{currentLanguage === Language.English ? leekEggs?.eggs!.find(e => e.kind === String(idxToKind(+currentEgg)) && e.comment)!.comment : leekEggs?.eggs!.find(e => e.kind === String(idxToKind(+currentEgg)) && e.comment)!.comment?.replaceAll("Adventure Sync Rewards", "Recompensas de Sincroaventura").replaceAll("From Route Gift", "Ovos de 7 km da Troca de presentes de Mateo")}:</strong>
                </div>}
                <div className='with-flex contained'>
                    {(leekEggs?.eggs ?? []).filter(r => r.comment && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p => <div key={p.speciesId + p.kind} className="mini-card-wrapper-padding dynamic-size">
                        <div className={`mini-card-wrapper`}>
                            <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                        </div>
                    </div>)}
                </div>
            </div>
        </Section>
    </LoadingRenderer>;
}

export default Eggs;
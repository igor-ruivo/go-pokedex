import { useState } from "react";
import { sortEntries } from "../DTOs/INews";
import { usePokemon } from "../contexts/pokemon-context";
import { useCalendar } from "../contexts/raid-bosses-context";
import LoadingRenderer from "./LoadingRenderer";
import PokemonMiniature from "./PokemonMiniature";

const Eggs = () => {
    const { leekEggs, leekEggsErrors, leekEggsFetchCompleted } = useCalendar();
    const {gamemasterPokemon, fetchCompleted, errors} = usePokemon();
    const [currentEgg, setCurrentEgg] = useState("0");

    const idxToEggName = (idx: number) => {
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
    }

    const idxToEgg = (idx: number) => {
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
    }

    const idxToKind = (idx: number) => {
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
    }

    return <LoadingRenderer errors={leekEggsErrors + errors} completed={fetchCompleted && leekEggsFetchCompleted}>
        <div className='with-dynamic-max-width auto-margin-sides'><div className='item default-padding'>
            <div>
                <div><strong className='pvp-entry with-border fitting-content smooth normal-text with-margin-bottom'>Current Eggs:</strong></div>
                <div className="raid-container">
                    <div className="overflowing">
                        <div className="img-family">
                            {[(leekEggs.eggs ?? []).filter(e => e.kind === "2"), (leekEggs.eggs ?? []).filter(e => e.kind === "5"), (leekEggs.eggs ?? []).filter(e => e.kind === "7"), (leekEggs.eggs ?? []).filter(e => e.kind === "10"), (leekEggs.eggs ?? []).filter(e => e.kind === "12")]
                                .map((t, i) => (
                                    <div className="clickable" key={i} onClick={() => setCurrentEgg(String(i))}>
                                        <strong className={`move-detail ${String(i) === currentEgg ? "soft" : "baby-soft"} normal-padding item ${String(i) === currentEgg ? "extra-padding-right" : ""}`}>
                                            <div className="img-padding"><img height={26} width={26} style={{ width: "auto" }} alt="type" src={`${process.env.PUBLIC_URL}/images/eggs/${idxToEgg(i)}.png`} /></div>
                                            {String(i) === currentEgg && idxToEggName(i)}
                                        </strong>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div></div>
            <div className='with-flex contained'>
                {(leekEggs.eggs ?? []).filter(r => !r.comment && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p => <div key={p.speciesId + p.kind} className="card-wrapper-padding dynamic-size">
                    <div className={`card-wrapper`}>
                        <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                    </div>
                </div>)}
            </div>
            {(leekEggs.eggs?.length ?? 0) > 0 && leekEggs.eggs!.some(e => e.comment && e.kind === String(idxToKind(+currentEgg))) && <div className='centered-text with-xl-padding'><strong>{leekEggs.eggs!.find(e => e.kind === String(idxToKind(+currentEgg)) && e.comment)!.comment}:</strong></div>}
            <div className='with-flex contained'>
                {(leekEggs.eggs ?? []).filter(r => r.comment && r.kind === String(idxToKind(+currentEgg))).sort((a, b) => sortEntries(a, b, gamemasterPokemon)).map(p => <div key={p.speciesId + p.kind} className="card-wrapper-padding dynamic-size">
                    <div className={`card-wrapper`}>
                        <PokemonMiniature pokemon={gamemasterPokemon[p.speciesId]} />
                    </div>
                </div>)}
            </div>
        </div></div>
    </LoadingRenderer>;
}

export default Eggs;
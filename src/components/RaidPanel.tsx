import { IGamemasterPokemon } from "../DTOs/IGamemasterPokemon";
import { useMoves } from "../contexts/moves-context";
import { usePokemon } from "../contexts/pokemon-context";
import { Effectiveness, calculateDamage, pveDPS } from "../utils/pokemon-helper";
import RaidCard from "./RaidCard";
import "./RaidPanel.scss"

interface IRaidPanelProps {
    pokemon: IGamemasterPokemon;
    level: number;
    atkIV: number;
}

type dpsEntry = {
    fastMoveId: string;
    chargedMoveId: string;
    dps: number;
    speciesId: string;
}

const RaidPanel = ({ pokemon, level, atkIV }: IRaidPanelProps) => {
    const {moves} = useMoves();
    const {gamemasterPokemon} = usePokemon();

    const computeDPSEntry = (pokemon: IGamemasterPokemon, attackIV = 15, level = 100, forcedType = "") => {
        const fastMoves = Array.from(new Set(pokemon.fastMoves.concat(pokemon.eliteMoves.filter(m => moves[m].isFast))));
        const chargedMoves = Array.from(new Set(pokemon.chargedMoves.concat(pokemon.eliteMoves.filter(m => !moves[m].isFast))));
        let higherDPS = 0;
        let higherFast = "";
        let higherCharged = "";
        for(let i = 0; i < fastMoves.length; i++) {
            for(let j = 0; j < chargedMoves.length; j++) {
                const fastMove = moves[fastMoves[i]];
                const chargedMove = moves[chargedMoves[j]];
                if (forcedType && chargedMove.type.toLocaleLowerCase() !== forcedType.toLocaleLowerCase()) {
                    continue;
                }
                const fastMoveDmg = calculateDamage(pokemon.atk, fastMove.pvePower, pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(fastMove.type.toLocaleLowerCase()), pokemon.isShadow, Effectiveness.Effective, attackIV, level);
                const chargedMoveDmg = calculateDamage(pokemon.atk, chargedMove.pvePower, pokemon.types.map(t => t.toString().toLocaleLowerCase()).includes(chargedMove.type.toLocaleLowerCase()), pokemon.isShadow, Effectiveness.Effective, attackIV, level);
                const dps = pveDPS(chargedMoveDmg, fastMoveDmg, fastMove.pveDuration, chargedMove.pveEnergyDelta * -1, fastMove.pveEnergyDelta, chargedMove.pveDuration);
                if (dps > higherDPS) {
                    higherDPS = dps;
                    higherFast = fastMove.moveId;
                    higherCharged = chargedMove.moveId;
                }
            }
        }
        return {
            fastMoveId: higherFast,
            chargedMoveId: higherCharged,
            dps: higherDPS,
            speciesId: pokemon.speciesId
        };
    }

    const computeComparisons = (forcedType = "") => {
        const comparisons: dpsEntry[] = [];
        Object.values(gamemasterPokemon).filter(p => !p.aliasId).forEach(p => comparisons.push(computeDPSEntry(p, 15, 100, forcedType)));
        return comparisons.sort((e1: dpsEntry, e2: dpsEntry) => e2.dps - e1.dps);
    }

    const rank = computeComparisons().findIndex(c => c.speciesId === pokemon.speciesId) + 1;
    const type1Rank = computeComparisons(pokemon.types[0].toString().toLocaleLowerCase()).findIndex(c => c.speciesId === pokemon.speciesId) + 1;
    const type2Rank = pokemon.types.length > 1 ? computeComparisons(pokemon.types[1].toString().toLocaleLowerCase()).findIndex(c => c.speciesId === pokemon.speciesId) + 1 : 0;

    const selfRealDPS = computeDPSEntry(pokemon, atkIV, (level - 1) * 2);

    return <div className="pvp-stats-column default-background">
        <div>
            <div className="pvp-entry normal-entry with-border">
                <div className="pvp-entry-content potential">
                    <strong>
                        Ranked&nbsp;
                    </strong>
                    <strong className="cp-container with-brightness">
                        {rank}&nbsp;
                    </strong>
                    <strong>
                        in Raids
                    </strong>
                    <sub className="contained-big weighted-font">{`(${Math.round(selfRealDPS.dps * 100) / 100} DPS)`}</sub>
                </div>
            </div>
        </div>
        <div className={`contain`}>
            {pokemon.types.filter(t => t).map((t, i) => (
                <RaidCard
                    key={t}
                    type={t.toString()}
                    rank={i === 0 ? type1Rank : type2Rank}
                />
            ))}
            {
                pokemon.types.filter(t => t).length === 1 && <RaidCard
                    key="none"
                    type=""
                    rank={0}
                />
            }
        </div>
    </div>;
}

export default RaidPanel;
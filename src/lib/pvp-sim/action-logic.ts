import { calculateDamage } from './damage';
import type { SimPokemon } from './pokemon';
import { type BattleAction, createAction, type SimMove } from './types';

/** What the decision AI needs from the running battle. */
export interface ActionLogicBattle {
	getTurns: () => number;
	getQueuedActions: () => ReadonlyArray<BattleAction>;
}

/** State the AI's planner walks: how it would spend energy to knock the opponent out. */
class BattleState {
	constructor(
		public energy: number,
		public oppHealth: number,
		public turn: number,
		public oppShields: number,
		public moves: Array<SimMove>,
		public buffs: number,
		public chance: number
	) {}
}

const chargedAction = (battle: ActionLogicBattle, poke: SimPokemon, slot: number): BattleAction =>
	createAction('charged', poke.index, battle.getTurns(), slot, poke.priority);

/**
 * PvPoke's `ActionLogic.decideAction`: the AI that picks, each turn, between a
 * Fast Move and a Charged Move — and which one — including its shield-baiting
 * and move-timing heuristics. Returns `undefined` to mean "throw a Fast Move".
 *
 * This is a line-for-line port. Several upstream comparisons read fields that
 * don't exist (`hp`/`shields` on a planner state) and can never be true, which
 * is why no "dominated state" pruning appears below; the queue-insertion
 * indices are otherwise computed exactly as upstream does.
 */
export const decideAction = (
	battle: ActionLogicBattle,
	poke: SimPokemon,
	opponent: SimPokemon
): BattleAction | undefined => {
	const turns = battle.getTurns();
	const chargedMoveReady: Array<number> = [];
	const winsCMP = poke.stats.atk >= opponent.stats.atk;

	const fastDamage = calculateDamage(poke, opponent, poke.fastMove);
	const oppFastDamage = calculateDamage(opponent, poke, opponent.fastMove);
	let hasNonDebuff = false;

	// No Charged Moves at all
	if (poke.activeChargedMoves.length < 1) return undefined;

	// No Charged Move ready, or farming energy: Fast Move
	if (poke.energy < poke.fastestChargedMove.energy || poke.farmEnergy) return undefined;

	for (const move of poke.activeChargedMoves) {
		if (!move.selfDebuffing) hasNonDebuff = true;
		if (poke.energy >= move.energy) {
			chargedMoveReady.push(0);
		} else {
			chargedMoveReady.push(Math.ceil((move.energy - poke.energy) / poke.fastMove.energyGain) * poke.fastMove.turns);
		}
	}

	let turnsToLive = Infinity;
	const queue: Array<{ hp: number; opEnergy: number; turn: number; shields: number }> = [];

	// Account for the opponent being partway through a Fast Move.
	if (opponent.cooldown !== 0) {
		queue.unshift({
			hp: poke.hp - oppFastDamage,
			opEnergy: opponent.energy + opponent.fastMove.energyGain,
			turn: opponent.cooldown / 500,
			shields: poke.shields,
		});
	} else {
		queue.unshift({ hp: poke.hp, opEnergy: opponent.energy, turn: 0, shields: poke.shields });
	}

	// Can the opponent knock this Pokémon out before it can act again?
	while (queue.length !== 0) {
		const currState = queue.shift()!;

		if (currState.hp > oppFastDamage) {
			if (winsCMP) {
				if (currState.turn > poke.fastMove.turns) continue;
			} else if (currState.turn > poke.fastMove.turns + 1) {
				continue;
			}
		}

		// Shield-bait if shields are up, otherwise try to KO
		if (currState.shields !== 0) {
			if (currState.opEnergy >= opponent.fastestChargedMove.energy) {
				queue.unshift({
					hp: currState.hp - 1,
					opEnergy: currState.opEnergy - opponent.fastestChargedMove.energy,
					turn: currState.turn + 1,
					shields: currState.shields - 1,
				});
			}
		} else {
			for (const move of opponent.activeChargedMoves) {
				if (currState.opEnergy >= move.energy) {
					const moveDamage = calculateDamage(opponent, poke, move);

					if (moveDamage >= currState.hp) {
						turnsToLive = Math.min(currState.turn, turnsToLive);

						if (poke.stats.atk > opponent.stats.atk && opponent.fastMove.cooldown % poke.fastMove.cooldown === 0) {
							turnsToLive++;
						}
						break;
					}
					queue.unshift({
						hp: currState.hp - moveDamage,
						opEnergy: currState.opEnergy - move.energy,
						turn: currState.turn + 1,
						shields: currState.shields,
					});
				}
			}
		}

		// Does a Fast Move faint us?
		if (currState.hp - oppFastDamage <= 0) {
			turnsToLive = Math.min(currState.turn + opponent.fastMove.turns, turnsToLive);
			break;
		} else {
			queue.unshift({
				hp: currState.hp - oppFastDamage,
				opEnergy: currState.opEnergy + opponent.fastMove.energyGain,
				turn: currState.turn + opponent.fastMove.turns,
				shields: currState.shields,
			});
		}
	}

	// If we can't throw a Fast Move and live, throw whatever Charged Move does the most damage.
	if (poke.hp <= opponent.fastMove.damage * 2 && opponent.fastMove.cooldown === 500) turnsToLive--;

	// Anticipate a Fast Move that has already started landing
	if (poke.hp <= opponent.fastMove.damage && opponent.cooldown > 0 && opponent.fastMove.cooldown > 500) {
		turnsToLive = opponent.cooldown / 500;
		if (opponent.hp > poke.fastMove.damage) turnsToLive--;
	}

	// Anticipate a Fast Move landing if we use ours
	if (
		poke.hp <= opponent.fastMove.damage &&
		opponent.cooldown === 0 &&
		opponent.fastMove.cooldown <= poke.fastMove.cooldown + 500
	) {
		if (opponent.hp > poke.fastMove.damage) turnsToLive--;
	}

	if (
		turnsToLive * 500 < poke.fastMove.cooldown ||
		(turnsToLive * 500 === poke.fastMove.cooldown && !winsCMP) ||
		(turnsToLive * 500 === poke.fastMove.cooldown && poke.hp <= opponent.fastMove.damage)
	) {
		let maxDamageMoveIndex = 0;
		let prevMoveDamage = -1;

		// Upstream starts at `length`, reading one past the end (which is never "ready"); the same here.
		for (let n = poke.activeChargedMoves.length; n >= 0; n--) {
			if (chargedMoveReady[n] === 0) {
				const moveDamage = calculateDamage(poke, opponent, poke.activeChargedMoves[n]);

				if (moveDamage > prevMoveDamage) {
					maxDamageMoveIndex = poke.chargedMoves.indexOf(poke.activeChargedMoves[n]);
					prevMoveDamage = moveDamage;
				}

				// Two of these would deal more damage
				if (
					poke.energy >= poke.activeChargedMoves[n].energy * 2 &&
					poke.stats.atk > opponent.stats.atk &&
					moveDamage * 2 > prevMoveDamage
				) {
					maxDamageMoveIndex = poke.chargedMoves.indexOf(poke.activeChargedMoves[n]);
					prevMoveDamage = moveDamage * 2;
				}
			}
		}

		if (prevMoveDamage === -1) return undefined;
		return chargedAction(battle, poke, maxDamageMoveIndex);
	}

	// Throw a lethal Charged Move if it faints the opponent
	if (!poke.farmEnergy && opponent.shields === 0) {
		for (let n = 0; n < poke.activeChargedMoves.length; n++) {
			const move = poke.activeChargedMoves[n];
			const moveIndex = poke.chargedMoves.indexOf(poke.activeChargedMoves[n]);

			if (poke.energy >= move.energy) {
				const moveDamage = calculateDamage(poke, opponent, poke.activeChargedMoves[n]);

				// Not a self-debuffing move, and not if the opponent would faint to a Fast Move anyway
				if (
					opponent.hp <= moveDamage &&
					!move.selfDebuffing &&
					(n === 0 || (n === 1 && !poke.baitShields)) &&
					opponent.hp > poke.fastMove.damage
				) {
					return chargedAction(battle, poke, moveIndex);
				}
			}
		}
	}

	// Against Mimikyu's Disguise (or similar), break it with the fastest Charged Move ASAP
	if (opponent.formChange?.effect === 'protect' && opponent.shields === 0) {
		if (poke.energy >= poke.fastestChargedMove.energy && !poke.fastestChargedMove.selfDebuffing) {
			return chargedAction(battle, poke, poke.chargedMoves.indexOf(poke.fastestChargedMove));
		}
	}

	// Optimise move timing to reduce free turns for the opponent
	if (poke.optimizeMoveTiming) {
		let targetCooldown = 500;

		if (poke.fastMove.cooldown >= 2000) targetCooldown = 1000;
		if (poke.fastMove.cooldown >= 1500 && opponent.fastMove.cooldown === 2500) targetCooldown = 1000;
		if (poke.fastMove.cooldown === 1000 && opponent.fastMove.cooldown === 2000) targetCooldown = 1000;

		// Same duration
		if (poke.fastMove.cooldown === opponent.fastMove.cooldown) targetCooldown = 0;

		// Longer, evenly divisible duration (4 vs 2, 3 vs 1)
		if (
			poke.fastMove.cooldown % opponent.fastMove.cooldown === 0 &&
			poke.fastMove.cooldown > opponent.fastMove.cooldown
		) {
			targetCooldown = 0;
		}

		if ((opponent.cooldown === 0 || opponent.cooldown > targetCooldown) && targetCooldown > 0) {
			let optimizeTiming = true;

			// About to faint from a Fast Move
			if (poke.hp <= opponent.fastMove.damage) optimizeTiming = false;

			// Would go over 100 energy
			let queuedFastMoves = 0;
			for (const queued of battle.getQueuedActions()) {
				if (queued.actor === poke.index && queued.type === 'fast') queuedFastMoves++;
			}
			queuedFastMoves++;
			if (poke.energy + poke.fastMove.energyGain * queuedFastMoves > 100) optimizeTiming = false;

			// Fewer turns to live than Charged Moves we could throw
			let turnsPlanned = poke.fastMove.turns + Math.floor(poke.energy / poke.activeChargedMoves[0].energy);
			if (poke.stats.atk < opponent.stats.atk) turnsPlanned++;
			if (turnsPlanned > turnsToLive) optimizeTiming = false;

			// We can KO with a Charged Move
			if (opponent.shields === 0) {
				for (const move of poke.activeChargedMoves) {
					move.damage = calculateDamage(poke, opponent, move);
					if (poke.energy >= move.energy && move.damage >= opponent.hp) {
						optimizeTiming = false;
						break;
					}
				}
			}

			// The opponent can KO with a Charged Move
			for (const move of opponent.activeChargedMoves) {
				const fastMovesFromCharged = Math.ceil((move.energy - opponent.energy) / opponent.fastMove.energyGain);
				const fastMovesInFastMove = Math.floor(poke.fastMove.cooldown / opponent.fastMove.cooldown);
				const turnsFromMove = fastMovesFromCharged * opponent.fastMove.turns + 1;

				move.damage = calculateDamage(opponent, poke, move);

				let moveDamage = move.damage + opponent.fastMove.damage * fastMovesInFastMove;
				if (poke.shields > 0) moveDamage = 1 + opponent.fastMove.damage * fastMovesInFastMove;

				if (turnsFromMove <= poke.fastMove.turns && moveDamage >= poke.hp) {
					optimizeTiming = false;
					break;
				}
			}

			// The opponent can KO with the Fast Moves it fits into ours
			const fastMovesInFastMove = Math.floor((poke.fastMove.cooldown + 500) / opponent.fastMove.cooldown);
			if (poke.hp <= opponent.fastMove.damage * fastMovesInFastMove) optimizeTiming = false;

			if (optimizeTiming) return undefined;
		}
	}

	// Cramorant that hasn't changed form: fire Dive or Surf ASAP unless another move is meaningfully better
	if (poke.activeFormId === 'cramorant') {
		const gulpMove = poke.activeChargedMoves.find((m) => m.moveId === 'DIVE' || m.moveId === 'SURF');
		// (Upstream's `moveID` typo makes this simply "first move that isn't Dive".)
		const nonGulpMove = poke.activeChargedMoves.find((m) => m.moveId !== 'DIVE');

		if (
			gulpMove &&
			nonGulpMove &&
			poke.energy >= gulpMove.energy &&
			opponent.hp > nonGulpMove.damage * 1.3 &&
			nonGulpMove.dpe / gulpMove.dpe < 1.5
		) {
			return chargedAction(battle, poke, poke.chargedMoves.indexOf(gulpMove));
		}
	}

	// If the opponent can't be fainted within a couple of cycles, do a simpler move selection.
	const best = poke.bestChargedMove!;
	const bestChargedDamage = calculateDamage(poke, opponent, best);
	const bestCycleDamage = bestChargedDamage + fastDamage * Math.ceil(best.energy / poke.fastMove.energyGain);
	let minimumCycleThreshold = 2;

	// Prefer non-debuffing moves when it will take multiple to KO
	if (
		best.selfDebuffing &&
		best.energy > poke.fastestChargedMove.energy &&
		best.dpe / poke.fastestChargedMove.dpe < 2
	) {
		minimumCycleThreshold = 1.1;
	}

	if (opponent.hp / bestCycleDamage > minimumCycleThreshold) {
		let selectedMove = best;

		if (poke.activeChargedMoves.length > 1) {
			for (const candidate of poke.activeChargedMoves) {
				if (best.selfDebuffing && !candidate.selfDebuffing && selectedMove.dpe / candidate.dpe < 2) {
					selectedMove = candidate;
				}

				if (
					poke.baitShields &&
					opponent.shields > 0 &&
					!poke.activeChargedMoves[0].selfDebuffing &&
					wouldShield(battle, poke, opponent, candidate).value
				) {
					selectedMove = poke.activeChargedMoves[0];
				}
			}
		}

		if (poke.energy < selectedMove.energy) return undefined;

		// Stack self-debuffing moves
		if (selectedMove.selfDebuffing) {
			const energyToReach =
				poke.energy + Math.floor((100 - poke.energy) / poke.fastMove.energyGain) * poke.fastMove.energyGain;
			if (poke.energy < energyToReach) return undefined;
		}

		return chargedAction(battle, poke, poke.chargedMoves.indexOf(selectedMove));
	}

	// Calculate the most efficient way to defeat the opponent
	// ELEMENTS OF DP QUEUE: ENERGY, OPPONENT HEALTH, TURNS, OPPONENT SHIELDS, USED MOVES, ATTACK BUFF, CHANCE
	let stateCount = 0;
	const DPQueue: Array<BattleState> = [new BattleState(poke.energy, opponent.hp, 0, opponent.shields, [], 0, 1)];
	const stateList: Array<BattleState> = [];

	/** Inserts `state` before the first queue entry whose turn is past `turn` (or, when `strict`, not before it). */
	const insertByTurn = (state: BattleState, turn: number, strict: boolean) => {
		if (DPQueue.length === 0) {
			DPQueue.push(state);
			return;
		}
		let i = 0;
		while (strict ? DPQueue[i].turn < turn : DPQueue[i].turn <= turn) {
			i++;
			if (i === DPQueue.length) break;
		}
		DPQueue.splice(i, 0, state);
	};

	const debuffScore = (moves: ReadonlyArray<SimMove>) => {
		let score = 0;
		for (const move of moves) {
			if (move.selfDebuffing) score++;
			if (move.buffApplyChance === 1 && move.buffTarget === 'self' && move.buffs && move.buffs[0] + move.buffs[1] > 0) {
				score--;
			}
		}
		return score;
	};

	while (DPQueue.length !== 0) {
		// Guard against runaway planning
		if (stateCount >= 500) return undefined;
		stateCount++;

		const currState = DPQueue.shift()!;
		const DPchargedMoveReady: Array<number> = [];

		// Buffs are capped at ±4
		currState.buffs = Math.min(4, currState.buffs);
		currState.buffs = Math.max(-4, currState.buffs);

		// Found the fastest way to defeat the enemy
		if (currState.oppHealth <= 0) {
			stateList.push(currState);
			if (currState.chance === 1) break;
			continue;
		}

		for (const move of poke.activeChargedMoves) {
			if (currState.energy >= move.energy) {
				DPchargedMoveReady.push(0);
			} else {
				DPchargedMoveReady.push(
					Math.ceil((move.energy - currState.energy) / poke.fastMove.energyGain) * poke.fastMove.turns
				);
			}
		}

		for (let n = 0; n < poke.activeChargedMoves.length; n++) {
			const move = poke.activeChargedMoves[n];

			// Apply the state's attack buffs to our Attack while pricing moves
			const currentStatBuffs: [number, number] = [poke.statBuffs[0], poke.statBuffs[1]];
			poke.applyStatBuffs([currState.buffs, 0]);

			const moveDamage = calculateDamage(poke, opponent, move);
			const fastSimulatedDamage = calculateDamage(poke, opponent, poke.fastMove);

			poke.statBuffs = [currentStatBuffs[0], currentStatBuffs[1]];

			// Skip self defense-debuffing moves that aren't lethal ("Melmetal vs Cresselia is a nightmare")
			if (hasNonDebuff && poke.speciesId === 'melmetal' && opponent.speciesId === 'cresselia') {
				if (move.selfDebuffing && move.buffs![1] < 1 && opponent.hp > moveDamage * (1 + 4 / (4 - move.buffs![0]))) {
					continue;
				}
			}

			// The result of farming down from here
			const movesToFarmDown = Math.ceil(currState.oppHealth / fastSimulatedDamage);
			insertByTurn(
				new BattleState(
					currState.energy + poke.fastMove.energyGain * movesToFarmDown,
					0,
					currState.turn + movesToFarmDown * poke.fastMove.turns,
					currState.oppShields,
					currState.moves,
					currState.buffs,
					currState.chance
				),
				currState.turn + movesToFarmDown * poke.fastMove.turns,
				false
			);

			// Attack multiplier after this move
			let attackMult = currState.buffs;

			if (move.buffApplyChance && move.buffTarget === 'self' && move.buffApplyChance === 1) {
				attackMult += move.buffs![0];
			}
			if (move.buffApplyChance && move.buffTarget === 'opponent' && move.buffApplyChance === 1) {
				attackMult -= move.buffs![1];
			}
			// (Upstream deliberately disables evaluating non-guaranteed buffs: `changeTTKChance` is forced to 0.)

			if (DPchargedMoveReady[n] === 0) {
				// If shielded, 1 damage; otherwise move damage
				let newOppHealth = currState.oppHealth - moveDamage;
				if (currState.oppShields > 0) newOppHealth = currState.oppHealth - 1;

				let newShields = currState.oppShields;
				if (newShields > 0) newShields--;

				// Drop states that are strictly worse than this one, noting any that are better
				let i = 0;
				let insertElement = true;
				while (i < DPQueue.length && DPQueue[i].turn === currState.turn + 1) {
					if (DPQueue[i].oppHealth === newOppHealth && DPQueue[i].buffs === attackMult) {
						if (DPQueue[i].energy === currState.energy - move.energy) {
							// Same energy, same health: keep the path with fewer debuffs / more buff chances.
							const DPDebuffs = debuffScore(DPQueue[i].moves);
							const currDebuffs = debuffScore(currState.moves.concat([move]));

							if (DPDebuffs > currDebuffs) {
								DPQueue.splice(i, 1);
							} else {
								insertElement = false;
								i++;
							}
						} else {
							insertElement = false;
							i++;
						}
					} else {
						i++;
					}
				}

				if (insertElement) {
					insertByTurn(
						new BattleState(
							currState.energy - move.energy,
							newOppHealth,
							currState.turn + 1,
							newShields,
							currState.moves.concat([move]),
							attackMult,
							currState.chance
						),
						currState.turn + 1,
						false
					);
				}

				// A self attack-debuffing move: also price stacking two before throwing
				if (move.selfDebuffing && move.buffs![0] < 0 && move.energy * 2 <= 100) {
					let newTurn =
						Math.ceil((move.energy * 2 - currState.energy) / poke.fastMove.energyGain) * poke.fastMove.turns;
					const newEnergy =
						Math.floor(newTurn / poke.fastMove.turns) * poke.fastMove.energyGain + currState.energy - move.energy;

					if (newTurn !== 0) {
						let stackedHealth = currState.oppHealth - fastSimulatedDamage * (newTurn / poke.fastMove.turns);
						stackedHealth = currState.oppShields > 0 ? stackedHealth - 1 : stackedHealth - moveDamage;

						newTurn += currState.turn + 1;

						insertByTurn(
							new BattleState(
								newEnergy,
								stackedHealth,
								newTurn,
								newShields,
								currState.moves.concat([move]),
								attackMult,
								currState.chance
							),
							newTurn,
							false
						);
					}
				}
			} else {
				const newEnergy =
					currState.energy - move.energy + poke.fastMove.energyGain * (DPchargedMoveReady[n] / poke.fastMove.turns);
				let newOppHealth =
					currState.oppHealth - moveDamage - fastSimulatedDamage * (DPchargedMoveReady[n] / poke.fastMove.turns);

				// If shields are up, only the Fast Move damage lands
				if (currState.oppShields > 0) {
					newOppHealth = currState.oppHealth - fastSimulatedDamage * (DPchargedMoveReady[n] / poke.fastMove.turns) - 1;
				}
				const newTurn = currState.turn + DPchargedMoveReady[n] + 1;
				let newShields = currState.oppShields;
				if (newShields > 0) newShields--;

				insertByTurn(
					new BattleState(
						newEnergy,
						newOppHealth,
						newTurn,
						newShields,
						currState.moves.concat([move]),
						attackMult,
						currState.chance
					),
					newTurn,
					true
				);

				if (move.selfDebuffing && move.buffs![0] < 0 && move.energy * 2 <= 100) {
					let stackedTurn =
						Math.ceil((move.energy * 2 - currState.energy) / poke.fastMove.energyGain) * poke.fastMove.turns;
					const stackedEnergy =
						Math.floor(stackedTurn / poke.fastMove.turns) * poke.fastMove.energyGain + currState.energy - move.energy;

					let stackedHealth = currState.oppHealth - fastSimulatedDamage * (stackedTurn / poke.fastMove.turns);
					stackedHealth = currState.oppShields > 0 ? stackedHealth - 1 : stackedHealth - moveDamage;

					stackedTurn += currState.turn + 1;

					insertByTurn(
						new BattleState(
							stackedEnergy,
							stackedHealth,
							stackedTurn,
							newShields,
							currState.moves.concat([move]),
							attackMult,
							currState.chance
						),
						stackedTurn,
						true
					);
				}
			}
		}
	}

	// Evaluate the throwing strategy after finding the optimal plan
	if (stateList.length === 0) return undefined;

	poke.turnsToKO = turns + stateList[stateList.length - 1].turn;

	// A single plan, the "least risky" fallback and the default all resolve to the same state
	// here, since the planner only ever records guaranteed (chance 1) plans.
	const finalState =
		stateList.length === 1 || (opponent.turnsToKO !== -1 && poke.turnsToKO > opponent.turnsToKO)
			? stateList[0]
			: stateList[stateList.length - 1];

	// The plan is to farm down
	if (finalState.moves.length === 0) {
		const boost = poke.getBoostMove();
		if (!boost) return undefined;
		finalState.moves.push(boost);
	}

	// Any debuffing moves, and the most expensive planned move
	let debuffingMove = false;
	let mostExpensiveMove = finalState.moves[0];
	for (const move of finalState.moves) {
		if (move.selfDebuffing) debuffingMove = true;
		if (move.energy > mostExpensiveMove.energy) mostExpensiveMove = move;
	}
	void mostExpensiveMove;

	const active = poke.activeChargedMoves;
	const planned = () => finalState.moves[0];

	// Baiting: build up to the more efficient, more expensive move
	if (poke.baitShields && opponent.shields > 0 && active.length > 1) {
		for (let i = 1; i < active.length; i++) {
			if (poke.energy < active[i].energy && active[i].dpe > planned().dpe) {
				let bait = true;

				// Not with an effective self-buffing move
				if (active[i].dpe / active[0].dpe <= 1.5 && active[0].selfBuffing) bait = false;

				if (bait) return undefined;
			}
		}
	}

	// Don't bait if the opponent won't shield
	if (poke.baitShields && opponent.shields > 0 && active.length > 1) {
		for (let i = 1; i < active.length; i++) {
			const dpeRatio = active[i].damage / active[i].energy / (planned().damage / planned().energy);

			if (poke.energy >= active[i].energy && dpeRatio > 1.5) {
				if (!wouldShield(battle, poke, opponent, active[i]).value) finalState.moves[0] = active[i];
			}
		}
	}

	// Throw the most damaging move first when not baiting, or when shields are down and nothing debuffs
	if (!poke.baitShields || (opponent.shields === 0 && !debuffingMove)) {
		finalState.moves.sort((a, b) => calculateDamage(poke, opponent, b) - calculateDamage(poke, opponent, a));
	}

	// Shields up: prefer the low-energy, more efficient move
	if (
		opponent.shields > 0 &&
		active.length > 1 &&
		active[0].energy <= planned().energy &&
		active[0].dpe > planned().dpe &&
		!active[0].selfDebuffing
	) {
		finalState.moves[0] = active[0];
	}

	// Shields down: prefer non-debuffing moves if both sides have significant HP left
	if (
		opponent.shields === 0 &&
		active.length > 1 &&
		planned().selfDebuffing &&
		planned().energy > 50 &&
		poke.hp / poke.stats.hp > 0.5 &&
		planned().damage / opponent.hp < 0.8
	) {
		finalState.moves[0] = active[0];
	}

	// Bandaids: force a more efficient move of the same / similar energy
	if (
		active.length > 1 &&
		active[0].energy === planned().energy &&
		active[0].dpe > planned().dpe &&
		!active[0].selfDebuffing
	) {
		finalState.moves[0] = active[0];
	}

	if (
		active.length > 1 &&
		active[0].energy - 10 <= planned().energy &&
		active[0].dpe > planned().dpe &&
		planned().selfDebuffing &&
		!active[0].selfDebuffing
	) {
		finalState.moves[0] = active[0];
	}

	if (
		active.length > 1 &&
		active[0].energy - planned().energy <= 5 &&
		active[0].dpe > planned().dpe &&
		active[0].selfBuffing
	) {
		finalState.moves[0] = active[0];
	}

	// Don't bait with self-debuffing moves
	if (poke.baitShields && opponent.shields > 0 && active.length > 1) {
		for (let i = 1; i < active.length; i++) {
			if (poke.energy >= active[i].energy && active[i].dpe > planned().dpe) {
				if (planned().selfDebuffing && !active[i].selfDebuffing) finalState.moves[0] = active[i];
			}
		}
	}

	// Shields down: skip self-debuffing moves that are significantly less efficient
	if (opponent.shields === 0 && active.length > 1 && planned().selfDebuffing) {
		for (let i = 1; i < active.length; i++) {
			if (active[i].dpe > planned().dpe && !active[i].selfDebuffing) finalState.moves[0] = active[i];
		}
	}

	// Shields up: prefer a close non-debuffing move where the debuffing one won't KO
	if (opponent.shields > 0 && active.length > 1) {
		for (let i = 1; i < active.length; i++) {
			if (active[0].selfDebuffing && !active[i].selfDebuffing) {
				if (poke.baitShields || opponent.hp - active[0].damage > 10) {
					if (active[i].energy - active[0].energy <= 10 && active[i].dpe / active[0].dpe > 0.7) {
						finalState.moves[0] = active[i];
					}
				}
			}
		}
	}

	// Defer self-debuffing moves until after survivable Charged Moves
	if (planned().selfDebuffing && poke.shields === 0 && poke.energy < 100 && opponent.bestChargedMove) {
		if (
			opponent.energy >= opponent.bestChargedMove.energy &&
			!wouldShield(battle, opponent, poke, opponent.bestChargedMove).value &&
			!active[0].selfBuffing
		) {
			return undefined;
		}
	}

	// A self-debuffing move that doesn't KO: try to stack as many as possible
	if (
		planned().selfDebuffing ||
		opponent.activeFormId === 'cramorant_gulping' ||
		opponent.activeFormId === 'cramorant_gorging'
	) {
		const targetEnergy = Math.floor(100 / planned().energy) * planned().energy;

		if (poke.energy < targetEnergy) {
			const moveDamage = calculateDamage(poke, opponent, planned());
			if (
				(opponent.hp > moveDamage || opponent.shields !== 0) &&
				(poke.hp > opponent.fastMove.damage * 2 || opponent.fastMove.cooldown - poke.fastMove.cooldown > 500)
			) {
				return undefined;
			}
		} else if (
			poke.baitShields &&
			opponent.shields > 0 &&
			active[0].energy - planned().energy <= 10 &&
			!active[0].selfDebuffing
		) {
			// Use the lower-energy move if it boosts, or if the opponent would shield the bigger one
			if (active[0].selfBuffing || wouldShield(battle, poke, opponent, planned()).value) {
				finalState.moves[0] = active[0];
			}
		}
	}

	// Use the final move, or a Fast Move if there isn't the energy
	if (poke.energy < planned().energy) return undefined;

	// Aegislash (Shield) builds energy to spend fewer turns in Blade form
	if (poke.activeFormId === 'aegislash_shield' && poke.energy < 100 - poke.fastMove.energyGain / 2) {
		if (poke.bestChargedMove!.damage < opponent.hp) return undefined;
	}

	return chargedAction(battle, poke, poke.chargedMoves.indexOf(planned()));
};

export interface ShieldDecision {
	value: boolean;
}

/** Would `defender` shield `attacker`'s `move`? PvPoke's `ActionLogic.wouldShield`, simulate-mode. */
export const wouldShield = (
	_battle: ActionLogicBattle,
	attacker: SimPokemon,
	defender: SimPokemon,
	move: SimMove
): ShieldDecision => {
	let useShield = false;
	const damage = calculateDamage(attacker, defender, move);
	move.damage = damage;

	const postMoveHP = defender.hp - damage;
	const moveBuffs: [number, number] = move.buffs ?? [0, 0];
	let currentBuffs: [number, number];

	// Temporarily apply the move's stat changes to whoever they'd land on
	if (moveBuffs[0] > 0) {
		currentBuffs = [attacker.statBuffs[0], attacker.statBuffs[1]];
		attacker.applyStatBuffs(moveBuffs);
	} else {
		currentBuffs = [defender.statBuffs[0], defender.statBuffs[1]];
		defender.applyStatBuffs(moveBuffs);
	}

	const fastDamage = calculateDamage(attacker, defender, attacker.fastMove);

	// How much damage a cycle deals, to see whether the defender survives to shield the next one
	const fastAttacks =
		Math.ceil((move.energy - Math.max(attacker.energy - move.energy, 0)) / attacker.fastMove.energyGain) + 1;
	const fastAttackDamage = fastAttacks * fastDamage;
	const cycleDamage = (fastAttackDamage + 1) * defender.shields;

	if (postMoveHP <= cycleDamage) useShield = true;

	// Reset buffs to original
	if (moveBuffs[0] > 0) attacker.statBuffs = [currentBuffs[0], currentBuffs[1]];
	else defender.statBuffs = [currentBuffs[0], currentBuffs[1]];

	// If the defender can't afford to let a Charged Move connect, block
	const fastDPT = fastDamage / attacker.fastMove.turns;

	for (const chargedMove of attacker.chargedMoves) {
		// (Upstream's `energy + cost >= cost` is always true — the check exists but never filters.)
		const chargedDamage = calculateDamage(attacker, defender, chargedMove);

		if (chargedDamage >= defender.hp / 1.4 && fastDPT > 1.5) useShield = true;
		if (chargedDamage >= defender.hp - cycleDamage) useShield = true;
	}

	// Shield the first in a series of attack-debuffing moves like Superpower, if they'd do major damage
	if (move.selfAttackDebuffing && move.damage / defender.hp > 0.55) useShield = true;

	// A Pokémon set to always bait: always "would shield"
	if (attacker.baitShields === 2) useShield = true;

	// Save shields in Aegislash Shield form to protect Blade form
	if (defender.activeFormId === 'aegislash_shield' && move.damage * 2 < defender.hp) useShield = false;

	// Save shields in Cramorant's gulping/gorging form to trigger Gulp Missile earlier against weak moves
	if (
		(defender.activeFormId === 'cramorant_gulping' || defender.activeFormId === 'cramorant_gorging') &&
		move.damage * 2.2 < defender.hp
	) {
		useShield = false;
	}

	// Don't shield early Cramorant Dives or Surfs to save for later attacks
	if (attacker.speciesId === 'cramorant' && move.damage && move.damage / defender.hp < 0.33) useShield = false;

	if (
		attacker.speciesId === 'cramorant' &&
		(move.moveId === 'DIVE' || move.moveId === 'SURF') &&
		move.damage > defender.hp
	) {
		// Upstream: `move.moveID` typo — only the DIVE half can ever be true.
		if (move.moveId === 'DIVE') useShield = false;
	}

	return { value: useShield };
};

import { type ActionLogicBattle, decideAction, wouldShield } from './action-logic';
import { calculateDamage } from './damage';
import type { BattleLink, SimPokemon } from './pokemon';
import { type BattleAction, createAction, hasMoveTag, type SimMove } from './types';

const DELTA_TIME = 500;
const CHARGED_MINIGAME_TIME = 10000;
/** A battle that hasn't ended after this long (ms of simulated time) is called off. */
const MAX_BATTLE_TIME = 240000;

/**
 * PvPoke's `Battle`, simulate-mode only: a deterministic, turn-by-turn 1v1
 * between two Pokémon, each driven by the decision AI in `action-logic.ts`.
 * No emulator, no players, no timeline — just the mechanics that decide who
 * wins and by how much.
 */
export class SimBattle implements BattleLink, ActionLogicBattle {
	private pokemon: [SimPokemon | null, SimPokemon | null] = [null, null];
	private turns = 1;
	private lastProcessedTurn = 0;
	private time = 0;
	private usePriority = false;
	private turnActions: Array<BattleAction> = [];
	private queuedActions: Array<BattleAction> = [];
	private previousTurnActions: Array<BattleAction> = [];
	private actionIndex = 0;
	private roundChargedMoveUsed = 0;
	private roundShieldUsed = false;

	getOpponent(index: number): SimPokemon | null {
		return index === 0 ? this.pokemon[1] : this.pokemon[0];
	}

	getTurns(): number {
		return this.turns;
	}

	getQueuedActions(): ReadonlyArray<BattleAction> {
		return this.queuedActions;
	}

	/** Places a Pokémon in slot 0 or 1 and puts it back to its pre-battle state. */
	setNewPokemon(poke: SimPokemon, index: 0 | 1) {
		poke.setBattle(this);
		poke.reset();
		poke.index = index;
		this.pokemon[index] = poke;
	}

	/** Detaches both Pokémon so later battles don't inherit this one's opponents. */
	clearPokemon() {
		this.pokemon = [null, null];
	}

	/** Runs the battle to a faint (or the time limit). Read the outcome off each Pokémon's HP / `getBattleRating()`. */
	simulate() {
		const [first, second] = this.pokemon as [SimPokemon, SimPokemon];
		this.start(first, second);

		let continueBattle = true;
		while (continueBattle) {
			this.step(first, second);
			continueBattle = first.hp > 0 && second.hp > 0;
			if (this.time > MAX_BATTLE_TIME) continueBattle = false;
		}
	}

	private start(first: SimPokemon, second: SimPokemon) {
		first.reset();
		second.reset();

		// Charged Move priority only matters when Attack differs (or Cramorant mirrors itself).
		this.usePriority =
			first.stats.atk !== second.stats.atk || (first.speciesId === 'cramorant' && second.speciesId === 'cramorant');

		this.previousTurnActions = [];
		this.time = 0;
		this.turns = 1;
		this.lastProcessedTurn = 0;
		this.queuedActions = [];
		this.turnActions = [];
	}

	private step(first: SimPokemon, second: SimPokemon) {
		const both = [first, second];

		this.roundChargedMoveUsed = 0;
		this.roundShieldUsed = false;

		if (this.turns > this.lastProcessedTurn) this.turnActions = [];

		for (const poke of both) {
			poke.cooldown = Math.max(0, poke.cooldown - DELTA_TIME);
			poke.chargedMovesOnly = false;
			if (this.turns > this.lastProcessedTurn) poke.hasActed = false;
		}

		let chargedMoveLastTurn = this.previousTurnActions.find((a) => a.type === 'charged');
		const cooldownsToSet = [first.cooldown, second.cooldown];

		if (this.turns > this.lastProcessedTurn) {
			for (let i = 0; i < 2; i++) {
				const poke = both[i];
				const opponent = both[1 - i];
				const action = this.getTurnAction(poke, opponent);
				if (!action) continue;

				// Only 0-turn switches are allowed after a Charged Attack sequence
				if (chargedMoveLastTurn && action.type !== 'switch') continue;

				if (poke.hp > 0 && opponent.hp > 0) {
					let valid = true;

					if (action.type === 'fast') {
						if (poke.chargedMovesOnly) valid = false;
						if (valid) cooldownsToSet[i] += poke.fastMove.cooldown;
					}
					if (action.type === 'charged' && valid) cooldownsToSet[i] += 500;
					if (valid) this.queuedActions.push(action);
				}
			}
		}

		// Cooldowns are set after decision-making, because decisions read them.
		first.cooldown = cooldownsToSet[0];
		second.cooldown = cooldownsToSet[1];

		chargedMoveLastTurn = this.previousTurnActions.find((a) => a.type === 'charged');

		// Take the queued actions that are due this turn
		for (let i = 0; i < this.queuedActions.length; i++) {
			const action = this.queuedActions[i];
			let valid = false;

			if (action.type === 'fast' || action.type === 'charged') {
				const timeSinceActivated = (this.turns - action.turn) * 500;
				const requiredTimeToPass = action.type === 'fast' ? both[action.actor].fastMove.cooldown - 500 : 0;

				if (
					timeSinceActivated >= requiredTimeToPass ||
					(action.type === 'fast' && chargedMoveLastTurn && action.turn < this.turns)
				) {
					valid = true;
				}
			}

			if (valid) {
				this.turnActions.push(action);
				this.queuedActions.splice(i, 1);
				i--;
			}
		}

		// Highest priority first (Array.sort is stable, matching upstream)
		this.turnActions.sort((a, b) => b.settings.priority - a.settings.priority);

		this.actionIndex = 0;
		while (this.actionIndex < this.turnActions.length) {
			const action = this.turnActions[this.actionIndex++];
			const poke = both[action.actor];
			const opponent = both[1 - action.actor];

			switch (action.type) {
				case 'fast':
					action.valid = true;
					if (opponent.hp < 1) action.valid = false;
					if (poke.hp < 1 && poke.faintSource === 'charged') action.valid = false;
					break;

				case 'charged': {
					const move = this.resolveChargedMove(poke, action);
					if (move && poke.energy >= move.energy) action.valid = true;

					// Knocked out by a priority move
					if (
						move &&
						this.usePriority &&
						poke.hp <= 0 &&
						poke.faintSource === 'charged' &&
						!hasMoveTag(move, 'ignoresFaint')
					) {
						action.valid = false;
					}
					break;
				}

				case 'wait':
					action.valid = true;
					break;

				default:
					break;
			}

			this.processAction(action, poke, opponent);
		}

		this.previousTurnActions = this.turnActions;
		this.turnActions = [];

		if (this.roundChargedMoveUsed === 0) {
			this.time += DELTA_TIME;
		} else if (this.roundShieldUsed) {
			this.time += CHARGED_MINIGAME_TIME * (this.roundChargedMoveUsed - 1);
		} else {
			this.time += CHARGED_MINIGAME_TIME;
		}

		this.lastProcessedTurn = this.turns;
		this.turns++;

		// A charged sequence leaves both Pokémon on a 500ms cooldown
		if (this.roundChargedMoveUsed) {
			for (const poke of both) poke.cooldown = 500;
		}
	}

	private resolveChargedMove(poke: SimPokemon, action: BattleAction): SimMove | undefined {
		return typeof action.value === 'number' ? poke.chargedMoves[action.value] : poke.getExtraChargedMove(action.value);
	}

	/** What a Pokémon does this turn: the AI's Charged Move, otherwise a Fast Move. */
	private getTurnAction(poke: SimPokemon, opponent: SimPokemon): BattleAction | null {
		if (poke.cooldown !== 0 || poke.hasActed) return null;

		poke.hasActed = true;

		const action = decideAction(this, poke, opponent) ?? createAction('fast', poke.index, this.turns, 0, poke.priority);

		if (action.type === 'charged') {
			action.settings.priority += 10;
			// Higher Attack wins charged-move priority
			if (poke.stats.atk > opponent.stats.atk) action.settings.priority++;
		}

		return action;
	}

	private processAction(action: BattleAction, poke: SimPokemon, opponent: SimPokemon) {
		if (!action.valid || action.processed) return;
		action.processed = true;

		switch (action.type) {
			case 'fast':
				this.useMove(poke, opponent, poke.fastMove);
				break;

			case 'charged': {
				const move = this.resolveChargedMove(poke, action);
				if (move && poke.energy >= move.energy) {
					this.useMove(poke, opponent, move);
					this.roundChargedMoveUsed++;
				}
				break;
			}

			default:
				break;
		}
	}

	/** Applies a move: damage (through a shield, if the defender uses one), energy, stat changes and form changes. */
	private useMove(attacker: SimPokemon, defender: SimPokemon, move: SimMove) {
		let defenderUsedShield = false;

		// Pre-attack form change (Aegislash Shield -> Blade when it attacks)
		if (
			attacker.formChange &&
			attacker.formChange.trigger === 'activate_charged' &&
			attacker.activeFormId !== attacker.formChange.alternativeFormId &&
			move.category === 'charged' &&
			(attacker.formChange.moveId === 'ANY' || attacker.formChange.moveId === move.moveId)
		) {
			attacker.changeForm(attacker.formChange.alternativeFormId!);
		}

		let damage = calculateDamage(attacker, defender, move);
		move.damage = damage;

		if (move.category === 'charged') {
			attacker.energy -= move.energy;

			const chargedMoveTime = hasMoveTag(move, 'instant') ? 3000 : CHARGED_MINIGAME_TIME;

			if (this.usePriority && this.roundChargedMoveUsed > 0 && !this.roundShieldUsed) {
				this.time += chargedMoveTime;
			}

			const canShield = defender.shields > 0 && !hasMoveTag(move, 'instant');

			if (canShield) {
				let useShield = true;
				const shieldDecision = wouldShield(this, attacker, defender, move);

				// Don't shield early Power-Up Punches, Acid Sprays or similar
				if (move.buffs && move.selfBuffing) {
					if (
						(move.buffTarget === 'self' && move.buffs[0] > 0) ||
						(move.buffTarget === 'opponent' && move.buffs[1] < 0)
					) {
						useShield = shieldDecision.value;
					}

					// Moves with multiple targets
					if (
						move.buffTarget === 'both' &&
						((move.buffsSelf && move.buffsSelf[0] > 0) || (move.buffsOpponent && move.buffsOpponent[1] < 0))
					) {
						useShield = shieldDecision.value;
					}
				}

				// Don't shield early moves if the user has a defense-debuffing move
				if (defender.bestChargedMove?.selfDefenseDebuffing) {
					if (attacker.shields > 0) {
						useShield = shieldDecision.value;
					} else if (attacker.bestChargedMove) {
						// With no attacker shields: shield this if the defender's next move KOs the attacker
						const fastToNextCharged = Math.ceil(
							(defender.bestChargedMove.energy - defender.energy) / defender.fastMove.energyGain
						);
						const turnsToNextCharged = fastToNextCharged * defender.fastMove.turns;
						const cycleDamage = fastToNextCharged * defender.fastMove.damage + defender.bestChargedMove.damage;

						let attackerTurnsToNextCharged =
							Math.ceil((attacker.activeChargedMoves[0].energy - attacker.energy) / attacker.fastMove.energyGain) *
							attacker.fastMove.turns;

						if (attacker.stats.atk > defender.stats.atk) attackerTurnsToNextCharged--;

						if (turnsToNextCharged >= attackerTurnsToNextCharged && attacker.hp <= cycleDamage) {
							useShield = shieldDecision.value;
						}
					}
				}

				// Save shields in Aegislash Shield form to protect Blade form
				if (defender.activeFormId === 'aegislash_shield' && damage * 2 < defender.hp) {
					useShield = shieldDecision.value;
				}

				// Save shields in Cramorant's gulping/gorging form to trigger Gulp Missile earlier against weak moves
				if (
					(defender.activeFormId === 'cramorant_gulping' || defender.activeFormId === 'cramorant_gorging') &&
					damage * 2.2 < defender.hp
				) {
					useShield = shieldDecision.value;
				}

				// Don't shield early Cramorant Dives or Surfs
				if (attacker.speciesId === 'cramorant' && damage / defender.hp < 0.33) {
					useShield = shieldDecision.value;
				}

				if (useShield) {
					damage = 1;
					defender.shields--;
					this.roundShieldUsed = true;
					defenderUsedShield = true;

					if (
						defender.formChange &&
						defender.formChange.trigger === 'activate_shield' &&
						defender.activeFormId !== defender.formChange.alternativeFormId
					) {
						defender.changeForm(defender.formChange.alternativeFormId!);
					}

					if (this.roundChargedMoveUsed === 0) this.time += CHARGED_MINIGAME_TIME;
				}
			}

			// Mimikyu's Disguise works like a free shield
			if (
				defender.formChange &&
				defender.formChange.trigger === 'charged_move_damage' &&
				defender.formChange.effect === 'protect' &&
				!defenderUsedShield &&
				!hasMoveTag(move, 'instant')
			) {
				damage = 1;
				this.roundShieldUsed = true;

				if (this.roundChargedMoveUsed === 0) this.time += CHARGED_MINIGAME_TIME;
			}
		} else if (move.category === 'fast') {
			let energyGain = attacker.fastMove.energyGain;

			// Hard-coded for Aegislash's custom moves
			if (attacker.activeFormId === 'aegislash_shield') energyGain = 6;

			attacker.energy = Math.min(attacker.energy + energyGain, 100);
		}

		if (attacker.activeFormId === 'aegislash_shield' && move.energyGain > 0) damage = 1;

		defender.hp = Math.max(0, defender.hp - damage);

		this.applyMoveBuffs(attacker, defender, move);

		// Post-attack form changes
		const formChange = attacker.formChange;
		if (
			formChange &&
			formChange.trigger === 'charged_move' &&
			move.category === 'charged' &&
			(formChange.moveId === 'ANY' || formChange.moveId === move.moveId || formChange.moveIDs?.includes(move.moveId))
		) {
			let newFormId = formChange.alternativeFormId!;

			if (newFormId === 'variable' && attacker.speciesId === 'cramorant') {
				newFormId = attacker.hp / attacker.stats.hp > 0.5 ? 'cramorant_gulping' : 'cramorant_gorging';
			}

			if (attacker.activeFormId !== newFormId) attacker.changeForm(newFormId);
		}

		// Cramorant's Gulp Missile fires back the moment it's hit by a Charged Move it didn't shield
		if (
			(defender.activeFormId === 'cramorant_gulping' || defender.activeFormId === 'cramorant_gorging') &&
			move.category === 'charged' &&
			!defenderUsedShield &&
			!hasMoveTag(move, 'instant')
		) {
			const gulp = defender.activeFormId === 'cramorant_gulping' ? 'GULP_MISSILE_ARROKUDA' : 'GULP_MISSILE_PIKACHU';
			this.turnActions.splice(
				this.actionIndex,
				0,
				createAction('charged', defender.index, this.turns, gulp, defender.priority)
			);
		}

		// Post-attack form change for the defender (Mimikyu's Disguise breaking)
		if (
			defender.formChange &&
			defender.formChange.trigger === 'charged_move_damage' &&
			defender.activeFormId !== defender.formChange.alternativeFormId &&
			move.category === 'charged' &&
			!defenderUsedShield &&
			!hasMoveTag(move, 'instant')
		) {
			defender.changeForm(defender.formChange.alternativeFormId!);
		}

		if (defender.hp <= 0) defender.faintSource = move.category;
	}

	/**
	 * Stat changes from a move. Upstream rolls a random number, but in a
	 * simulation buffs are made deterministic: guaranteed moves always apply,
	 * chance moves apply each time their running "meter" crosses a whole
	 * number — so no randomness is needed (or wanted) here.
	 */
	private applyMoveBuffs(attacker: SimPokemon, defender: SimPokemon, move: SimMove) {
		if (!move.buffs) return;

		const chance = move.buffApplyChance ?? 0;
		let applies = chance === 1;

		if (chance < 1 && move.buffApplyMeter !== undefined) {
			const startApplyCount = Math.floor(move.buffApplyMeter);
			move.buffApplyMeter += chance;
			if (startApplyCount < Math.floor(move.buffApplyMeter)) applies = true;
		}

		if (!applies) return;

		if (move.buffTarget === 'opponent' || move.buffTarget === 'both') {
			defender.applyStatBuffs(move.buffTarget === 'both' ? move.buffsOpponent! : move.buffs);
		}

		if (move.buffTarget === 'self' || move.buffTarget === 'both') {
			attacker.applyStatBuffs(move.buffTarget === 'both' ? move.buffsSelf! : move.buffs);
		}
	}
}

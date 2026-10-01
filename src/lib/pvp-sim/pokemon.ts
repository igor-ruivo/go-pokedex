import { cpm as CPMS } from '../../utils/pokemon-helper';
import { ALL_TYPES, calculateDamage, DamageMultiplier, getEffectiveness } from './damage';
import { createMove } from './move';
import type { SimContext, SimMove, SimSpecies } from './types';

const MAX_BUFF_STAGES = 4;
const BUFF_DIVISOR = 4;

/** What a Pokémon needs from the battle it is in: who its opponent is. */
export interface BattleLink {
	getOpponent: (index: number) => SimPokemon | null;
}

/**
 * PvPoke's `Pokemon` class, reduced to what a simulated 1v1 needs: stat and
 * level resolution from the default league IVs, move initialisation and the
 * "best charged move" bookkeeping the decision AI reads, stat buffs, and the
 * handful of species that change form mid-battle.
 */
export class SimPokemon {
	speciesId: string;
	speciesName: string;
	dex: number;
	activeFormId: string;
	originalFormId: string;
	startFormId: string;
	baseStats: { atk: number; def: number; hp: number };
	stats = { atk: 0, def: 0, hp: 0 };
	statBuffs: [number, number] = [0, 0];
	startStatBuffs: [number, number] = [0, 0];
	nativeStatBuffs: [number, number] = [0, 0];
	ivs = { atk: 0, def: 0, hp: 0 };
	types: [string, string];
	typeEffectiveness: Record<string, number> = {};
	cp = 0;
	hp = 0;
	startHp = 0;
	startEnergy = 0;
	startCooldown = 0;
	level = 50;
	levelCap: number;
	readonly baseLevelCap = 50;
	cpm = 0.840300023555755;
	priority = 0;
	shadowType: 'normal' | 'shadow' = 'normal';
	shadowAtkMult = 1;
	shadowDefMult = 1;
	tags: ReadonlyArray<string>;
	formChange: SimSpecies['formChange'];

	fastMove: SimMove;
	chargedMoves: Array<SimMove>;
	activeChargedMoves: Array<SimMove> = [];
	fastestChargedMove!: SimMove;
	bestChargedMove: SimMove | null = null;
	private extraMoves = new Map<string, SimMove>();

	index = 0;
	energy = 0;
	cooldown = 0;
	shields = 0;
	startingShields = 0;
	hasActed = false;
	baitShields = 1;
	farmEnergy = false;
	chargedMovesOnly = false;
	optimizeMoveTiming = true;
	turnsToKO = -1;
	faintSource = '';

	private battle: BattleLink | null = null;

	constructor(
		private readonly species: SimSpecies,
		moveset: ReadonlyArray<string>,
		private readonly ctx: SimContext,
		/** IVs to use instead of the league's best spread; the level is then the highest the CP cap allows. */
		private readonly customIvs?: ReadonlyArray<number>,
		/** A level picked outright (1 to 50, steps of 0.5), whatever the CP cap says. */
		private readonly customLevel?: number
	) {
		this.speciesId = species.speciesId;
		this.speciesName = species.speciesName;
		this.dex = species.dex;
		this.activeFormId = species.speciesId;
		this.originalFormId = species.originalFormId ?? species.speciesId;
		this.startFormId = this.originalFormId;
		this.baseStats = { ...species.baseStats };
		this.types = [species.types[0], species.types[1]];
		this.tags = species.tags;
		this.formChange = species.formChange;
		this.levelCap = ctx.levelCap;
		this.typeEffectiveness = this.computeTypeEffectiveness();

		this.fastMove = createMove(moveset[0], ctx.moves);
		this.chargedMoves = moveset
			.slice(1)
			.filter((id) => id && id !== 'none')
			.map((id) => createMove(id, ctx.moves));

		this.initialize();
	}

	setBattle(battle: BattleLink) {
		this.battle = battle;
		this.levelCap = Math.min(this.ctx.levelCap, this.baseLevelCap);
	}

	hasTag(tag: string): boolean {
		return this.tags.includes(tag);
	}

	/**
	 * Sets IVs and level from the species' rank-1 spread for the league (the Teams view rates everyone
	 * at their ceiling — PvPoke's own default IVs sit a few ranks lower), then derives effective stats.
	 * The simulation itself doesn't care where the IVs came from.
	 */
	private initialize() {
		const spread = this.species.bestIvs;
		const custom = this.customIvs;
		if (custom) {
			[this.ivs.atk, this.ivs.def, this.ivs.hp] = custom as [number, number, number];
			this.setLevel(this.customLevel ?? this.highestFittingLevel());
		} else if (spread) {
			this.ivs.atk = spread[1];
			this.ivs.def = spread[2];
			this.ivs.hp = spread[3];
			this.setLevel(this.customLevel ?? Math.min(this.levelCap, spread[0]));
		} else {
			// No legal spread under the cap: a maxed spread, at the level cap when uncapped.
			this.ivs.atk = this.ivs.def = this.ivs.hp = 15;
			this.setLevel(this.customLevel ?? (this.ctx.cp === 10000 ? this.levelCap : 1));
		}

		this.stats.atk = this.cpm * (this.baseStats.atk + this.ivs.atk);
		this.stats.def = this.cpm * (this.baseStats.def + this.ivs.def);
		this.stats.hp = Math.max(Math.floor(this.cpm * (this.baseStats.hp + this.ivs.hp)), 10);

		// Shedinja
		if (this.dex === 292) this.stats.hp = 10;

		this.hp = this.stats.hp;
		this.startHp = this.hp;
		this.cp = Math.max(this.calculateCP(), 10);

		if (this.hasTag('shadow')) this.setShadowType('shadow');

		this.resetMoves();
	}

	/** The highest level (up to the cap) at which the current IVs stay within the league's CP cap. */
	private highestFittingLevel(): number {
		for (let level = this.levelCap; level >= 1; level -= 0.5) {
			if (this.calculateCP(this.getCPMByLevel(level)) <= this.ctx.cp) return level;
		}
		return 1;
	}

	calculateCP(
		cpm = this.cpm,
		atkIV = this.ivs.atk,
		defIV = this.ivs.def,
		hpIV = this.ivs.hp,
		base = this.baseStats
	): number {
		return Math.floor(
			((base.atk + atkIV) * Math.pow(base.def + defIV, 0.5) * Math.pow(base.hp + hpIV, 0.5) * Math.pow(cpm, 2)) / 10
		);
	}

	getCPMByLevel(level: number): number {
		return CPMS[(level - 1) * 2];
	}

	setLevel(amount: number) {
		this.level = amount;
		this.cpm = this.getCPMByLevel(amount);
		if (amount > this.levelCap) this.levelCap = amount;
	}

	setShadowType(value: 'normal' | 'shadow') {
		this.shadowType = value;
		this.shadowAtkMult = value === 'shadow' ? DamageMultiplier.SHADOW_ATK : 1;
		this.shadowDefMult = value === 'shadow' ? DamageMultiplier.SHADOW_DEF : 1;
	}

	private computeTypeEffectiveness(): Record<string, number> {
		const out: Record<string, number> = {};
		for (const type of ALL_TYPES) out[type] = getEffectiveness(type, this.types);
		return out;
	}

	getStab(move: SimMove): number {
		return move.type === this.types[0] || move.type === this.types[1] ? DamageMultiplier.STAB : 1;
	}

	/** Sets a move's STAB and its damage/efficiency numbers against the current opponent. */
	initializeMove(move: SimMove) {
		const opponent = this.battle?.getOpponent(this.index) ?? null;

		move.stab = this.getStab(move);
		move.damage = opponent ? calculateDamage(this, opponent, move) : Math.floor(move.power * move.stab);
		move.dps = move.damage / (move.cooldown / 500);

		if (move.energy > 0) {
			move.dpe = move.damage / move.energy;

			// A move that buffs the user or debuffs the opponent is worth more than its raw damage.
			if (move.buffs) {
				let buffEffect = 0;
				if (move.buffTarget === 'self' && move.buffs[0] > 0) {
					buffEffect = move.buffs[0] * (80 / move.energy);
				} else if (move.buffTarget === 'opponent' && move.buffs[1] < 0) {
					buffEffect = Math.abs(move.buffs[1]) * (80 / move.energy);
				}

				let multiplier = 1;
				if (buffEffect > 0) {
					multiplier = (BUFF_DIVISOR + buffEffect * (move.buffApplyChance ?? 0)) / BUFF_DIVISOR;
				}
				move.dpe *= multiplier;
			}
		} else {
			move.eps = move.energyGain / (move.cooldown / 500);
			move.deps = move.dps * move.eps;
		}
	}

	/** Re-derives every move's numbers and the ordering the decision AI relies on (`activeChargedMoves`, `bestChargedMove`). */
	resetMoves() {
		this.initializeMove(this.fastMove);
		for (const move of this.chargedMoves) this.initializeMove(move);
		for (const move of this.extraMoves.values()) this.initializeMove(move);

		this.activeChargedMoves = [];

		if (this.chargedMoves.length === 0) {
			this.bestChargedMove = null;
			return;
		}

		for (const move of this.chargedMoves) {
			// Chance-buff moves apply deterministically: an incrementing meter fires the buff each time it crosses a whole number.
			if (move.buffs && (move.buffApplyChance ?? 1) < 1) {
				move.buffApplyMeter = move.buffApplyChance;
				// A 50% move lands on its second use, not its first.
				if (move.buffApplyChance === 0.5) move.buffApplyMeter = 0;
			}
			this.activeChargedMoves.push(move);
		}

		this.activeChargedMoves.sort((a, b) => a.energy - b.energy || 0);
		const active = this.activeChargedMoves;
		this.fastestChargedMove = active[0];

		if (active.length > 1) {
			for (let i = 1; i < active.length; i++) {
				const swapFirstToBack = () => {
					const move = active[0];
					active.splice(0, 1);
					active.push(move);
				};

				// Same cost: prefer the buffing move, or the one that hits harder.
				if (active[i].energy === active[0].energy && !active[i].selfDebuffing) {
					if (active[i].buffs || active[i].damage > active[0].damage) swapFirstToBack();
				}

				// Same cost, both buff: prefer the higher (more guaranteed) buff chance.
				if (
					active[i].energy === active[0].energy &&
					active[0].buffs &&
					active[i].buffs &&
					!active[i].selfDebuffing &&
					(active[i].buffApplyChance ?? 0) > (active[0].buffApplyChance ?? 0)
				) {
					swapFirstToBack();
				}

				// The Zap Cannon Registeel clause: Focus Blast is treated like a self-debuffing move.
				if (active[0].moveId === 'FOCUS_BLAST' && active[i].moveId === 'ZAP_CANNON') {
					if (active[i].dpe - active[0].dpe > -0.3) {
						active[0].buffs = [0, 0];
						active[0].buffTarget = 'self';
						active[0].selfDebuffing = true;
					} else {
						active[0].buffs = undefined;
						active[0].buffTarget = undefined;
						active[0].selfDebuffing = false;
					}
				}

				// Aegislash builds energy in Shield form by treating every charged move as a stat-neutral debuff.
				if (this.activeFormId === 'aegislash_shield') {
					for (const move of active) {
						move.buffs = [0, 0];
						move.buffTarget = 'form';
						move.selfDebuffing = true;
					}
				}

				// Similar energy and DPE: prefer the self-buffing move.
				if (active[i].energy - active[0].energy <= 10 && !active[i].selfDebuffing) {
					if (active[i].selfBuffing && active[0].dpe - active[i].dpe < 0.3) swapFirstToBack();
				}

				// Cheaper move is a self attack-debuffer and the other is a close non-debuffer: prefer the non-debuffer.
				if (active[i].energy - active[0].energy <= 10 && active[0].selfAttackDebuffing && !active[i].selfDebuffing) {
					swapFirstToBack();
				}

				// Same, when the cheap self-debuffing move can't be stacked.
				if (
					active[i].energy - active[0].energy <= 10 &&
					active[0].selfDebuffing &&
					active[0].energy > 50 &&
					!active[i].selfDebuffing
				) {
					swapFirstToBack();
				}

				// A close-energy, self-buffing second move becomes the bait.
				if (active[i].energy - active[0].energy <= 5 && active[i].selfBuffing) swapFirstToBack();
			}
		}

		let best = active[0];
		best.dpe = best.damage / best.energy;
		this.bestChargedMove = best;

		for (const move of active) {
			move.dpe = move.damage / move.energy;

			// Prefer moves with meaningfully higher DPE.
			if ((move.dpe - best.dpe > 0.03 && move.moveId !== 'SUPER_POWER') || move.dpe - best.dpe > 0.3) {
				if (!best.selfBuffing || (best.selfBuffing && move.dpe - best.dpe > 0.3)) {
					best = move;
					this.bestChargedMove = move;
				}
			}

			// When DPE is close, favour the move with the more guaranteed buff.
			if (
				Math.abs(move.dpe - best.dpe) < 0.03 &&
				best.buffs &&
				move.buffs &&
				(move.buffApplyChance ?? 0) > (best.buffApplyChance ?? 0) &&
				!move.selfDebuffing
			) {
				best = move;
				this.bestChargedMove = move;
			}

			if (move.moveId === 'OBSTRUCT') {
				best = move;
				this.bestChargedMove = move;
			}
		}

		if (active[0].moveId === 'OBSTRUCT' && active[0].energy - best.energy <= 5 && active[0].dpe / best.dpe > 0.2) {
			this.bestChargedMove = active[0];
		}
	}

	/** A scripted, free charged move (Cramorant's Gulp Missile), created on first use. */
	getExtraChargedMove(moveId: string): SimMove {
		let move = this.extraMoves.get(moveId);
		if (!move) {
			move = createMove(moveId, this.ctx.moves);
			this.initializeMove(move);
			this.extraMoves.set(moveId, move);
		}
		return move;
	}

	/** Does this Pokémon carry a charged move that reliably boosts it or debuffs the opponent? Returns it, or false. */
	getBoostMove(): SimMove | false {
		let boost: SimMove | false = false;
		for (const move of this.chargedMoves) {
			if (move.buffs && (move.buffApplyChance ?? 0) >= 0.5 && !move.selfDebuffing) boost = move;
		}
		return boost;
	}

	hasMove(moveId: string): boolean {
		return this.fastMove.moveId === moveId || this.chargedMoves.some((m) => m.moveId === moveId);
	}

	applyStatBuffs(buffs: ReadonlyArray<number>) {
		for (let i = 0; i < buffs.length; i++) {
			this.statBuffs[i] = Math.max(Math.min(this.statBuffs[i] + buffs[i], MAX_BUFF_STAGES), -MAX_BUFF_STAGES);
		}
	}

	getStatBuffMultiplier(index: 0 | 1): number {
		const stage = this.statBuffs[index];
		return stage > 0 ? (BUFF_DIVISOR + stage) / BUFF_DIVISOR : BUFF_DIVISOR / (BUFF_DIVISOR - stage);
	}

	/** Attack (0) or Defense (1) after stat buffs and the Shadow multiplier. */
	getEffectiveStat(index: 0 | 1): number {
		let multiplier = this.getStatBuffMultiplier(index);
		if (this.shadowType === 'shadow') {
			multiplier *= index === 0 ? this.shadowAtkMult : this.shadowDefMult;
		}
		return (index === 0 ? this.stats.atk : this.stats.def) * multiplier;
	}

	setShields(amount: number) {
		this.startingShields = amount;
	}

	/** Puts the Pokémon back to its pre-battle state (`isSwitch` keeps forms that don't reset on a switch). */
	reset(isSwitch = false) {
		this.hp = this.startHp;
		this.energy = this.startEnergy;
		this.cooldown = this.startCooldown;
		this.shields = this.startingShields;
		this.statBuffs = [this.startStatBuffs[0], this.startStatBuffs[1]];
		this.faintSource = '';

		if (this.formChange && (this.formChange.resetOnSwitch || !isSwitch)) {
			this.changeForm(this.startFormId);
		}

		this.applyStatBuffs(this.nativeStatBuffs);
		this.resetMoves();
	}

	/** 1 - 0 rating out of 1000 for how the last simulated battle went for this Pokémon. */
	getBattleRating(): number {
		const opponent = this.battle?.getOpponent(this.index);
		if (!opponent) return 0;
		return Math.floor(500 * ((opponent.stats.hp - opponent.hp) / opponent.stats.hp) + 500 * (this.hp / this.stats.hp));
	}

	/** Swaps to another form mid-battle (Aegislash, Mimikyu, Morpeko, Cramorant). */
	changeForm(formId: string) {
		const form = this.ctx.speciesById(formId);
		if (!form) throw new Error(`Unknown form: ${formId}`);

		this.speciesName = form.speciesName;
		this.activeFormId = formId;
		this.types = [form.types[0], form.types[1]];
		this.typeEffectiveness = this.computeTypeEffectiveness();

		if (form.formChange) this.formChange = form.formChange;

		if (
			this.baseStats.atk !== form.baseStats.atk ||
			this.baseStats.def !== form.baseStats.def ||
			this.baseStats.hp !== form.baseStats.hp
		) {
			const newStats = this.getFormStats(formId);
			this.baseStats = { ...form.baseStats };
			this.stats.atk = newStats.atk;
			this.stats.def = newStats.def;
		}

		if (form.nativeStatBuffs) {
			this.nativeStatBuffs[0] = form.nativeStatBuffs[0];
			this.nativeStatBuffs[1] = form.nativeStatBuffs[1];
			this.applyStatBuffs(this.nativeStatBuffs);
		}

		switch (formId) {
			case 'morpeko_full_belly':
				this.replaceChargedMove('AURA_WHEEL_DARK', 'AURA_WHEEL_ELECTRIC');
				break;
			case 'morpeko_hangry':
				this.replaceChargedMove('AURA_WHEEL_ELECTRIC', 'AURA_WHEEL_DARK');
				break;
			case 'aegislash_blade':
				this.replaceFastMove('AEGISLASH_CHARGE_AIR_SLASH', 'AIR_SLASH');
				this.replaceFastMove('AEGISLASH_CHARGE_PSYCHO_CUT', 'PSYCHO_CUT');
				break;
			case 'aegislash_shield':
				this.replaceFastMove('AIR_SLASH', 'AEGISLASH_CHARGE_AIR_SLASH');
				this.replaceFastMove('PSYCHO_CUT', 'AEGISLASH_CHARGE_PSYCHO_CUT');
				break;
		}

		this.resetMoves();
	}

	/** Attack/Defense this Pokémon would have in a different form at the league's CP cap. */
	getFormStats(formId: string): { atk: number; def: number } {
		const newForm = this.ctx.speciesById(formId);
		if (!newForm) throw new Error(`Unknown form: ${formId}`);

		let newLevel = this.level;
		let cpmIndex = CPMS.indexOf(this.cpm);
		const battleCP = this.ctx.cp;

		if (this.speciesId !== formId) {
			switch (formId) {
				case 'aegislash_blade':
					if (battleCP === 1500) newLevel = Math.ceil(this.level * 0.5) + 1;
					if (battleCP === 2500) newLevel = Math.ceil(this.level * 0.75);
					cpmIndex = CPMS.indexOf(this.getCPMByLevel(newLevel));
					break;
				case 'aegislash_shield':
					if (battleCP === 1500) newLevel = this.level / 0.5 + 2;
					if (battleCP === 2500) newLevel = Math.round(this.level / 0.75);
					cpmIndex = CPMS.indexOf(this.getCPMByLevel(newLevel));
					break;
			}
		}

		let newCP = this.cp;
		let newStats: { atk: number; def: number } | undefined;

		// Drop the new form's level until it fits under the CP cap.
		while ((!newStats || newCP > battleCP) && cpmIndex >= 0) {
			cpmIndex = CPMS.indexOf(this.getCPMByLevel(newLevel));
			const newCPM = CPMS[cpmIndex];

			newCP = this.calculateCP(newCPM, this.ivs.atk, this.ivs.def, this.ivs.hp, newForm.baseStats);
			newStats = {
				atk: newCPM * (newForm.baseStats.atk + this.ivs.atk),
				def: newCPM * (newForm.baseStats.def + this.ivs.def),
			};
			newLevel--;
		}

		return newStats as { atk: number; def: number };
	}

	private replaceFastMove(oldId: string, newId: string) {
		if (this.fastMove.moveId === oldId) {
			this.fastMove = createMove(newId, this.ctx.moves);
			this.initializeMove(this.fastMove);
		}
	}

	private replaceChargedMove(oldId: string, newId: string) {
		const index = this.chargedMoves.findIndex((m) => m.moveId === oldId);
		if (index > -1) {
			this.chargedMoves[index] = createMove(newId, this.ctx.moves);
			this.initializeMove(this.chargedMoves[index]);
		}
	}

	/**
	 * PvPoke's 0–100 "consistency" of a moveset: how much of its damage output
	 * survives when a Charged Move is resisted, and how much it relies on
	 * baiting or on a stat-boost lottery. Used for the team's Consistency grade.
	 */
	calculateConsistency(): number {
		const fastMove = this.fastMove;
		const chargedMoves = [...this.chargedMoves];
		let consistencyScore = 1;

		// Reset move stats
		fastMove.damage = fastMove.power * fastMove.stab;
		for (const move of chargedMoves) move.damage = move.power * move.stab;

		if (chargedMoves.length > 1) {
			const effectivenessScenarios: Array<[number, number]> = [[1, 1]];
			if (chargedMoves[0].type !== chargedMoves[1].type) {
				effectivenessScenarios.push([0.625, 1], [1, 0.625]);
			}

			for (const scenario of effectivenessScenarios) {
				// Sort by name as a deterministic starting point (matches upstream's comparator)
				chargedMoves.sort((a, b) => (a.moveId > b.moveId ? -1 : b.moveId > a.moveId ? 1 : 0));

				chargedMoves.forEach((move, index) => {
					if (index < 2) {
						move.dpe = (move.damage / move.energy) * scenario[index];
					} else if (move.type === chargedMoves[0].type) {
						move.dpe = (move.damage / move.energy) * scenario[0];
					} else if (move.type === chargedMoves[1].type) {
						move.dpe = (move.damage / move.energy) * scenario[1];
					} else {
						move.dpe = move.damage / move.energy;
					}
				});

				chargedMoves.sort((a, b) => (a.dpe > b.dpe ? -1 : b.dpe > a.dpe ? 1 : 0));

				// Power-Up Punch can be spammed consistently.
				if (chargedMoves[chargedMoves.length - 1].moveId === 'POWER_UP_PUNCH') {
					chargedMoves[chargedMoves.length - 1].dpe *= 2;
					chargedMoves.sort((a, b) => (a.dpe > b.dpe ? -1 : b.dpe > a.dpe ? 1 : 0));
				}

				const cycleFastMoves = Math.ceil(chargedMoves[0].energy / fastMove.energyGain);
				let cycleFastDamage = fastMove.damage * cycleFastMoves;
				const cycleDamage = cycleFastDamage + chargedMoves[0].damage;

				if (fastMove.type === chargedMoves[0].type) cycleFastDamage *= scenario[0];
				else if (fastMove.type === chargedMoves[1].type) cycleFastDamage *= scenario[1];

				let factor = 1;
				if (
					chargedMoves[0].energy > chargedMoves[1].energy ||
					(chargedMoves[0].energy === chargedMoves[1].energy && chargedMoves[1].moveId === 'ACID_SPRAY') ||
					(chargedMoves[0].selfAttackDebuffing &&
						!chargedMoves[1].selfDebuffing &&
						chargedMoves[1].energy - chargedMoves[0].energy <= 10) ||
					(chargedMoves[0].selfDebuffing &&
						chargedMoves[0].energy > 50 &&
						!chargedMoves[1].selfDebuffing &&
						chargedMoves[1].energy - chargedMoves[0].energy <= 10)
				) {
					factor =
						cycleFastDamage / cycleDamage +
						(chargedMoves[0].damage / cycleDamage) * (chargedMoves[1].dpe / chargedMoves[0].dpe);

					// Close energy costs let players go straight more often.
					if (chargedMoves[1].energy < chargedMoves[0].energy && !chargedMoves[0].selfBuffing) {
						factor += (1 - factor) * ((chargedMoves[1].energy - 30) / (chargedMoves[0].energy - 30)) * 0.5;
					} else if (chargedMoves[1].energy < chargedMoves[0].energy && chargedMoves[0].selfBuffing) {
						factor += (1 - factor) * ((chargedMoves[1].energy - 20) / (chargedMoves[0].energy - 20));
					}
				}

				// Chance-buff moves are a lottery — worst at 50%, least at 10%.
				let buffChanceFactor = 0;
				for (const move of chargedMoves) {
					const chance = move.buffApplyChance ?? 1;
					if (move.buffs && chance < 1 && chance > 0.15) {
						const buffStages = Math.abs(move.buffs[0]) + Math.abs(move.buffs[1]);
						const buffConsistency = 0.5 + Math.abs(0.5 - chance);
						const buffsAsDamage = move.damage + buffStages * 25 * (1 - buffConsistency);
						buffChanceFactor += move.damage / buffsAsDamage;
					} else {
						buffChanceFactor += 1;
					}
				}
				buffChanceFactor /= chargedMoves.length;

				consistencyScore *= factor * buffChanceFactor;
			}

			consistencyScore = Math.pow(consistencyScore, 1 / effectivenessScenarios.length);
		}

		if (this.hasMove('POWER_UP_PUNCH')) consistencyScore *= 0.85;
		if (this.hasMove('LUNGE')) consistencyScore *= 0.85;
		if (this.hasMove('FEATHER_DANCE')) consistencyScore *= 0.75;
		if (this.hasMove('BUBBLE_BEAM')) consistencyScore *= 0.75;

		return Math.round(consistencyScore * 1000) / 10;
	}
}

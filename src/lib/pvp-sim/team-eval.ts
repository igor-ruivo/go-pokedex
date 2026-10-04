import type { TeamBuilderData, TeamLeague } from '../../DTOs/ITeamBuilder';
import { bestSpreadAt } from '../iv-rank';
import { maxLevelOf, type SlotIvs } from '../team-analysis';
import { assignRoles, type RoleScores } from '../team-roles';
import { SimBattle } from './battle';
import { createSimContext, type SpeciesInfo } from './context';
import { type MemberStats, memberStats } from './member';
import { SimPokemon } from './pokemon';
import { generateTraits, similarityScore, type Traits } from './traits';
import type { SimContext, SimMove } from './types';

/** One entry of a league's PvPoke ranking: the recommended moveset and role scores. */
export interface RankedEntry {
	speciesId: string;
	moveset: ReadonlyArray<string>;
	score: number;
	switch: number;
	charger: number;
	consistency: number;
	rank: number;
	/**
	 * PvPoke's Lead and Closer scores. With `switch`, they decide the team's play order — and a team is always rated
	 * in that order (see `TeamEvaluator.evaluate`). Without them the order a team is given is used.
	 */
	lead?: number;
	closer?: number;
}

export type { SpeciesInfo } from './context';

export interface EvaluatorInit {
	league: TeamLeague;
	/** The league's CP cap (the worker has no registry of them). */
	cpCap: number;
	builder: TeamBuilderData;
	/** Every species the ranking mentions. */
	species: ReadonlyArray<SpeciesInfo>;
	ranking: ReadonlyArray<RankedEntry>;
}

export interface TeamSlot {
	speciesId: string;
	/** `[fast, charged 1, charged 2?]` */
	moveset: ReadonlyArray<string>;
	/** IVs picked for this member; absent: the league's best spread. */
	ivs?: SlotIvs | undefined;
	/** Level picked for this member; absent: the highest the CP cap allows. */
	level?: number | undefined;
	/** A Super Max Mega (the build above is the best one at its level ceiling). Only set on a suggested Pokémon. */
	superMega?: true | undefined;
}

export interface ThreatEntry {
	speciesId: string;
	moveset: ReadonlyArray<string>;
	/** Threat's average rating against the team, 0–1000 (higher = it beats you more). */
	rating: number;
	/** PvPoke's weighted threat ordering score. */
	score: number;
	/** The threat's rating against each teammate. */
	ratings: Array<number>;
	/** Each teammate's rating against the threat (1000 − it is not exact — shield scenarios are blended differently). */
	opRatings: Array<number>;
	inMeta: boolean;
}

export interface MetaCoverage {
	/** How many of the league's top-ranked Pokémon were checked. */
	checked: number;
	/** Beaten (rating above 500) by at least one teammate. */
	covered: number;
	/** Beaten decisively (rating 600+) by at least one teammate. */
	secure: number;
	/** How many of the checked Pokémon each teammate beats. */
	wins: Array<number>;
	/** Top-ranked Pokémon nobody on the team beats, best-ranked first. */
	holes: Array<{ speciesId: string; best: number }>;
}

export interface TeamEvaluation {
	/** PvPoke's threat score — lower is better. */
	threatScore: number;
	/** The six distinct top threats the score averages. */
	threats: Array<ThreatEntry>;
	members: Array<MemberStats>;
	meta: MetaCoverage;
	/** Average of the members' effective bulk. */
	averageBulk: number;
	/** Average of the members' ranking "switch" score (PvPoke's "safety"). */
	averageSafety: number;
	averageConsistency: number;
	/** How many Pokémon were simulated against the team. */
	poolSize: number;
}

export interface AlternativePick {
	/** Slot (0-based) the candidate would replace. */
	slot: number;
	speciesId: string;
	moveset: ReadonlyArray<string>;
	threatScore: number;
	/** Change against the current team's threat score on the same basis (negative = better). */
	delta: number;
	/** A Super Max Mega candidate is always considered as one: its best build at that level ceiling. */
	ivs?: SlotIvs;
	level?: number;
	superMega?: true;
}

export interface TeamCompletion {
	/** The whole team, in play order. The Pokémon already on it keep their moves; the added ones take the ranking's. */
	members: Array<TeamSlot>;
	/** PvPoke's threat score for the completed team — lower is better. */
	threatScore: number;
}

/** One Pokémon's matchups against the whole pool, simulated once and reused by every team it appears in. */
interface MatchupColumns {
	ratings: Array<Float64Array>;
	/** Each rating's threat-ordering score. */
	scores: Array<Float64Array>;
	/** Which charged move each pool Pokémon ends up treating as its best after facing this Pokémon (see `rankTeams`). */
	bestMoves: Array<Array<SimMove | null>>;
}

export interface RankedTeamThreat {
	/** Candidate species, in the order given to `rankTeams`. */
	speciesIds: [string, string, string];
	/** PvPoke's threat score for the trio — lower is better. */
	threatScore: number;
}

/** How many top-ranked species count as "the meta" for coverage checks. */
const META_CHECK_COUNT = 100;
const SHIELD_SCENARIOS = [0, 1] as const;
const IS_META_FACTOR = 0.85;

interface PoolEntry {
	entry: RankedEntry;
	poke: SimPokemon;
	inMeta: boolean;
	/** PvPoke stamps traits onto each Pokémon lazily and reuses them — see `similarityScore`. */
	cachedTraits: Traits | undefined;
}

interface RatedRow {
	entry: PoolEntry;
	rating: number;
	score: number;
	ratings: Array<number>;
	opRatings: Array<number>;
}

interface MatchupResult {
	/** The first Pokémon's blended rating against the second. */
	rating: number;
	/** The second Pokémon's blended rating against the first. */
	opRating: number;
}

/** Puts values listed by play position back to the positions the caller gave them in (`order[k]` = original index). */
const placeBack = <T>(values: ReadonlyArray<T>, order: ReadonlyArray<number>): Array<T> => {
	const out = new Array<T>(values.length);
	order.forEach((original, k) => {
		out[original] = values[k];
	});
	return out;
};

/**
 * The play order of three Pokémon from their role scores: `[lead, switch, closer]` as indices into the input —
 * the assignment with the highest role scores (see `assignRoles`). Unchanged order when a score is missing.
 */
const playOrderOf = (scores: ReadonlyArray<RoleScores | undefined>): Array<number> => {
	const roles = assignRoles(scores);
	return roles ? [roles.order.lead, roles.order.switch, roles.order.closer] : scores.map((_, i) => i);
};

/**
 * Rates teams the way PvPoke's Team Builder does: every Pokémon in the league's
 * ranking is simulated against each teammate (0 and 1 shields, blended), the
 * ones that do best against the team are its "threats", and the average of the
 * six most distinct of them is the team's threat score.
 */
export class TeamEvaluator {
	private readonly ctx: SimContext;
	private readonly speciesInfo = new Map<string, SpeciesInfo>();
	private readonly pool: Array<PoolEntry>;
	private readonly rankingById = new Map<string, RankedEntry>();
	private readonly metaSet: ReadonlySet<string>;
	private readonly superMegaBuilds = new Map<string, { ivs: SlotIvs; level: number } | null>();

	constructor(private readonly init: EvaluatorInit) {
		const { builder, league } = init;
		for (const s of init.species) this.speciesInfo.set(s.speciesId, s);
		for (const r of init.ranking) this.rankingById.set(r.speciesId, r);
		this.metaSet = new Set(builder.meta[league]);

		this.ctx = createSimContext(league, builder, (id) => this.speciesInfo.get(id), init.cpCap);

		this.pool = init.ranking
			.filter((r) => this.speciesInfo.has(r.speciesId) && !r.speciesId.includes('_xs'))
			.map((entry) => ({
				entry,
				poke: this.createPokemon(entry.speciesId, entry.moveset),
				inMeta: this.metaSet.has(entry.speciesId),
				cachedTraits: undefined,
			}));
	}

	private roleScoresOf(speciesId: string): RoleScores | undefined {
		const r = this.rankingById.get(speciesId);
		return r?.lead !== undefined && r.closer !== undefined
			? { lead: r.lead, switch: r.switch, closer: r.closer }
			: undefined;
	}

	/**
	 * The build a suggested Super Max Mega is rated with: the best spread at a level ceiling of 52 (50, plus the two levels of
	 * Super Max), with the level and so the CP that goes with it. Never a Best Buddy build. `undefined` for any other Pokémon.
	 */
	superMegaBuild(speciesId: string): { ivs: SlotIvs; level: number } | undefined {
		const info = this.speciesInfo.get(speciesId);
		if (!info?.isSuperMega) return undefined;
		let build = this.superMegaBuilds.get(speciesId);
		if (build === undefined) {
			build = bestSpreadAt(info.baseStats, this.init.cpCap, maxLevelOf({ superMega: true })) ?? null;
			this.superMegaBuilds.set(speciesId, build);
		}
		return build ?? undefined;
	}

	/** Species usable as a team member: anything in this league's ranking. */
	hasSpecies(speciesId: string): boolean {
		return this.rankingById.has(speciesId);
	}

	private createPokemon(speciesId: string, moveset: ReadonlyArray<string>, ivs?: SlotIvs, level?: number): SimPokemon {
		const species = this.ctx.speciesById(speciesId);
		if (!species) throw new Error(`Unknown species: ${speciesId}`);
		return new SimPokemon(species, moveset, this.ctx, ivs, level);
	}

	/** One Pokémon against another, blending 0-shield and 1-shield results the way the Team Builder does. */
	private simulateMatchup(battle: SimBattle, first: SimPokemon, second: SimPokemon): MatchupResult {
		battle.setNewPokemon(first, 0);
		battle.setNewPokemon(second, 1);

		const ratings: Array<number> = [];
		let opTotal = 0;

		for (const shields of SHIELD_SCENARIOS) {
			first.setShields(shields);
			second.setShields(shields);
			battle.simulate();

			const healthRating = first.hp / first.stats.hp;
			const damageRating = (second.stats.hp - second.hp) / second.stats.hp;
			const opHealthRating = second.hp / second.stats.hp;
			const opDamageRating = (first.stats.hp - first.hp) / first.stats.hp;

			ratings.push(Math.floor((healthRating + damageRating) * 500));
			opTotal += Math.floor((opHealthRating + opDamageRating) * 500);
		}

		first.reset();
		second.reset();

		return {
			// The 1-shield result counts three times as much as the 0-shield one.
			rating: Math.round(Math.pow(ratings[0] * Math.pow(ratings[1], 3), 1 / 4)),
			opRating: Math.floor(opTotal / SHIELD_SCENARIOS.length),
		};
	}

	/** PvPoke's per-matchup threat score: wins are damped, losses halved, and non-meta wins shrunk. */
	private matchupScore(rating: number, inMeta: boolean): number {
		let score = rating > 500 ? 500 + Math.pow(rating - 500, 0.75) : rating / 2;

		if (score > 500) {
			score = inMeta ? score + (1000 - score) * IS_META_FACTOR : score - (score - 500) * (1 - IS_META_FACTOR);
		}
		return score;
	}

	private traitsOf(entry: PoolEntry): Traits {
		const r = entry.entry;
		const { pros, cons } = generateTraits(entry.poke, this.ctx.cp, {
			switch: r.switch,
			charger: r.charger,
			consistency: r.consistency,
		});
		return { pros, cons };
	}

	/**
	 * The six most distinct top threats, in PvPoke's order, plus their mean
	 * rating (the threat score). `rows` must already be sorted best-threat-first.
	 */
	private pickThreats<T extends { entry: PoolEntry; rating: number }>(
		rows: ReadonlyArray<T>
	): { picked: Array<T>; threatScore: number } {
		const picked: Array<T> = [];
		let total = 0;

		for (const row of rows) {
			if (picked.length >= 6) break;

			// Threats PvPoke keeps out of the team builder entirely
			if (row.entry.poke.hasTag('teambuilderexclude')) continue;

			const candidate = row.entry;
			const similar = picked.some((counter) => {
				// Same species (a Shadow and its base count as one)
				if (candidate.poke.speciesId.replace('_shadow', '') === counter.entry.poke.speciesId.replace('_shadow', '')) {
					return true;
				}

				const candidateTraits = this.traitsOf(candidate);
				// Upstream compares against the candidate's own cached traits once it has any.
				const reference = candidate.cachedTraits ?? this.traitsOf(counter.entry);
				candidate.cachedTraits = candidateTraits;

				return similarityScore(counter.entry.poke, candidate.poke, candidateTraits, reference) >= 1000;
			});

			if (similar) continue;

			picked.push(row);
			total += row.rating;
		}

		return { picked, threatScore: Math.round(total / 6) };
	}

	/** Simulates every pool Pokémon against each teammate, in pool order. */
	private rate(members: ReadonlyArray<SimPokemon>): Array<RatedRow> {
		const battle = new SimBattle();
		for (const p of this.pool) p.cachedTraits = undefined;

		const rows: Array<RatedRow> = [];

		for (const entry of this.pool) {
			const ratings: Array<number> = [];
			const opRatings: Array<number> = [];
			let ratingTotal = 0;
			let scoreTotal = 0;

			for (const member of members) {
				const result = this.simulateMatchup(battle, entry.poke, member);
				ratings.push(result.rating);
				opRatings.push(result.opRating);
				ratingTotal += result.rating;
				scoreTotal += this.matchupScore(result.rating, entry.inMeta);
			}

			rows.push({
				entry,
				rating: Math.floor(ratingTotal / members.length),
				score: scoreTotal / members.length,
				ratings,
				opRatings,
			});
		}

		battle.clearPokemon();
		return rows;
	}

	/**
	 * Every pool Pokémon's blended rating against each teammate — the raw simulation results the threat
	 * score is built from. Exposed so the golden-master tests can pin every single matchup, not just the
	 * six that end up as threats.
	 */
	matchups(team: ReadonlyArray<TeamSlot>): Array<{ speciesId: string; rating: number; ratings: Array<number> }> {
		const members = team.map((slot) => this.createPokemon(slot.speciesId, slot.moveset, slot.ivs, slot.level));
		return this.rate(members).map((row) => ({
			speciesId: row.entry.entry.speciesId,
			rating: row.rating,
			ratings: row.ratings,
		}));
	}

	/**
	 * Full team evaluation against every Pokémon in the league's ranking.
	 *
	 * PvPoke's threat score depends slightly on the order a team is rated in — which teammate is last decides the
	 * leftover state the threat-similarity check reads — so the same three Pokémon could score differently in
	 * different slot orders. To give one team one score, it is always rated in its *play order* (lead, switch,
	 * closer, from the ranking's role scores), whatever order it was passed in; the per-teammate figures in the
	 * result are returned in the caller's order. `order: 'given'` rates the team exactly in the order passed — what
	 * PvPoke itself does with that order (the parity and golden-master tests compare against it).
	 */
	evaluate(team: ReadonlyArray<TeamSlot>, options: { order?: 'play' | 'given' } = {}): TeamEvaluation {
		if (options.order === 'given' || team.length !== 3) return this.evaluateInOrder(team);

		const order = playOrderOf(team.map((slot) => this.roleScoresOf(slot.speciesId)));
		if (order.every((original, k) => original === k)) return this.evaluateInOrder(team);

		const result = this.evaluateInOrder(order.map((original) => team[original]));
		return {
			...result,
			members: placeBack(result.members, order),
			threats: result.threats.map((t) => ({
				...t,
				ratings: placeBack(t.ratings, order),
				opRatings: placeBack(t.opRatings, order),
			})),
			meta: { ...result.meta, wins: placeBack(result.meta.wins, order) },
		};
	}

	/** `evaluate` for a team rated in exactly the order given. */
	private evaluateInOrder(team: ReadonlyArray<TeamSlot>): TeamEvaluation {
		const members = team.map((slot) => this.createPokemon(slot.speciesId, slot.moveset, slot.ivs, slot.level));
		const rows = this.rate(members);

		rows.sort((a, b) => b.score - a.score);
		const { picked, threatScore } = this.pickThreats(rows);

		const memberStatList = members.map((m) => memberStats(m));

		// How the team fares against the top of the ranking
		const byRank = [...rows].sort((a, b) => a.entry.entry.rank - b.entry.entry.rank);
		// A Shadow and its normal form are one matchup, and a teammate's own species is not a hole to plug.
		const seenBase = new Set<string>(team.map((slot) => slot.speciesId.replace('_shadow', '')));
		const checked: Array<RatedRow> = [];
		for (const row of byRank) {
			if (checked.length >= META_CHECK_COUNT) break;
			const base = row.entry.entry.speciesId.replace('_shadow', '');
			if (seenBase.has(base)) continue;
			seenBase.add(base);
			checked.push(row);
		}

		const wins = members.map(() => 0);
		const holes: MetaCoverage['holes'] = [];
		let covered = 0;
		let secure = 0;
		for (const row of checked) {
			const best = Math.max(...row.opRatings);
			row.opRatings.forEach((r, i) => {
				if (r > 500) wins[i]++;
			});
			if (best > 500) covered++;
			else holes.push({ speciesId: row.entry.entry.speciesId, best });
			if (best >= 600) secure++;
		}

		const average = (values: ReadonlyArray<number>) => values.reduce((a, b) => a + b, 0) / (values.length || 1);

		return {
			threatScore,
			threats: picked.map((row) => ({
				speciesId: row.entry.entry.speciesId,
				moveset: row.entry.entry.moveset,
				rating: row.rating,
				score: row.score,
				ratings: row.ratings,
				opRatings: row.opRatings,
				inMeta: row.entry.inMeta,
			})),
			members: memberStatList,
			meta: { checked: checked.length, covered, secure, wins, holes },
			averageBulk: average(memberStatList.map((m) => m.bulk)),
			averageSafety: average(team.map((slot) => this.rankingById.get(slot.speciesId)?.switch ?? 60)),
			averageConsistency: average(memberStatList.map((m) => m.consistency)),
			poolSize: this.pool.length,
		};
	}

	/**
	 * Every single-slot swap of the team for one of the league's top candidates, with the threat score the swapped
	 * team would have, best (lowest) first. Every candidate is simulated once against every threat; each slot swap
	 * is then a cheap re-ranking of numbers already computed. Callers pick what to show (see `suggest`).
	 */
	swaps(
		team: ReadonlyArray<TeamSlot>,
		options: { candidates?: number; onProgress?: (done: number, total: number) => void } = {}
	): Array<AlternativePick> {
		const candidateCount = options.candidates ?? 40;

		const members = team.map((slot) => this.createPokemon(slot.speciesId, slot.moveset, slot.ivs, slot.level));
		const battle = new SimBattle();
		for (const p of this.pool) p.cachedTraits = undefined;

		// Ratings of every threat against each current teammate
		// A Pokémon's "best charged move" (which the threat traits read) depends on the opponent it last faced, so
		// the state each swapped team would leave behind is captured alongside the ratings — see `rankTeams`.
		const baseBest = this.pool.map(() => new Array<SimMove | null>(members.length).fill(null));
		const base = this.pool.map((entry, i) =>
			members.map((member, k) => {
				const { rating } = this.simulateMatchup(battle, entry.poke, member);
				baseBest[i][k] = entry.poke.bestChargedMove;
				return rating;
			})
		);
		const roleScores = team.map((slot) => this.roleScoresOf(slot.speciesId));
		// Each team that comes out of a swap is rated in its own play order, so the closer — the member every pool
		// Pokémon faces last — can change with the swap; the slots below are positions in the *given* team.
		const fullTeam = team.length === 3;
		const currentOrder = fullTeam ? playOrderOf(roleScores) : members.map((_, k) => k);

		const teamBases = new Set(team.map((slot) => slot.speciesId.replace('_shadow', '')));
		const outsiders = [...this.pool]
			.filter((p) => !teamBases.has(p.entry.speciesId.replace('_shadow', '')))
			.sort((a, b) => a.entry.rank - b.entry.rank);
		const top = outsiders.slice(0, candidateCount);
		// Every Super Max Mega of the league is always a candidate, however far down the ranking it is.
		const candidates = [...top, ...outsiders.slice(candidateCount).filter((p) => this.superMegaBuild(p.entry.speciesId))];

		const scoreTeam = (
			ratingsOf: (poolIndex: number) => Array<number>,
			bestOf: (poolIndex: number) => SimMove | null
		): number => {
			const rows = this.pool.map((entry, i) => {
				const ratings = ratingsOf(i);
				const scoreTotal = ratings.reduce((sum, r) => sum + this.matchupScore(r, entry.inMeta), 0);
				return {
					entry,
					rating: Math.floor(ratings.reduce((a, b) => a + b, 0) / ratings.length),
					score: scoreTotal / ratings.length,
				};
			});
			rows.sort((a, b) => b.score - a.score);
			this.pool.forEach((p, i) => {
				p.poke.bestChargedMove = bestOf(i);
				p.cachedTraits = undefined;
			});
			return this.pickThreats(rows).threatScore;
		};

		const currentScore = scoreTeam(
			(i) => currentOrder.map((k) => base[i][k]),
			(i) => baseBest[i][currentOrder[currentOrder.length - 1]]
		);
		const picks: Array<AlternativePick> = [];

		candidates.forEach((candidate, ci) => {
			// The candidate needs its own instance when it would face a mirror of itself.
			const candidateBest = new Array<SimMove | null>(this.pool.length).fill(null);
			// A Super Max Mega is rated at its best build for level 52, on an instance of its own.
			const superBuild = this.superMegaBuild(candidate.entry.speciesId);
			const superPoke = superBuild
				? this.createPokemon(candidate.entry.speciesId, candidate.entry.moveset, superBuild.ivs, superBuild.level)
				: undefined;
			const column = this.pool.map((entry, i) => {
				const opponent =
					superPoke ??
					(entry.poke === candidate.poke
						? this.createPokemon(candidate.entry.speciesId, candidate.entry.moveset)
						: candidate.poke);
				const { rating } = this.simulateMatchup(battle, entry.poke, opponent);
				candidateBest[i] = entry.poke.bestChargedMove;
				return rating;
			});

			const candidateRoles = this.roleScoresOf(candidate.entry.speciesId);
			for (let slot = 0; slot < team.length; slot++) {
				// Positions of the swapped team in play order (a position is a slot of the given team).
				const positions = fullTeam
					? playOrderOf(roleScores.map((r, k) => (k === slot ? candidateRoles : r)))
					: members.map((_, k) => k);
				const closerPosition = positions[positions.length - 1];
				const threatScore = scoreTeam(
					(i) => positions.map((k) => (k === slot ? column[i] : base[i][k])),
					// The swapped team's last member is what every pool Pokémon faced last.
					closerPosition === slot ? (i) => candidateBest[i] : (i) => baseBest[i][closerPosition]
				);
				picks.push({
					slot,
					speciesId: candidate.entry.speciesId,
					moveset: candidate.entry.moveset,
					threatScore,
					delta: threatScore - currentScore,
					...(superBuild ? { ivs: superBuild.ivs, level: superBuild.level, superMega: true as const } : {}),
				});
			}

			options.onProgress?.(ci + 1, candidates.length);
		});

		battle.clearPokemon();

		return picks.sort((a, b) => a.threatScore - b.threatScore);
	}

	/** The swaps that lower (or at worst keep) the threat score: the best slot for each candidate, best first. */
	suggest(
		team: ReadonlyArray<TeamSlot>,
		options: { candidates?: number; results?: number } = {}
	): Array<AlternativePick> {
		const seen = new Set<string>();
		return this.swaps(team, options.candidates === undefined ? {} : { candidates: options.candidates })
			.filter((p) => (seen.has(p.speciesId) ? false : (seen.add(p.speciesId), true)))
			.filter((p) => p.delta <= 0)
			.slice(0, options.results ?? 4);
	}
	/** Simulates each member once against the whole pool: the raw material every team they appear in is rated from. */
	private buildColumns(
		members: ReadonlyArray<TeamSlot>,
		onProgress?: (done: number, total: number) => void
	): MatchupColumns {
		const battle = new SimBattle();
		const poolSize = this.pool.length;
		const ratings: Array<Float64Array> = [];
		const scores: Array<Float64Array> = [];
		const bestMoves: Array<Array<SimMove | null>> = [];
		members.forEach(({ speciesId, moveset, ivs, level }, k) => {
			const member = this.createPokemon(
				speciesId,
				moveset.filter((m) => m !== 'none'),
				ivs,
				level
			);
			const ratingColumn = new Float64Array(poolSize);
			const scoreColumn = new Float64Array(poolSize);
			const bestColumn = new Array<SimMove | null>(poolSize);
			this.pool.forEach((row, i) => {
				const { rating } = this.simulateMatchup(battle, row.poke, member);
				ratingColumn[i] = rating;
				scoreColumn[i] = this.matchupScore(rating, row.inMeta);
				bestColumn[i] = row.poke.bestChargedMove;
			});
			ratings.push(ratingColumn);
			scores.push(scoreColumn);
			bestMoves.push(bestColumn);
			onProgress?.(k + 1, members.length);
		});
		battle.clearPokemon();
		return { ratings, scores, bestMoves };
	}

	/**
	 * Rates one trio from already simulated columns, exactly as `evaluate` would: in its play order (the sums run in
	 * that order, and the closer is the member whose battles every pool Pokémon is left remembering — PvPoke's own
	 * quirk, see `evaluate`). `trio` holds column indices; `roles` the role scores per column. Returns the play order.
	 */
	private rateTrio(
		columns: MatchupColumns,
		trio: readonly [number, number, number],
		roles: ReadonlyArray<RoleScores | undefined>
	): { order: [number, number, number]; threatScore: number } {
		const poolSize = this.pool.length;
		const { ratings, scores, bestMoves } = columns;
		const [x, y, z] = playOrderOf(trio.map((k) => roles[k])).map((p) => trio[p]);

		const score = new Float64Array(poolSize);
		const order = new Array<number>(poolSize);
		for (let i = 0; i < poolSize; i++) {
			score[i] = (scores[x][i] + scores[y][i] + scores[z][i]) / 3;
			order[i] = i;
		}
		// Best threat first; ties keep pool order, as `evaluate`'s stable sort does.
		order.sort((p, q) => score[q] - score[p] || p - q);

		const rows = new Array<{ entry: PoolEntry; rating: number; score: number }>(poolSize);
		for (let r = 0; r < poolSize; r++) {
			const i = order[r];
			rows[r] = {
				entry: this.pool[i],
				rating: Math.floor((ratings[x][i] + ratings[y][i] + ratings[z][i]) / 3),
				score: score[i],
			};
		}
		// `evaluate` leaves every pool Pokémon having last faced the team's closer, so put that state back rather than
		// whichever Pokémon happened to be simulated last.
		for (let i = 0; i < poolSize; i++) {
			this.pool[i].poke.bestChargedMove = bestMoves[z][i];
			this.pool[i].cachedTraits = undefined;
		}
		return { order: [x, y, z], threatScore: this.pickThreats(rows).threatScore };
	}

	/**
	 * The threat score of every trio of `candidateIds` (each with its ranking's recommended moveset), exactly as
	 * `evaluate` would rate them. A Pokémon's matchups don't depend on its teammates, so each candidate is
	 * simulated once against the whole pool and every trio is then just three of those columns re-ranked — the
	 * same idea `suggest` uses. Trios that field one species twice (a Shadow and its normal form count as one)
	 * are skipped.
	 */
	rankTeams(
		candidateIds: ReadonlyArray<string>,
		onProgress?: (done: number, total: number) => void
	): Array<RankedTeamThreat> {
		const members: Array<TeamSlot> = candidateIds.map((id) => {
			const entry = this.rankingById.get(id);
			if (!entry) throw new Error(`Unknown candidate: ${id}`);
			// A Super Max Mega is rated at its best build for level 52 (see `superMegaBuild`)
			const build = this.superMegaBuild(id);
			return { speciesId: id, moveset: entry.moveset, ...(build ? { ivs: build.ivs, level: build.level } : {}) };
		});
		const columns = this.buildColumns(members, onProgress);
		const base = candidateIds.map((id) => id.replace('_shadow', ''));
		const roles = candidateIds.map((id) => this.roleScoresOf(id));
		const out: Array<RankedTeamThreat> = [];

		for (let a = 0; a < candidateIds.length; a++) {
			for (let b = a + 1; b < candidateIds.length; b++) {
				if (base[b] === base[a]) continue;
				for (let c = b + 1; c < candidateIds.length; c++) {
					if (base[c] === base[a] || base[c] === base[b]) continue;
					const { order, threatScore } = this.rateTrio(columns, [a, b, c], roles);
					out.push({
						speciesIds: [candidateIds[order[0]], candidateIds[order[1]], candidateIds[order[2]]],
						threatScore,
					});
				}
			}
		}
		return out;
	}

	/**
	 * Every way to finish a team of one or two Pokémon with the league's best-ranked ones (each added Pokémon with
	 * its ranking's recommended moves), with the threat score of the finished team. The Pokémon already on the team
	 * keep the moves they have. Same shortcut as `rankTeams`: everyone is simulated once, every completion is then a
	 * re-ranking of those columns — so it returns exactly what `evaluate` gives each finished team.
	 */
	rankCompletions(fixed: ReadonlyArray<TeamSlot>, options: { candidates?: number } = {}): Array<TeamCompletion> {
		const missing = 3 - fixed.length;
		if (missing < 1 || missing > 2) return [];

		const fixedBases = new Set(fixed.map((slot) => slot.speciesId.replace('_shadow', '')));
		const outsiders = [...this.pool]
			.filter((p) => !fixedBases.has(p.entry.speciesId.replace('_shadow', '')))
			.sort((a, b) => a.entry.rank - b.entry.rank);
		const wanted = options.candidates ?? 50;
		// Every Super Max Mega of the league is always a candidate too, rated at its best build for level 52.
		const candidates: Array<TeamSlot> = [
			...outsiders.slice(0, wanted),
			...outsiders.slice(wanted).filter((p) => this.superMegaBuild(p.entry.speciesId)),
		].map((p) => {
			const build = this.superMegaBuild(p.entry.speciesId);
			return {
				speciesId: p.entry.speciesId,
				moveset: p.entry.moveset.filter((m) => m !== 'none'),
				...(build ? { ivs: build.ivs, level: build.level, superMega: true as const } : {}),
			};
		});

		const members: Array<TeamSlot> = [
			...fixed.map((slot) => ({ speciesId: slot.speciesId, moveset: [...slot.moveset], ivs: slot.ivs, level: slot.level })),
			...candidates,
		];
		const columns = this.buildColumns(members);
		const roles = members.map((m) => this.roleScoresOf(m.speciesId));
		const bases = members.map((m) => m.speciesId.replace('_shadow', ''));
		const fixedIndexes = fixed.map((_, k) => k);

		const out: Array<TeamCompletion> = [];
		const finish = (trio: readonly [number, number, number]) => {
			const { order, threatScore } = this.rateTrio(columns, trio, roles);
			out.push({
				members: order.map((k) => members[k]),
				threatScore,
			});
		};

		for (let a = fixed.length; a < members.length; a++) {
			if (missing === 1) {
				finish([...fixedIndexes, a] as unknown as [number, number, number]);
				continue;
			}
			for (let b = a + 1; b < members.length; b++) {
				if (bases[b] === bases[a]) continue;
				finish([...fixedIndexes, a, b] as unknown as [number, number, number]);
			}
		}
		return out;
	}
}

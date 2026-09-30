import type { TeamBuilderData, TeamLeague } from '../../DTOs/ITeamBuilder';
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
}

export type { SpeciesInfo } from './context';

export interface EvaluatorInit {
	league: TeamLeague;
	builder: TeamBuilderData;
	/** Every species the ranking mentions. */
	species: ReadonlyArray<SpeciesInfo>;
	ranking: ReadonlyArray<RankedEntry>;
}

export interface TeamSlot {
	speciesId: string;
	/** `[fast, charged 1, charged 2?]` */
	moveset: ReadonlyArray<string>;
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

	constructor(private readonly init: EvaluatorInit) {
		const { builder, league } = init;
		for (const s of init.species) this.speciesInfo.set(s.speciesId, s);
		for (const r of init.ranking) this.rankingById.set(r.speciesId, r);
		this.metaSet = new Set(builder.meta[league]);

		this.ctx = createSimContext(league, builder, (id) => this.speciesInfo.get(id));

		this.pool = init.ranking
			.filter((r) => this.speciesInfo.has(r.speciesId) && !r.speciesId.includes('_xs'))
			.map((entry) => ({
				entry,
				poke: this.createPokemon(entry.speciesId, entry.moveset),
				inMeta: this.metaSet.has(entry.speciesId),
				cachedTraits: undefined,
			}));
	}

	/** Species usable as a team member: anything in this league's ranking. */
	hasSpecies(speciesId: string): boolean {
		return this.rankingById.has(speciesId);
	}

	private createPokemon(speciesId: string, moveset: ReadonlyArray<string>): SimPokemon {
		const species = this.ctx.speciesById(speciesId);
		if (!species) throw new Error(`Unknown species: ${speciesId}`);
		return new SimPokemon(species, moveset, this.ctx);
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
		const members = team.map((slot) => this.createPokemon(slot.speciesId, slot.moveset));
		return this.rate(members).map((row) => ({
			speciesId: row.entry.entry.speciesId,
			rating: row.rating,
			ratings: row.ratings,
		}));
	}

	/** Full team evaluation against every Pokémon in the league's ranking. */
	evaluate(team: ReadonlyArray<TeamSlot>): TeamEvaluation {
		const members = team.map((slot) => this.createPokemon(slot.speciesId, slot.moveset));
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

		const members = team.map((slot) => this.createPokemon(slot.speciesId, slot.moveset));
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
		const last = members.length - 1;

		const teamBases = new Set(team.map((slot) => slot.speciesId.replace('_shadow', '')));
		const candidates = [...this.pool]
			.filter((p) => !teamBases.has(p.entry.speciesId.replace('_shadow', '')))
			.sort((a, b) => a.entry.rank - b.entry.rank)
			.slice(0, candidateCount);

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
			(i) => base[i],
			(i) => baseBest[i][last]
		);
		const picks: Array<AlternativePick> = [];

		candidates.forEach((candidate, ci) => {
			// The candidate needs its own instance when it would face a mirror of itself.
			const candidateBest = new Array<SimMove | null>(this.pool.length).fill(null);
			const column = this.pool.map((entry, i) => {
				const opponent =
					entry.poke === candidate.poke
						? this.createPokemon(candidate.entry.speciesId, candidate.entry.moveset)
						: candidate.poke;
				const { rating } = this.simulateMatchup(battle, entry.poke, opponent);
				candidateBest[i] = entry.poke.bestChargedMove;
				return rating;
			});

			for (let slot = 0; slot < team.length; slot++) {
				const threatScore = scoreTeam(
					(i) => base[i].map((r, k) => (k === slot ? column[i] : r)),
					// The swapped team's last member is what every pool Pokémon faced last.
					slot === last ? (i) => candidateBest[i] : (i) => baseBest[i][last]
				);
				picks.push({
					slot,
					speciesId: candidate.entry.speciesId,
					moveset: candidate.entry.moveset,
					threatScore,
					delta: threatScore - currentScore,
				});
			}

			options.onProgress?.(ci + 1, candidates.length);
		});

		battle.clearPokemon();

		return picks.sort((a, b) => a.threatScore - b.threatScore);
	}

	/** The swaps that lower (or at worst keep) the threat score: the best slot for each candidate, best first. */
	suggest(team: ReadonlyArray<TeamSlot>, options: { candidates?: number; results?: number } = {}): Array<AlternativePick> {
		const seen = new Set<string>();
		return this.swaps(team, options.candidates === undefined ? {} : { candidates: options.candidates })
			.filter((p) => (seen.has(p.speciesId) ? false : (seen.add(p.speciesId), true)))
			.filter((p) => p.delta <= 0)
			.slice(0, options.results ?? 4);
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
		const battle = new SimBattle();
		const poolSize = this.pool.length;

		// One column per candidate: every pool entry's rating against it, and that rating's threat-ordering score.
		const ratings: Array<Float64Array> = [];
		const scores: Array<Float64Array> = [];
		// Which charged move each pool Pokémon ends up treating as its best after facing this candidate (see below).
		const bestMoves: Array<Array<SimMove | null>> = [];
		candidateIds.forEach((id, k) => {
			const entry = this.rankingById.get(id);
			if (!entry) throw new Error(`Unknown candidate: ${id}`);
			const candidate = this.createPokemon(
				id,
				entry.moveset.filter((m) => m !== 'none')
			);
			const ratingColumn = new Float64Array(poolSize);
			const scoreColumn = new Float64Array(poolSize);
			const bestColumn = new Array<SimMove | null>(poolSize);
			this.pool.forEach((row, i) => {
				const { rating } = this.simulateMatchup(battle, row.poke, candidate);
				ratingColumn[i] = rating;
				scoreColumn[i] = this.matchupScore(rating, row.inMeta);
				bestColumn[i] = row.poke.bestChargedMove;
			});
			ratings.push(ratingColumn);
			scores.push(scoreColumn);
			bestMoves.push(bestColumn);
			onProgress?.(k + 1, candidateIds.length);
		});
		battle.clearPokemon();

		const base = candidateIds.map((id) => id.replace('_shadow', ''));
		const out: Array<RankedTeamThreat> = [];
		const order = new Array<number>(poolSize);
		const rows = new Array<{ entry: PoolEntry; rating: number; score: number }>(poolSize);

		for (let a = 0; a < candidateIds.length; a++) {
			for (let b = a + 1; b < candidateIds.length; b++) {
				if (base[b] === base[a]) continue;
				for (let c = b + 1; c < candidateIds.length; c++) {
					if (base[c] === base[a] || base[c] === base[b]) continue;

					const score = new Float64Array(poolSize);
					for (let i = 0; i < poolSize; i++) {
						score[i] = (scores[a][i] + scores[b][i] + scores[c][i]) / 3;
						order[i] = i;
					}
					// Best threat first; ties keep pool order, as `evaluate`'s stable sort does.
					order.sort((x, y) => score[y] - score[x] || x - y);

					for (let r = 0; r < poolSize; r++) {
						const i = order[r];
						rows[r] = {
							entry: this.pool[i],
							rating: Math.floor((ratings[a][i] + ratings[b][i] + ratings[c][i]) / 3),
							score: score[i],
						};
					}
					// A Pokémon's "best charged move" — which the threat similarity traits read — depends on the opponent it
					// last faced (PvPoke's own quirk). `evaluate` leaves every pool Pokémon having last faced the team's third
					// member, so put that state back rather than whichever candidate happened to be simulated last.
					for (let i = 0; i < poolSize; i++) {
						this.pool[i].poke.bestChargedMove = bestMoves[c][i];
						this.pool[i].cachedTraits = undefined;
					}

					out.push({
						speciesIds: [candidateIds[a], candidateIds[b], candidateIds[c]],
						threatScore: this.pickThreats(rows).threatScore,
					});
				}
			}
		}

		return out;
	}
}

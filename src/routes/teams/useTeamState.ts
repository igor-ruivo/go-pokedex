import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { TeamLeague } from '../../DTOs/ITeamBuilder';
import { LEAGUE_CP } from '../../lib/pvp-sim/context';
import { cpAt } from '../../lib/pvp-sim/cp';
import { decodeTeam, encodeTeam, type SlotIvs, type TeamSlotDescriptor } from '../../lib/team-analysis';
import { forgetTeam, lastTeamFor, rememberTeam } from './team-memory';
import type { TeamsData } from './useTeamsData';

const MAX_TEAM = 3;

/**
 * The team being edited, kept in the URL (`?t=azumarill-BUBBLE-ICE_BEAM-PLAY_ROUGH,…`)
 * so any team is a shareable link and the back button undoes an edit. Only
 * species that exist in the current league's ranking survive decoding — a
 * stale or hand-edited link degrades to whatever part of it is still valid.
 */
/**
 * @param restore whether this is the view that shows the team (the builder): only then is the remembered team put
 *                back in the URL when it is missing
 */
export const useTeamState = (data: TeamsData, league: TeamLeague, restore = true) => {
	const [params, setParams] = useSearchParams();
	const raw = params.get('t');

	const team = useMemo<Array<TeamSlotDescriptor>>(() => {
		if (!data.ready) return [];
		const { builder } = data;
		// A level that would put the Pokémon over the league's CP cap (a hand-edited or old link) is dropped: the level then
		// follows the cap again.
		const withinCap = (slot: TeamSlotDescriptor) => {
			if (slot.level === undefined) return true;
			const spread = builder?.ivs[slot.speciesId]?.[league];
			const ivs = slot.ivs ?? (spread ? ([spread[1], spread[2], spread[3]] as SlotIvs) : undefined);
			const base = data.gamemaster[slot.speciesId]?.baseStats;
			return !ivs || !base || cpAt(base, ivs, slot.level) <= LEAGUE_CP[league];
		};
		return decodeTeam(raw)
			.filter(
				(slot) =>
					data.rankList[slot.speciesId] &&
					data.gamemaster[slot.speciesId] &&
					slot.moveset.every((m) => builder?.moves[m])
			)
			.map((slot) => (withinCap(slot) ? slot : { speciesId: slot.speciesId, moveset: slot.moveset, ...(slot.ivs ? { ivs: slot.ivs } : {}) }));
	}, [raw, data, league]);

	const write = useCallback(
		(next: ReadonlyArray<TeamSlotDescriptor>) => {
			const nextParams = new URLSearchParams(params);
			if (next.length) {
				nextParams.set('t', encodeTeam(next));
				rememberTeam(league, encodeTeam(next));
			} else {
				nextParams.delete('t');
				// Emptied on purpose: don't bring the old team back next time.
				forgetTeam(league);
			}
			setParams(nextParams, { replace: true });
		},
		[params, setParams, league]
	);

	// A team that arrives in the URL (an edit, a shared link, a click in Top teams) is the last team picked…
	useEffect(() => {
		if (data.ready && team.length > 0) rememberTeam(league, encodeTeam(team));
	}, [data.ready, team, league]);

	// …and being on the builder without a team in the URL — a fresh visit, or back from the Top teams tab, whose
	// links carry no team — picks that one up again. An emptied team was forgotten, so it can't come back.
	useEffect(() => {
		if (!restore || !data.ready || raw) return;
		const remembered = lastTeamFor(league);
		if (!remembered) return;
		const nextParams = new URLSearchParams(params);
		nextParams.set('t', remembered);
		setParams(nextParams, { replace: true });
		// `params` is read, not watched: this reacts to the team going missing, not to other parameters changing.
	}, [restore, data.ready, league, raw]);

	/** A species' recommended moveset for this league (PvPoke's own pick), as `[fast, charged 1, charged 2?]`. */
	const recommendedMoveset = useCallback(
		(speciesId: string): Array<string> =>
			(data.rankList[speciesId]?.moveset ?? []).filter((m) => m !== 'none').slice(0, 3),
		[data.rankList]
	);

	/** Puts `speciesId` (with its recommended moves) in `index`, replacing what was there or appending. */
	const setMember = useCallback(
		(index: number, speciesId: string) => {
			const next = [...team];
			next[Math.min(index, next.length)] = { speciesId, moveset: recommendedMoveset(speciesId) };
			write(next.slice(0, MAX_TEAM));
		},
		[team, write, recommendedMoveset]
	);

	/** Sets one move of one member: `moveIndex` 0 is the Fast Move, 1 and 2 the Charged Moves. */
	const setMove = useCallback(
		(index: number, moveIndex: number, moveId: string) => {
			const next = team.map((slot, i) => {
				if (i !== index) return slot;
				const moveset = [...slot.moveset];
				moveset[moveIndex] = moveId;
				// The same Charged Move can't be fielded twice: picking one a teammate slot already holds drops that slot.
				if (moveIndex > 0) {
					const other = moveIndex === 1 ? 2 : 1;
					if (moveset[other] === moveId) moveset.splice(other, 1);
				}
				return { ...slot, moveset };
			});
			write(next);
		},
		[team, write]
	);

	/** A species' best (rank-1) IVs for this league — what a Pokémon without picked IVs is rated with. */
	const defaultIvs = useCallback(
		(speciesId: string): SlotIvs | undefined => {
			const spread = data.builder?.ivs[speciesId]?.[league];
			return spread ? [spread[1], spread[2], spread[3]] : undefined;
		},
		[data.builder, league]
	);

	/**
	 * Picks the IVs and the level of one member. `undefined` puts one back to its default (for the IVs, the league's best
	 * spread itself counts as the default; the level then follows the CP cap).
	 */
	const setBuild = useCallback(
		(index: number, build: { ivs: SlotIvs | undefined; level: number | undefined }) => {
			const target = team[index];
			if (target && build.level !== undefined) {
				// Refused: the level would put the Pokémon over the league's CP cap with these IVs.
				const effectiveIvs = build.ivs ?? defaultIvs(target.speciesId);
				const base = data.gamemaster[target.speciesId]?.baseStats;
				if (effectiveIvs && base && cpAt(base, effectiveIvs, build.level) > LEAGUE_CP[league]) return;
			}
			const next = team.map((slot, i) => {
				if (i !== index) return slot;
				const best = defaultIvs(slot.speciesId);
				const ivs = build.ivs && !best?.every((n, k) => n === build.ivs?.[k]) ? build.ivs : undefined;
				return {
					speciesId: slot.speciesId,
					moveset: slot.moveset,
					...(ivs ? { ivs } : {}),
					...(build.level !== undefined ? { level: build.level } : {}),
				};
			});
			write(next);
		},
		[team, write, defaultIvs, data.gamemaster, league]
	);

	const removeMember = useCallback((index: number) => write(team.filter((_, i) => i !== index)), [team, write]);

	const replaceTeam = useCallback((next: ReadonlyArray<TeamSlotDescriptor>) => write(next), [write]);

	// The remembered team is on its way into the URL (the effect above applies it a moment after the page renders):
	// until then the page shows a spinner, not the empty "pick three Pokémon" state.
	const restoring = restore && data.ready && !raw && lastTeamFor(league) !== undefined;

	return { team, setMember, setMove, setBuild, defaultIvs, removeMember, replaceTeam, recommendedMoveset, restoring };
};

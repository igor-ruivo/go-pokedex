import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { decodeTeam, encodeTeam, type TeamSlotDescriptor } from '../../lib/team-analysis';
import type { TeamsData } from './useTeamsData';

const MAX_TEAM = 3;

/**
 * The team being edited, kept in the URL (`?t=azumarill-BUBBLE-ICE_BEAM-PLAY_ROUGH,…`)
 * so any team is a shareable link and the back button undoes an edit. Only
 * species that exist in the current league's ranking survive decoding — a
 * stale or hand-edited link degrades to whatever part of it is still valid.
 */
export const useTeamState = (data: TeamsData) => {
	const [params, setParams] = useSearchParams();
	const raw = params.get('t');

	const team = useMemo<Array<TeamSlotDescriptor>>(() => {
		if (!data.ready) return [];
		const { builder } = data;
		return decodeTeam(raw).filter(
			(slot) =>
				data.rankList[slot.speciesId] && data.gamemaster[slot.speciesId] && slot.moveset.every((m) => builder?.moves[m])
		);
	}, [raw, data]);

	const write = useCallback(
		(next: ReadonlyArray<TeamSlotDescriptor>) => {
			const nextParams = new URLSearchParams(params);
			if (next.length) nextParams.set('t', encodeTeam(next));
			else nextParams.delete('t');
			setParams(nextParams, { replace: true });
		},
		[params, setParams]
	);

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

	const removeMember = useCallback((index: number) => write(team.filter((_, i) => i !== index)), [team, write]);

	const replaceTeam = useCallback((next: ReadonlyArray<TeamSlotDescriptor>) => write(next), [write]);

	return { team, setMember, setMove, removeMember, replaceTeam, recommendedMoveset };
};

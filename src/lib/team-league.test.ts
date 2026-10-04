import { describe, expect, it } from 'vitest';

import { isStaticLeague } from '../DTOs/ILeagueDefinition';
import { isTeamLeague } from '../DTOs/ITeamBuilder';
import { extraLeagues } from '../queries/leagues';
import { resolveTeamLeague } from './team-league';

const cups = [{ id: 'little-500' }, { id: 'mega-1500' }];
const all = [{ id: 'great' }, { id: 'ultra' }, { id: 'master' }, ...cups];

describe('resolveTeamLeague', () => {
	it('shows a permanent league straight away, even before leagues.json has loaded', () => {
		for (const id of ['great', 'ultra', 'master']) {
			expect(resolveTeamLeague(id, [], false)).toEqual({ league: id, pending: false });
		}
	});

	it('waits for leagues.json when the wanted league is a cup, instead of flashing Great League', () => {
		expect(resolveTeamLeague('little-500', [], false)).toEqual({ league: 'great', pending: true });
	});

	it('shows a cup that is active once the file has loaded', () => {
		expect(resolveTeamLeague('little-500', all, true)).toEqual({ league: 'little-500', pending: false });
		expect(resolveTeamLeague('mega-1500', all, true)).toEqual({ league: 'mega-1500', pending: false });
	});

	it('falls back to Great League for a cup that is no longer active', () => {
		expect(resolveTeamLeague('retro-1500', all, true)).toEqual({ league: 'great', pending: false });
	});

	it('falls back to Great League when nothing is asked for', () => {
		expect(resolveTeamLeague(null, all, true)).toEqual({ league: 'great', pending: false });
		expect(resolveTeamLeague(undefined, [], false)).toEqual({ league: 'great', pending: false });
		expect(resolveTeamLeague('', all, true)).toEqual({ league: 'great', pending: false });
	});
});

describe('league ids', () => {
	it('knows the permanent leagues', () => {
		expect(['great', 'ultra', 'master'].every(isStaticLeague)).toBe(true);
		expect(isStaticLeague('little-500')).toBe(false);
		expect(isStaticLeague('raid')).toBe(false);
	});

	it('takes any non-empty string as a possible league, leaving the check to leagues.json', () => {
		expect(isTeamLeague('little-500')).toBe(true);
		expect(isTeamLeague('')).toBe(false);
		expect(isTeamLeague(null)).toBe(false);
		expect(isTeamLeague(undefined)).toBe(false);
	});

	it('lists the cups beyond the permanent three', () => {
		expect(
			extraLeagues(all.map((l) => ({ ...l, title: '', cpCap: 1500, icon: '', rankingFile: '' }))).map((l) => l.id)
		).toEqual(['little-500', 'mega-1500']);
	});
});

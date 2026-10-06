import { describe, expect, it } from 'vitest';

import { slotIdentityKey, type SlotIvs, type TeamSlotDescriptor } from './team-analysis';
import {
	applyBuild,
	type BuildContext,
	buildHighlight,
	isUnrecommendedMove,
	ivsChange,
	levelChange,
	levelInputState,
	movesAreRecommended,
	nicknamesByBuild,
	pickerBlock,
	resetChange,
	showReset,
	starterNickname,
	statusToggle,
	syncedNickname,
} from './team-build';

const moveset = ['A', 'B', 'C'];
const slot = (speciesId: string, extra: Partial<TeamSlotDescriptor> = {}): TeamSlotDescriptor => ({
	speciesId,
	moveset,
	...extra,
});

const bestIvs: Record<string, SlotIvs> = { azumarill: [0, 15, 15], medicham: [5, 15, 15], venusaur_mega: [15, 15, 15] };
const context: BuildContext = {
	isSuperMegaSpecies: (id) => id === 'venusaur_mega',
	defaultIvs: (id) => bestIvs[id],
};

describe('statusToggle — the Best Buddy and Super Max Mega buttons', () => {
	const target = { ivs: [4, 15, 15] as SlotIvs, level: 50.5 };

	it('turns the Best Buddy on with the best spread and level at the new ceiling', () => {
		expect(statusToggle('buddy', { buddy: true, superMega: false }, target)).toEqual({
			ivs: [4, 15, 15],
			level: 50.5,
			buddy: true,
		});
	});

	it('leaves the level to the CP cap when the best level is not above 50', () => {
		expect(statusToggle('buddy', { buddy: true, superMega: false }, { ivs: [0, 15, 15], level: 45.5 })).toEqual({
			ivs: [0, 15, 15],
			level: undefined,
			buddy: true,
		});
	});

	it('turns the Super Max Mega on with the best spread and level at ceiling 52', () => {
		expect(statusToggle('superMega', { buddy: false, superMega: true }, { ivs: [15, 15, 15], level: 52 })).toEqual({
			ivs: [15, 15, 15],
			level: 52,
			superMega: true,
		});
	});

	it('takes both to 53 when the second is pressed after the first, each button touching only its own status', () => {
		const first = statusToggle('superMega', { buddy: false, superMega: true }, { ivs: [15, 15, 15], level: 52 })!;
		expect(first).not.toHaveProperty('buddy');
		const second = statusToggle('buddy', { buddy: true, superMega: true }, { ivs: [15, 15, 15], level: 53 })!;
		expect(second).toEqual({ ivs: [15, 15, 15], level: 53, buddy: true });
		expect(second).not.toHaveProperty('superMega');
	});

	it('goes back to the defaults when the last status is turned off', () => {
		expect(statusToggle('buddy', { buddy: false, superMega: false }, target)).toEqual({
			ivs: undefined,
			level: undefined,
			buddy: false,
		});
		expect(statusToggle('superMega', { buddy: false, superMega: false }, undefined)).toEqual({
			ivs: undefined,
			level: undefined,
			superMega: false,
		});
	});

	it('goes back to the best at the lower ceiling when the other status is still on', () => {
		expect(statusToggle('buddy', { buddy: false, superMega: true }, { ivs: [15, 15, 15], level: 52 })).toEqual({
			ivs: [15, 15, 15],
			level: 52,
			buddy: false,
		});
	});

	it('does nothing while the best spread is not known yet', () => {
		expect(statusToggle('buddy', { buddy: true, superMega: false }, undefined)).toBeUndefined();
	});

	describe('once the IVs or the level were touched (kept)', () => {
		const touched = { ivs: [1, 2, 3] as SlotIvs, level: 40 };

		it('turns a status on without resetting anything, even before the best spread is known', () => {
			expect(statusToggle('buddy', { buddy: true, superMega: false }, target, touched)).toEqual({
				ivs: [1, 2, 3],
				level: 40,
				buddy: true,
			});
			expect(statusToggle('superMega', { buddy: false, superMega: true }, undefined, touched)).toEqual({
				ivs: [1, 2, 3],
				level: 40,
				superMega: true,
			});
		});

		it('turns a status off keeping the IVs and a level that is still allowed', () => {
			expect(statusToggle('buddy', { buddy: false, superMega: false }, target, touched)).toEqual({
				ivs: [1, 2, 3],
				level: 40,
				buddy: false,
			});
			expect(statusToggle('buddy', { buddy: false, superMega: true }, target, { ivs: [1, 2, 3], level: 52 })).toEqual({
				ivs: [1, 2, 3],
				level: 52,
				buddy: false,
			});
		});

		it('brings a level above the new ceiling down to it', () => {
			expect(statusToggle('buddy', { buddy: false, superMega: false }, target, { ivs: [1, 2, 3], level: 51 })).toEqual({
				ivs: [1, 2, 3],
				level: 50,
				buddy: false,
			});
			expect(
				statusToggle('superMega', { buddy: true, superMega: false }, target, { ivs: undefined, level: 53 })
			).toEqual({
				ivs: undefined,
				level: 51,
				superMega: false,
			});
		});

		it('keeps a level that follows the CP cap (none picked) as it is', () => {
			expect(
				statusToggle('buddy', { buddy: false, superMega: false }, target, { ivs: [1, 2, 3], level: undefined })
			).toEqual({
				ivs: [1, 2, 3],
				level: undefined,
				buddy: false,
			});
		});
	});
});

describe('applyBuild — the team after a build change', () => {
	const team = [slot('azumarill'), slot('medicham'), slot('venusaur_mega')];

	it('sets IVs, level and the Best Buddy status of one member and leaves the others', () => {
		const next = applyBuild(team, 1, { ivs: [4, 15, 15], level: 50.5, buddy: true }, context)!;
		expect(next[1]).toEqual(slot('medicham', { ivs: [4, 15, 15], level: 50.5, buddy: true }));
		expect(next[0]).toEqual(team[0]);
		expect(next[2]).toEqual(team[2]);
	});

	it('lets only one Pokémon per team be a Best Buddy: the new one takes it, the old one goes back to the defaults', () => {
		const withBuddy = [slot('azumarill', { ivs: [1, 15, 15], level: 51, buddy: true }), slot('medicham')];
		const next = applyBuild(withBuddy, 1, { ivs: [4, 15, 15], level: 50.5, buddy: true }, context)!;
		expect(next[0]).toEqual(slot('azumarill'));
		expect(next[1]).toEqual(slot('medicham', { ivs: [4, 15, 15], level: 50.5, buddy: true }));
		expect(next.filter((s) => s.buddy)).toHaveLength(1);
	});

	it('keeps the buddy of a team when another member is changed without the ribbon', () => {
		const withBuddy = [slot('azumarill', { level: 51, buddy: true }), slot('medicham')];
		const next = applyBuild(withBuddy, 1, { ivs: [5, 15, 14], level: undefined }, context)!;
		expect(next[0]).toEqual(withBuddy[0]);
	});

	it('gives the Super Max Mega status only to a species that can be one', () => {
		expect(applyBuild(team, 2, { ivs: undefined, level: 52, superMega: true }, context)![2]).toEqual(
			slot('venusaur_mega', { level: 52, superMega: true })
		);
		expect(applyBuild(team, 0, { ivs: undefined, level: undefined, superMega: true }, context)![0]).toEqual(
			slot('azumarill')
		);
	});

	it('refuses a level beyond what the statuses allow', () => {
		expect(applyBuild(team, 0, { ivs: undefined, level: 51 }, context)).toBeUndefined();
		expect(applyBuild(team, 0, { ivs: undefined, level: 51, buddy: true }, context)).toBeDefined();
		expect(applyBuild(team, 2, { ivs: undefined, level: 52.5, superMega: true }, context)).toBeUndefined();
		expect(applyBuild(team, 2, { ivs: undefined, level: 53, superMega: true, buddy: true }, context)).toBeDefined();
		expect(applyBuild(team, 2, { ivs: undefined, level: 53.5, superMega: true, buddy: true }, context)).toBeUndefined();
	});

	it('does not refuse a build for the league’s CP cap: the card shows it in red', () => {
		expect(applyBuild([slot('azumarill')], 0, { ivs: [15, 15, 15], level: 50 }, context)![0]).toEqual(
			slot('azumarill', { ivs: [15, 15, 15], level: 50 })
		);
	});

	it('leaves out IVs that are the league’s best spread, and a status that was not asked for stays as it is', () => {
		const next = applyBuild(
			[slot('medicham', { level: 51, buddy: true })],
			0,
			{ ivs: [5, 15, 15], level: 51 },
			context
		)!;
		expect(next[0]).toEqual(slot('medicham', { level: 51, buddy: true }));
	});

	it('keeps a Super Max Mega status that the change does not mention', () => {
		const sup = [slot('venusaur_mega', { level: 52, superMega: true })];
		const next = applyBuild(sup, 0, { ivs: [14, 15, 15], level: 52 }, context)!;
		expect(next[0]).toEqual(slot('venusaur_mega', { ivs: [14, 15, 15], level: 52, superMega: true }));
	});

	it('turns a status off when asked to', () => {
		const sup = [slot('venusaur_mega', { level: 52, superMega: true })];
		expect(applyBuild(sup, 0, { ivs: undefined, level: undefined, superMega: false }, context)![0]).toEqual(
			slot('venusaur_mega')
		);
	});
});

describe('typing a level', () => {
	const typed = (typedLevel: number, max = 52, buddyMax = 53) =>
		levelInputState({ typed: typedLevel, maxLevel: max, buddyMaxLevel: buddyMax });

	it('takes a level above 50 for a Super Max Mega species even when the status is off, and switches the status on', () => {
		expect(typed(51).valid).toBe(true);
		expect(typed(52).valid).toBe(true);
		const change = levelChange(52, undefined, { isSuperMega: true }, false);
		expect(change).toEqual({ ivs: undefined, level: 52, superMega: true });
		expect(change).not.toHaveProperty('buddy');
		expect(levelChange(51, undefined, { isSuperMega: true }, false)).toEqual({
			ivs: undefined,
			level: 51,
			superMega: true,
		});
	});

	it('takes the Best Buddy status along only past what the Super Max Mega status reaches', () => {
		expect(levelChange(52.5, undefined, { isSuperMega: true }, true)).toEqual({
			ivs: undefined,
			level: 52.5,
			superMega: true,
			buddy: true,
		});
		expect(levelChange(52, undefined, { isSuperMega: true }, true)).not.toHaveProperty('buddy');
	});

	it('leaves the statuses alone for a level up to 50, and for a Pokémon that cannot be a Super Max Mega', () => {
		expect(levelChange(40, [1, 2, 3], { isSuperMega: true }, false)).toEqual({ ivs: [1, 2, 3], level: 40 });
		expect(levelChange(undefined, [1, 2, 3], { isSuperMega: false }, false)).toEqual({
			ivs: [1, 2, 3],
			level: undefined,
		});
		// resetting the level of a Super Max Mega keeps its status
		expect(levelChange(undefined, undefined, { isSuperMega: true }, true)).toEqual({
			ivs: undefined,
			level: undefined,
			superMega: true,
		});
	});

	it('refuses a level above 50 for any other Pokémon, asking for the Best Buddy status instead of switching it on', () => {
		const other = (level: number) => typed(level, 50, 51);
		expect(other(50).valid).toBe(true);
		expect(other(50.5)).toEqual({ valid: false, needsBuddy: true });
		expect(other(51)).toEqual({ valid: false, needsBuddy: true });
		// the Pokémon that is a Best Buddy can go to 51
		expect(typed(51, 51, 51)).toEqual({ valid: true, needsBuddy: false });
	});

	it('is not a level beyond the highest there is, nor a half-step off', () => {
		expect(typed(53.5)).toEqual({ valid: false, needsBuddy: false });
		expect(typed(50.25)).toEqual({ valid: false, needsBuddy: false });
		expect(typed(NaN)).toEqual({ valid: false, needsBuddy: false });
	});

	it('asks for the Best Buddy status for 53 on a Super Max Mega that is not one', () => {
		expect(typed(52.5)).toEqual({ valid: false, needsBuddy: true });
		expect(typed(53)).toEqual({ valid: false, needsBuddy: true });
	});
});

describe('resetting', () => {
	const sup = slot('venusaur_mega', { ivs: [14, 15, 15], level: 52, superMega: true });

	it('IVs: puts the IVs back and leaves the level alone', () => {
		const change = ivsChange(sup, undefined);
		expect(change).toEqual({ ivs: undefined, level: 52 });
		const next = applyBuild([sup], 0, change, context)!;
		expect(next[0]).toEqual(slot('venusaur_mega', { level: 52, superMega: true }));
	});

	it('IVs: a typed spread leaves an untouched level following the cap, and keeps a picked one', () => {
		expect(ivsChange({}, [1, 2, 3])).toEqual({ ivs: [1, 2, 3], level: undefined });
		expect(ivsChange({ level: 40 }, [1, 2, 3])).toEqual({ ivs: [1, 2, 3], level: 40 });
	});

	it('level: puts the level back and leaves the IVs alone', () => {
		const change = levelChange(undefined, sup.ivs, { isSuperMega: true }, true);
		const next = applyBuild([sup], 0, change, context)!;
		expect(next[0]).toEqual(slot('venusaur_mega', { ivs: [14, 15, 15], superMega: true }));
	});

	it('goes to the best spread and its level for a Best Buddy or Super Max Mega, the defaults otherwise', () => {
		const best = { ivs: [15, 15, 15] as SlotIvs, level: 52 };
		expect(resetChange({ buddy: false, superMega: true }, best)).toEqual({ ivs: [15, 15, 15], level: 52 });
		expect(resetChange({ buddy: true, superMega: false }, { ivs: [4, 15, 15], level: 50.5 })).toEqual({
			ivs: [4, 15, 15],
			level: 50.5,
		});
		expect(resetChange({ buddy: false, superMega: false }, best)).toEqual({ ivs: undefined, level: undefined });
		// a best level that is not above 50 is the CP cap’s own: nothing to reset the level to
		expect(resetChange({ buddy: true, superMega: false }, { ivs: [0, 15, 15], level: 45.5 }).level).toBeUndefined();
		expect(resetChange({ buddy: true, superMega: false }, undefined)).toEqual({ ivs: undefined, level: undefined });
	});

	it('resets the IVs and the level together, in one change the page accepts', () => {
		const stray = slot('venusaur_mega', { ivs: [1, 2, 3], level: 40, superMega: true });
		const change = resetChange({ buddy: false, superMega: true }, { ivs: [15, 15, 15], level: 52 });
		expect(applyBuild([stray], 0, change, context)![0]).toEqual(slot('venusaur_mega', { level: 52, superMega: true }));
	});
});

describe('resetting the moves too', () => {
	const recommended = ['BUBBLE', 'ICE_BEAM', 'PLAY_ROUGH'];

	it('asks for the recommended moves along with the IVs and level', () => {
		expect(resetChange({ buddy: false, superMega: false }, undefined, recommended)).toEqual({
			ivs: undefined,
			level: undefined,
			moveset: recommended,
		});
		expect(resetChange({ buddy: false, superMega: false }, undefined)).not.toHaveProperty('moveset');
	});

	it('puts the moves of the member back in the same change', () => {
		const stray = slot('azumarill', { moveset: ['X', 'Y', 'Z'], ivs: [1, 2, 3], level: 40 });
		const next = applyBuild(
			[stray],
			0,
			resetChange({ buddy: false, superMega: false }, undefined, recommended),
			context
		)!;
		expect(next[0]).toEqual(slot('azumarill', { moveset: recommended }));
	});

	it('knows the recommended moves in either order of the Charged Moves, and nothing to compare against', () => {
		expect(movesAreRecommended(['BUBBLE', 'PLAY_ROUGH', 'ICE_BEAM'], recommended)).toBe(true);
		expect(movesAreRecommended(['BUBBLE', 'ICE_BEAM', 'AQUA_TAIL'], recommended)).toBe(false);
		expect(movesAreRecommended(['BUBBLE', 'ICE_BEAM'], recommended)).toBe(false);
		expect(movesAreRecommended(['BUBBLE', 'ICE_BEAM'], [])).toBe(true);
		expect(movesAreRecommended(['BUBBLE', 'ICE_BEAM', 'none'], ['BUBBLE', 'ICE_BEAM', 'none'])).toBe(true);
	});
});

describe('when Reset is offered', () => {
	it('is offered when either the IVs or the level are not the best', () => {
		expect(showReset({ ivsOptimal: false, levelOptimal: true })).toBe(true);
		expect(showReset({ ivsOptimal: true, levelOptimal: false })).toBe(true);
		expect(showReset({ ivsOptimal: false, levelOptimal: false })).toBe(true);
	});

	it('is offered when only the moves are not the recommended ones', () => {
		expect(showReset({ ivsOptimal: true, levelOptimal: true, movesOptimal: false })).toBe(true);
	});

	it('is not offered when everything is the best', () => {
		expect(showReset({ ivsOptimal: true, levelOptimal: true })).toBe(false);
		expect(showReset({ ivsOptimal: true, levelOptimal: true, movesOptimal: true })).toBe(false);
	});
});

describe('how a member’s build is highlighted on the card', () => {
	it('flags picked IVs that are not the best as custom (blue)', () => {
		expect(buildHighlight({ ivsPicked: true, ivsOptimal: false, level: undefined, levelOptimal: false })).toEqual({
			showLevel: false,
			custom: true,
		});
	});

	it('does not flag picked IVs that are the best, nor defaults', () => {
		expect(buildHighlight({ ivsPicked: true, ivsOptimal: true, level: undefined, levelOptimal: false }).custom).toBe(
			false
		);
		expect(buildHighlight({ ivsPicked: false, ivsOptimal: false, level: undefined, levelOptimal: false }).custom).toBe(
			false
		);
	});

	it('shows a level that was changed, and flags it', () => {
		expect(buildHighlight({ ivsPicked: false, ivsOptimal: true, level: 45, levelOptimal: false })).toEqual({
			showLevel: true,
			custom: true,
		});
	});

	it('does not show a level that is the best for the Pokémon, nor one that follows the cap', () => {
		expect(buildHighlight({ ivsPicked: false, ivsOptimal: true, level: 52, levelOptimal: true })).toEqual({
			showLevel: false,
			custom: false,
		});
		expect(
			buildHighlight({ ivsPicked: false, ivsOptimal: true, level: undefined, levelOptimal: false }).showLevel
		).toBe(false);
	});
});

describe('nicknames and the rank of the IVs', () => {
	it('keeps a trailing rank in step with the IVs', () => {
		expect(syncedNickname('Azumarill#12', 3)).toBe('Azumarill#3');
		// a rank typed after a space is attached to the name too
		expect(syncedNickname('Azumarill #12', 3)).toBe('Azumarill#3');
		expect(syncedNickname('Azumarill#3', 3)).toBeUndefined();
	});

	it('leaves a nickname with no rank, or a rank not known yet, alone', () => {
		expect(syncedNickname('My best one', 3)).toBeUndefined();
		expect(syncedNickname('Azumarill #12', undefined)).toBeUndefined();
		expect(syncedNickname(undefined, 3)).toBeUndefined();
		expect(syncedNickname('Rank #1 pick', 4)).toBeUndefined();
	});

	it('starts a nickname as the name with the rank, within 32 characters', () => {
		expect(starterNickname('Azumarill', 12)).toBe('Azumarill#12');
		expect(starterNickname('Azumarill', undefined)).toBe('Azumarill');
		expect(starterNickname('A'.repeat(40), 1)).toHaveLength(32);
	});
});

describe('moves', () => {
	it('warns about a move the ranking does not recommend', () => {
		const recommended = ['BUBBLE', 'ICE_BEAM', 'PLAY_ROUGH'];
		expect(isUnrecommendedMove('BUBBLE', recommended)).toBe(false);
		expect(isUnrecommendedMove('AQUA_TAIL', recommended)).toBe(true);
		expect(isUnrecommendedMove('BUBBLE', [])).toBe(true);
	});
});

describe('nicknamesByBuild', () => {
	const entry = (extra: object, nickname?: string) => ({
		...slot('azumarill'),
		...extra,
		...(nickname ? { nickname } : {}),
	});

	it('ties a nickname to the build it names: species, moves, IVs and level', () => {
		const names = nicknamesByBuild([entry({ ivs: [0, 15, 15] }, 'Tank'), entry({ ivs: [1, 15, 14] }, 'Glass')]);
		expect(names[slotIdentityKey(entry({ ivs: [0, 15, 15] }))]).toBe('Tank');
		expect(names[slotIdentityKey(entry({ ivs: [1, 15, 14] }))]).toBe('Glass');
		expect(names[slotIdentityKey(entry({ ivs: [2, 2, 2] }))]).toBeUndefined();
	});

	it('does not tie it to the Best Buddy or Super Max Mega status', () => {
		const names = nicknamesByBuild([entry({ level: 51, buddy: true, superMega: true }, 'Boss')]);
		expect(names[slotIdentityKey(entry({ level: 51 }))]).toBe('Boss');
	});

	it('gives the stand-ins of an entry its nickname, and lets the first entry to name a build keep it', () => {
		const buddy = entry({ level: 51, buddy: true }, 'Buddy');
		const names = nicknamesByBuild([buddy, entry({ level: 50 }, 'Other')], (e) =>
			e === buddy ? [slot('azumarill', { level: 50, formerBuddy: true })] : []
		);
		expect(names[slotIdentityKey(entry({ level: 51 }))]).toBe('Buddy');
		expect(names[slotIdentityKey(entry({ level: 50 }))]).toBe('Buddy');
	});

	it('skips entries without a nickname', () => {
		expect(nicknamesByBuild([entry({})])).toEqual({});
	});

	it('names each of two copies of a species by its own build', () => {
		const names = nicknamesByBuild([entry({ ivs: [0, 15, 15] }, 'One'), entry({ level: 40 }, 'Two')]);
		expect(Object.values(names).sort()).toEqual(['One', 'Two']);
	});
});

describe('pickerBlock', () => {
	it('blocks a Pokémon already on the team, and says so', () => {
		expect(pickerBlock({ inTeam: true, megaTaken: false, isMega: false })).toBe('inTeam');
		expect(pickerBlock({ inTeam: true, megaTaken: true, isMega: true })).toBe('inTeam');
	});

	it('blocks a Mega once the team has one, and not anyone else', () => {
		expect(pickerBlock({ inTeam: false, megaTaken: true, isMega: true })).toBe('megaTaken');
		expect(pickerBlock({ inTeam: false, megaTaken: true, isMega: false })).toBeNull();
	});

	it('lets a Mega in while the team has none', () => {
		expect(pickerBlock({ inTeam: false, megaTaken: false, isMega: true })).toBeNull();
	});
});

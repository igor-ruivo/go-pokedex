import { describe, expect, it } from 'vitest';

import { standInsOf, type TeamSlotDescriptor } from './team-analysis';
import { slotIdentityKey } from './team-analysis';
import { chipMarks, markStates, type StandInIdentities } from './team-marks';

const moveset = ['A', 'B', 'C'];
const member = (extra: Partial<TeamSlotDescriptor> = {}): TeamSlotDescriptor => ({
	speciesId: 'venusaur_mega',
	moveset,
	...extra,
});

describe('markStates — the crown and the Super Max Mega symbol on a team card', () => {
	it('shows no mark on a plain Pokémon', () => {
		expect(markStates(member())).toEqual({ crown: null, superMega: null });
		expect(markStates(member({ level: 40 }))).toEqual({ crown: null, superMega: null });
	});

	it('shows the crown for a Best Buddy that really is above level 50', () => {
		expect(markStates(member({ level: 51, buddy: true })).crown).toBe('on');
		expect(markStates(member({ level: 50.5 })).crown).toBe('on');
	});

	it('shows the crown greyed out for a ribbon that changes nothing', () => {
		expect(markStates(member({ level: 50, buddy: true })).crown).toBe('off');
		expect(markStates(member({ buddy: true })).crown).toBe('off');
	});

	it('shows the symbol for a Super Max Mega', () => {
		expect(markStates(member({ level: 52, superMega: true }))).toEqual({ crown: null, superMega: 'on' });
	});

	it('shows both for a Best Buddy Super Max Mega at 53', () => {
		expect(markStates(member({ level: 53, buddy: true, superMega: true }))).toEqual({ crown: 'on', superMega: 'on' });
	});

	it('keeps the crown off for a Super Max Mega whose level the status alone reaches', () => {
		expect(markStates(member({ level: 52, buddy: true, superMega: true }))).toEqual({ crown: 'off', superMega: 'on' });
	});

	it('greys out what a stand-in lost', () => {
		const sup = member({ level: 53, buddy: true, superMega: true });
		const [withoutSuper, withoutBuddy, withoutBoth] = [
			standInsOf(sup).find((s) => s.formerSuperMega && !s.formerBuddy)!,
			standInsOf(sup).find((s) => s.formerBuddy && !s.formerSuperMega)!,
			standInsOf(sup).find((s) => s.formerBuddy && s.formerSuperMega)!,
		];
		expect(markStates(withoutSuper)).toEqual({ crown: 'on', superMega: 'off' });
		expect(markStates(withoutBuddy)).toEqual({ crown: 'off', superMega: 'on' });
		expect(markStates(withoutBoth)).toEqual({ crown: 'off', superMega: 'off' });
	});

	it('finds a stand-in by identity, for teams that came from the cache without the marks', () => {
		const sup = member({ level: 53, buddy: true, superMega: true });
		const stands = standInsOf(sup);
		const identities = (keep: (s: TeamSlotDescriptor) => boolean): Set<string> =>
			new Set(stands.filter(keep).map(slotIdentityKey));
		const standIns: StandInIdentities = {
			buddy: identities((s) => !!s.formerBuddy),
			superMega: identities((s) => !!s.formerSuperMega),
		};
		const cached = member({ level: 50 });
		expect(markStates(cached)).toEqual({ crown: null, superMega: null });
		expect(markStates(cached, standIns)).toEqual({ crown: 'off', superMega: 'off' });
	});
});

describe('chipMarks — the chip of a saved Pokémon', () => {
	it('shows a crown for a Best Buddy and the symbol for a Super Max Mega', () => {
		expect(chipMarks({ level: 51, buddy: true })).toEqual({ crown: true, superMega: false });
		expect(chipMarks({ level: 52, superMega: true })).toEqual({ crown: false, superMega: true });
		expect(chipMarks({ level: 53, buddy: true, superMega: true })).toEqual({ crown: true, superMega: true });
	});

	it('shows nothing for a plain Pokémon', () => {
		expect(chipMarks({})).toEqual({ crown: false, superMega: false });
		expect(chipMarks({ level: 40 })).toEqual({ crown: false, superMega: false });
	});

	it('shows the Super Max Mega symbol for a saved one even when its level does not need it', () => {
		expect(chipMarks({ level: 30, superMega: true }).superMega).toBe(true);
	});
});

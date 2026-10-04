import { exceedsNormalLevel, isBuddy, slotIdentityKey, type TeamSlotDescriptor } from './team-analysis';

/** `on`: the status is really in use; `off`: shown greyed out; `null`: no mark at all. */
export type MarkState = 'on' | 'off' | null;

/** The identities of the stand-ins (see `standInsOf`), by what each lost. */
export interface StandInIdentities {
	buddy: ReadonlySet<string>;
	superMega: ReadonlySet<string>;
}

/**
 * Which marks a Pokémon wears on a team card: the Best Buddy crown and the Super Max Mega symbol (stacked under it).
 * - The crown is on only for a member that really is above the level its statuses give (the team's one buddy); a ribbon that
 *   changes nothing, and the stand-in of a Best Buddy, show it greyed out.
 * - The symbol is on for a Super Max Mega; the stand-in of one shows it greyed out.
 * Stand-ins are matched by identity, so they are marked whether the teams were just computed or came from the cache.
 */
export const markStates = (
	member: Pick<
		TeamSlotDescriptor,
		'speciesId' | 'moveset' | 'ivs' | 'level' | 'buddy' | 'superMega' | 'formerBuddy' | 'formerSuperMega'
	>,
	standIns?: StandInIdentities
): { crown: MarkState; superMega: MarkState } => {
	const identity = slotIdentityKey(member);
	const crown: MarkState = exceedsNormalLevel(member)
		? 'on'
		: member.buddy || member.formerBuddy || standIns?.buddy.has(identity)
			? 'off'
			: null;
	const superMega: MarkState = member.superMega
		? 'on'
		: member.formerSuperMega || standIns?.superMega.has(identity)
			? 'off'
			: null;
	return { crown, superMega };
};

/** The marks of a saved Pokémon's chip in My Pokémon: a crown for a Best Buddy, the symbol for a Super Max Mega. */
export const chipMarks = (
	entry: Pick<TeamSlotDescriptor, 'level' | 'buddy' | 'superMega'>
): { crown: boolean; superMega: boolean } => ({ crown: isBuddy(entry), superMega: entry.superMega === true });

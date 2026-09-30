import type { TFunction } from 'i18next';

import { combatMetricNames } from '../../lib/combat-text';
import type { LetterGrade, ScoreParts, ScoreTier, TeamRole } from '../../lib/team-analysis';

/**
 * Localized names/explanations for the Teams view's enums. One literal `t()`
 * per key (never a template string) so `scripts/check-i18n-parity.mjs` can
 * verify every one statically — same convention as `lib/combat-text.ts`.
 */
/** Role names are PvPoke's own combat-metric names, already translated for the Pokémon page. */
export const roleNames = (t: TFunction): Record<TeamRole, string> => {
	const names = combatMetricNames(t);
	return { lead: names.lead, switch: names.switch, closer: names.closer };
};

export const roleDescriptions = (t: TFunction): Record<TeamRole, string> => ({
	lead: t('teams:plan.roleDescs.lead'),
	switch: t('teams:plan.roleDescs.switch'),
	closer: t('teams:plan.roleDescs.closer'),
});

export const partNames = (t: TFunction): Record<keyof ScoreParts, string> => ({
	threat: t('teams:score.parts.threat.name'),
	defense: t('teams:score.parts.defense.name'),
	offense: t('teams:score.parts.offense.name'),
	bulk: t('teams:score.parts.bulk.name'),
	safety: t('teams:score.parts.safety.name'),
	consistency: combatMetricNames(t).consistency,
});

export const partDescriptions = (t: TFunction): Record<keyof ScoreParts, string> => ({
	threat: t('teams:score.parts.threat.desc'),
	defense: t('teams:score.parts.defense.desc'),
	offense: t('teams:score.parts.offense.desc'),
	bulk: t('teams:score.parts.bulk.desc'),
	safety: t('teams:score.parts.safety.desc'),
	consistency: t('teams:score.parts.consistency.desc'),
});

export const tierNames = (t: TFunction): Record<ScoreTier, string> => ({
	elite: t('teams:score.tiers.elite.name'),
	strong: t('teams:score.tiers.strong.name'),
	solid: t('teams:score.tiers.solid.name'),
	shaky: t('teams:score.tiers.shaky.name'),
	risky: t('teams:score.tiers.risky.name'),
});

export const tierSummaries = (t: TFunction): Record<ScoreTier, string> => ({
	elite: t('teams:score.tiers.elite.summary'),
	strong: t('teams:score.tiers.strong.summary'),
	solid: t('teams:score.tiers.solid.summary'),
	shaky: t('teams:score.tiers.shaky.summary'),
	risky: t('teams:score.tiers.risky.summary'),
});

export const gradeNotes = (
	t: TFunction
): Record<'coverage' | 'bulk' | 'safety' | 'consistency', Record<LetterGrade, string>> => ({
	coverage: {
		A: t('teams:grades.coverage.A'),
		B: t('teams:grades.coverage.B'),
		C: t('teams:grades.coverage.C'),
		D: t('teams:grades.coverage.D'),
		F: t('teams:grades.coverage.F'),
	},
	bulk: {
		A: t('teams:grades.bulk.A'),
		B: t('teams:grades.bulk.B'),
		C: t('teams:grades.bulk.C'),
		D: t('teams:grades.bulk.D'),
		F: t('teams:grades.bulk.F'),
	},
	safety: {
		A: t('teams:grades.safety.A'),
		B: t('teams:grades.safety.B'),
		C: t('teams:grades.safety.C'),
		D: t('teams:grades.safety.D'),
		F: t('teams:grades.safety.F'),
	},
	consistency: {
		A: t('teams:grades.consistency.A'),
		B: t('teams:grades.consistency.B'),
		C: t('teams:grades.consistency.C'),
		D: t('teams:grades.consistency.D'),
		F: t('teams:grades.consistency.F'),
	},
});

export const threatGradeNotes = (t: TFunction): Record<LetterGrade, string> => ({
	A: t('teams:threat.grades.A'),
	B: t('teams:threat.grades.B'),
	C: t('teams:threat.grades.C'),
	D: t('teams:threat.grades.D'),
	F: t('teams:threat.grades.F'),
});

export const defenseStatusNames = (
	t: TFunction
): Record<'critical' | 'shared' | 'exposed' | 'covered' | 'wall', string> => ({
	critical: t('teams:typing.status.critical'),
	shared: t('teams:typing.status.shared'),
	exposed: t('teams:typing.status.exposed'),
	covered: t('teams:typing.status.covered'),
	wall: t('teams:typing.status.wall'),
});

export const offenseStatusNames = (t: TFunction): Record<'strong' | 'neutral' | 'resisted', string> => ({
	strong: t('teams:typing.offStatus.strong'),
	neutral: t('teams:typing.offStatus.neutral'),
	resisted: t('teams:typing.offStatus.resisted'),
});

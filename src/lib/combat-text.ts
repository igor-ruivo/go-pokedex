import type { TFunction } from 'i18next';

import type { CombatMetric } from './combat';

/**
 * Localized name + explanation of each combat metric. One literal `t()` per
 * key (not a template string) so `scripts/check-i18n-parity.mjs` can verify
 * every one statically.
 */
export const combatMetricNames = (t: TFunction): Record<CombatMetric, string> => ({
	lead: t('pokemonDetail:combat.metrics.lead.name'),
	switch: t('pokemonDetail:combat.metrics.switch.name'),
	charger: t('pokemonDetail:combat.metrics.charger.name'),
	closer: t('pokemonDetail:combat.metrics.closer.name'),
	consistency: t('pokemonDetail:combat.metrics.consistency.name'),
	attacker: t('pokemonDetail:combat.metrics.attacker.name'),
});

export const combatMetricDescriptions = (t: TFunction): Record<CombatMetric, string> => ({
	lead: t('pokemonDetail:combat.metrics.lead.desc'),
	switch: t('pokemonDetail:combat.metrics.switch.desc'),
	charger: t('pokemonDetail:combat.metrics.charger.desc'),
	closer: t('pokemonDetail:combat.metrics.closer.desc'),
	consistency: t('pokemonDetail:combat.metrics.consistency.desc'),
	attacker: t('pokemonDetail:combat.metrics.attacker.desc'),
});

import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { TypeChip } from '../../components/TypeChip';
import { cleanName } from '../../lib/format';
import type { TeamWarning } from '../../lib/team-analysis';
import type { AnalyzedMember } from './useTeamAnalysis';

type Severity = 'high' | 'medium' | 'low';

const SEVERITY: Record<TeamWarning['kind'], Severity> = {
	duplicateSpecies: 'high',
	criticalWeakness: 'high',
	sharedWeakness: 'medium',
	blindSpot: 'medium',
	fragile: 'medium',
	baitDependent: 'medium',
	noLead: 'medium',
	noSafeSwitch: 'medium',
	sharedTyping: 'low',
};

const namesOf = (members: ReadonlyArray<AnalyzedMember>, indexes: ReadonlyArray<number>) =>
	indexes.map((i) => cleanName(members[i].pokemon.speciesName)).join(' + ');

/** Plain-language sentence for one warning. One literal `t()` per kind — see `teams-text.ts` for why. */
const describe = (t: TFunction, w: TeamWarning, members: ReadonlyArray<AnalyzedMember>): string => {
	switch (w.kind) {
		case 'duplicateSpecies':
			return t('teams:warnings.duplicateSpecies', { names: namesOf(members, w.members) });
		case 'criticalWeakness':
			return t('teams:warnings.criticalWeakness', { names: namesOf(members, w.members) });
		case 'sharedWeakness':
			return t('teams:warnings.sharedWeakness', { names: namesOf(members, w.members) });
		case 'sharedTyping':
			return t('teams:warnings.sharedTyping', { names: namesOf(members, w.members) });
		case 'blindSpot':
			return t('teams:warnings.blindSpot');
		case 'fragile':
			return t('teams:warnings.fragile', { name: namesOf(members, [w.member]) });
		case 'baitDependent':
			return t('teams:warnings.baitDependent', { name: namesOf(members, [w.member]) });
		case 'noLead':
			return t('teams:warnings.noLead');
		case 'noSafeSwitch':
			return t('teams:warnings.noSafeSwitch');
	}
};

const typesOf = (w: TeamWarning): Array<string> => {
	if (w.kind === 'criticalWeakness' || w.kind === 'sharedWeakness' || w.kind === 'sharedTyping') return [w.type];
	if (w.kind === 'blindSpot') return w.types;
	return [];
};

/** What to watch out for, most serious first — an empty state when there is nothing. */
export const Warnings = ({
	warnings,
	members,
}: {
	warnings: ReadonlyArray<TeamWarning>;
	members: ReadonlyArray<AnalyzedMember>;
}) => {
	const { t } = useTranslation(['teams']);

	if (warnings.length === 0) {
		return (
			<section className='r-tm-panel r-tm-warns r-tm-warns--clear'>
				<span className='r-tm-warn-ico' aria-hidden='true'>
					✓
				</span>
				<p>{t('teams:warnings.none')}</p>
			</section>
		);
	}

	const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
	const sorted = [...warnings].sort((a, b) => order[SEVERITY[a.kind]] - order[SEVERITY[b.kind]]);

	return (
		<section className='r-tm-panel'>
			<ul className='r-tm-warns'>
				{sorted.map((w, i) => (
					<li key={`${w.kind}-${i}`} data-severity={SEVERITY[w.kind]}>
						<span className='r-tm-warn-ico' aria-hidden='true'>
							{SEVERITY[w.kind] === 'high' ? '!' : SEVERITY[w.kind] === 'medium' ? '▲' : 'i'}
						</span>
						<span className='r-tm-warn-text'>
							{describe(t, w, members)}
							{typesOf(w).length > 0 && (
								<span className='r-tm-chips'>
									{typesOf(w).map((type) => (
										<TypeChip key={type} type={type} />
									))}
								</span>
							)}
						</span>
					</li>
				))}
			</ul>
		</section>
	);
};

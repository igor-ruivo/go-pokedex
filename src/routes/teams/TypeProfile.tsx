import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { TypeChip } from '../../components/TypeChip';
import { matchupCellText, matchupTier } from '../../lib/effectiveness';
import { cleanName } from '../../lib/format';
import type { DefenseProfile, OffenseProfile } from '../../lib/team-analysis';
import { typeVar } from '../../lib/types';
import { defenseStatusNames, offenseStatusNames } from './teams-text';
import type { AnalyzedMember } from './useTeamAnalysis';

type Tone = 'good' | 'bad' | 'flat';

/** Chart-cell tone: in the defensive chart a resist is good, in the offensive one a super-effective hit is. */
const toneOf = (mult: number, direction: 'defense' | 'offense'): Tone => {
	const tier = matchupTier(mult);
	if (tier === 'nn') return 'flat';
	const isUp = tier === 'se';
	return (direction === 'defense') === isUp ? 'bad' : 'good';
};

const MemberHeads = ({
	members,
	onChangePokemon,
}: {
	members: ReadonlyArray<AnalyzedMember>;
	onChangePokemon: (slot: number) => void;
}) => {
	const { t } = useTranslation(['teams']);
	return (
		<>
			{members.map((m, i) => (
				<span key={m.slot.speciesId} className='r-tm-mx-head'>
					<button
						type='button'
						style={{ ['--tc' as string]: typeVar(m.pokemon.types[0]) }}
						aria-label={t('teams:builder.change', { name: cleanName(m.pokemon.speciesName) })}
						title={t('teams:builder.replace', { name: cleanName(m.pokemon.speciesName) })}
						onClick={() => onChangePokemon(i)}
					>
						{m.pokemon.isShadow && <ShadowMark />}
						<SpriteImg pokemon={m.pokemon} loading='lazy' />
					</button>
				</span>
			))}
		</>
	);
};

const Cell = ({ mult, direction }: { mult: number; direction: 'defense' | 'offense' }) => (
	<span
		className='r-tm-mc'
		data-tone={toneOf(mult, direction)}
		data-double={mult > 2 || (mult > 0 && mult < 0.45) ? '' : undefined}
		data-none={mult === 0 ? '' : undefined}
	>
		{mult === 0 ? '–' : matchupCellText(mult)}
	</span>
);

const ChipList = ({ types }: { types: ReadonlyArray<string> }) => (
	<span className='r-tm-chips'>
		{types.map((type) => (
			<TypeChip key={type} type={type} />
		))}
	</span>
);

/**
 * Defensive and offensive typing side by side. Each row is one type; each
 * column is one teammate, so a shared weakness shows up as a run of red down
 * a column-pair and a coverage hole as a row of grey. Multipliers are Pokémon
 * GO's (×1.6 / ×0.625 / ×0.39), not the main-series 2× / ½× / 0×.
 */
export const TypeProfile = ({
	members,
	defense,
	offense,
	onChangePokemon,
}: {
	members: ReadonlyArray<AnalyzedMember>;
	defense: DefenseProfile;
	offense: OffenseProfile;
	/** Opens the Pokémon picker for that team slot. */
	onChangePokemon: (slot: number) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const defenseStatuses = defenseStatusNames(t);
	const offenseStatuses = offenseStatusNames(t);

	return (
		<div className='r-tm-typing'>
			<section className='r-tm-panel'>
				<h3 className='r-tm-sub'>{t('teams:typing.defenseHeading')}</h3>
				<ul className='r-tm-facts-list'>
					<li>
						<b>{defense.resistedTypes}</b> / 18 {t('teams:typing.resisted')}
					</li>
					{defense.critical.length > 0 && (
						<li data-severity='high'>
							{t('teams:typing.critical')} <ChipList types={defense.critical} />
						</li>
					)}
					{defense.shared.filter((ty) => !defense.critical.includes(ty)).length > 0 && (
						<li data-severity='medium'>
							{t('teams:typing.shared')}{' '}
							<ChipList types={defense.shared.filter((ty) => !defense.critical.includes(ty))} />
						</li>
					)}
					{defense.shared.length === 0 && <li className='r-tm-good'>{t('teams:typing.noSharedWeakness')}</li>}
				</ul>
				<div
					className='r-tm-mx'
					role='table'
					aria-label={t('teams:typing.defenseAria')}
					style={{ ['--cols' as string]: members.length }}
				>
					<div role='row' className='r-tm-mx-row r-tm-mx-headrow'>
						<span role='columnheader' />
						<MemberHeads members={members} onChangePokemon={onChangePokemon} />
						<span role='columnheader' className='r-tm-mx-status' />
					</div>
					{defense.rows.map((row) => (
						<div key={row.type} role='row' className='r-tm-mx-row' data-status={row.status}>
							<span role='rowheader'>
								<TypeChip type={row.type} />
							</span>
							{row.mults.map((m, i) => (
								<Cell key={members[i].slot.speciesId} mult={m} direction='defense' />
							))}
							<span role='cell' className='r-tm-mx-status' data-status={row.status} title={defenseStatuses[row.status]}>
								{row.status === 'critical'
									? '!!'
									: row.status === 'shared'
										? '!'
										: row.status === 'wall'
											? '◆'
											: row.status === 'covered'
												? '✓'
												: '·'}
							</span>
						</div>
					))}
				</div>
			</section>

			<section className='r-tm-panel'>
				<h3 className='r-tm-sub'>{t('teams:typing.offenseHeading')}</h3>
				<ul className='r-tm-facts-list'>
					<li>
						<b>{offense.superEffectiveTypes}</b> / 18 {t('teams:typing.hitSuper')}
					</li>
					{offense.blindSpots.length > 0 ? (
						<li data-severity='high'>
							{t('teams:typing.blindSpots')} <ChipList types={offense.blindSpots} />
						</li>
					) : (
						<li className='r-tm-good'>{t('teams:typing.noBlindSpots')}</li>
					)}
				</ul>
				<div
					className='r-tm-mx'
					role='table'
					aria-label={t('teams:typing.offenseAria')}
					style={{ ['--cols' as string]: members.length }}
				>
					<div role='row' className='r-tm-mx-row r-tm-mx-headrow'>
						<span role='columnheader' />
						<MemberHeads members={members} onChangePokemon={onChangePokemon} />
						<span role='columnheader' className='r-tm-mx-status' />
					</div>
					{offense.rows.map((row) => (
						<div key={row.type} role='row' className='r-tm-mx-row' data-status={row.status}>
							<span role='rowheader'>
								<TypeChip type={row.type} />
							</span>
							{row.perMember.map((m, i) => (
								<Cell key={members[i].slot.speciesId} mult={m} direction='offense' />
							))}
							<span role='cell' className='r-tm-mx-status' data-status={row.status} title={offenseStatuses[row.status]}>
								{row.status === 'strong' ? '▲' : row.status === 'neutral' ? '·' : '▼'}
							</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
};

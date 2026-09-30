import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { cleanName } from '../../lib/format';
import { type RoleAssignment, TEAM_ROLES, type TeamRole } from '../../lib/team-analysis';
import { typeVar } from '../../lib/types';
import { roleDescriptions, roleNames } from './teams-text';
import type { AnalyzedMember } from './useTeamAnalysis';

/**
 * Who leads, who takes the safe switch, who closes — drawn as the actual
 * order of play, with the reason (that Pokémon's PvPoke role score) under
 * each step, and a role-fit matrix underneath so the choice isn't a black
 * box: every Pokémon's three scores, the chosen ones lit.
 */
export const BattlePlan = ({
	members,
	roles,
	onChangePokemon,
}: {
	members: ReadonlyArray<AnalyzedMember>;
	roles: RoleAssignment | undefined;
	/** Opens the Pokémon picker for that team slot (clicking a step's sprite). */
	onChangePokemon: (slot: number) => void;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail']);
	const names = roleNames(t);
	const descriptions = roleDescriptions(t);

	if (!roles) {
		return (
			<section className='r-tm-panel r-tm-plan'>
				<p className='r-muted'>{t('teams:plan.needFull')}</p>
			</section>
		);
	}

	const scoreOf = (member: AnalyzedMember, role: TeamRole) => member.roleScores?.[role] ?? 0;
	const lead = members[roles.order.lead];
	const swap = members[roles.order.switch];
	const closer = members[roles.order.closer];
	const shortName = (m: AnalyzedMember) => cleanName(m.pokemon.speciesName);

	// The translated sentence with each name swapped for a marker, split back apart so the names can be coloured by type.
	const MARK = (key: string) => `\uE000${key}\uE001`;
	const byKey = { lead, switch: swap, closer };
	const summaryParts = t('teams:plan.summary', {
		lead: MARK('lead'),
		switch: MARK('switch'),
		closer: MARK('closer'),
		interpolation: { escapeValue: false },
	})
		.split(/\uE000(lead|switch|closer)\uE001/)
		.map((part, i) => (i % 2 === 1 ? { member: byKey[part as keyof typeof byKey] } : part));

	return (
		<section className='r-tm-panel r-tm-plan'>
			<ol className='r-tm-flow'>
				{TEAM_ROLES.map((role, step) => {
					const member = members[roles.order[role]];
					return (
						<Fragment key={role}>
							{step > 0 && (
								<li className='r-tm-flow-arrow' aria-hidden='true' style={{ ['--i' as string]: step }}>
									<svg viewBox='0 0 40 24'>
										<path d='M2 12h30M24 4l10 8-10 8' />
									</svg>
								</li>
							)}
							<li
								className='r-tm-step'
								data-role={role}
								style={{ ['--tc' as string]: typeVar(member.pokemon.types[0]), ['--i' as string]: step }}
							>
								<span className='r-tm-step-n'>{step + 1}</span>
								<button
									type='button'
									className='r-tm-step-art'
									aria-label={t('teams:builder.change', { name: shortName(member) })}
									title={t('teams:builder.replace', { name: shortName(member) })}
									onClick={() => onChangePokemon(roles.order[role])}
								>
									{member.pokemon.isShadow && <ShadowMark />}
									<SpriteImg pokemon={member.pokemon} />
								</button>
								<b className='r-tm-step-name'>
									<button type='button' title={t('teams:builder.replace', { name: shortName(member) })} onClick={() => onChangePokemon(roles.order[role])}>
										{shortName(member)}
									</button>
								</b>
								<span className='r-tm-step-role'>{names[role]}</span>
								<span className='r-tm-step-desc'>{descriptions[role]}</span>
								<span className='r-tm-step-score'>{scoreOf(member, role).toFixed(1)}</span>
							</li>
						</Fragment>
					);
				})}
			</ol>

			<p className='r-tm-plan-summary'>
				{summaryParts.map((part, i) =>
					typeof part === 'string' ? (
						<Fragment key={i}>{part}</Fragment>
					) : (
						<b key={i} className='r-tm-plan-name' style={{ ['--tc' as string]: typeVar(part.member.pokemon.types[0]) }}>
							{shortName(part.member)}
						</b>
					)
				)}
			</p>
			{roles.margin < 4 && <p className='r-tm-plan-note'>{t('teams:plan.closeCall')}</p>}

			<div className='r-tm-fit' role='table' aria-label={t('teams:plan.fitAria')}>
				<div role='row' className='r-tm-fit-row r-tm-fit-head'>
					<span role='columnheader' />
					{TEAM_ROLES.map((role) => (
						<span key={role} role='columnheader'>
							{names[role]}
						</span>
					))}
				</div>
				{members.map((member, i) => (
					<div key={member.slot.speciesId} role='row' className='r-tm-fit-row'>
						<span role='rowheader' className='r-tm-fit-head-cell'>
							<button
								type='button'
								className='r-tm-fit-name'
								style={{ ['--tc' as string]: typeVar(member.pokemon.types[0]) }}
								title={t('teams:builder.replace', { name: shortName(member) })}
								onClick={() => onChangePokemon(i)}
							>
								<span className='r-tm-wins-ico'>
									{member.pokemon.isShadow && <ShadowMark />}
									<SpriteImg pokemon={member.pokemon} loading='lazy' />
								</span>
								<span className='r-tm-wins-name'>{shortName(member)}</span>
							</button>
						</span>
						{TEAM_ROLES.map((role) => {
							const value = scoreOf(member, role);
							const chosen = roles.order[role] === i;
							return (
								<span key={role} role='cell' className='r-tm-fit-cell' data-chosen={chosen ? '' : undefined}>
									<i style={{ width: `${Math.max(4, value)}%` }} aria-hidden='true' />
									<b>{value.toFixed(0)}</b>
								</span>
							);
						})}
					</div>
				))}
			</div>
		</section>
	);
};

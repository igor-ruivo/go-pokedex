import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { R } from '../../lib/nav';
import type { TeamEvaluation } from '../../lib/pvp-sim/team-eval';
import { typeVar } from '../../lib/types';
import type { AnalyzedMember } from './useTeamAnalysis';

const HOLES_SHOWN = 12;

/**
 * "How much of the meta can this team actually answer?" — the top of the
 * league's ranking, checked against the whole team at once instead of one
 * matchup at a time: how many are beaten by *someone* on the team, how many
 * decisively, what each teammate contributes, and the Pokémon nothing here
 * beats (the real holes, which no per-Pokémon histogram can show).
 */
export const CoveragePanel = ({
	evaluation,
	members,
	gamemaster,
	stale,
	onChangePokemon,
}: {
	evaluation: TeamEvaluation;
	members: ReadonlyArray<AnalyzedMember>;
	gamemaster: Record<string, IGamemasterPokemon>;
	stale: boolean;
	/** Opens the Pokémon picker for that team slot. */
	onChangePokemon: (slot: number) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const { meta } = evaluation;
	const coveredPct = meta.checked ? (meta.covered / meta.checked) * 100 : 0;
	const securePct = meta.checked ? (meta.secure / meta.checked) * 100 : 0;

	return (
		<section className='r-tm-panel r-tm-cover' data-stale={stale ? '' : undefined}>
			<div className='r-tm-cover-top'>
				<div className='r-tm-cover-num'>
					<b>{meta.covered}</b>
					<span>/ {meta.checked}</span>
				</div>
				<p>{t('teams:coverage.summary', { covered: meta.covered, total: meta.checked, secure: meta.secure })}</p>
			</div>

			<div
				className='r-tm-cover-bar'
				role='img'
				aria-label={t('teams:coverage.barAria', { covered: meta.covered, total: meta.checked })}
			>
				<i data-kind='covered' style={{ width: `${coveredPct}%` }} />
				<i data-kind='secure' style={{ width: `${securePct}%` }} />
			</div>
			<p className='r-tm-legend'>
				<span data-kind='secure' /> {t('teams:coverage.legendSecure')}
				<span data-kind='covered' /> {t('teams:coverage.legendCovered')}
				<span data-kind='hole' /> {t('teams:coverage.legendHole')}
			</p>

			<h3 className='r-tm-sub'>{t('teams:coverage.perMember')}</h3>
			<ul className='r-tm-wins'>
				{members.map((m, i) => (
					<li key={`${m.slot.speciesId}-${i}`} style={{ ['--tc' as string]: typeVar(m.pokemon.types[0]) }}>
						<button
							type='button'
							className='r-tm-wins-ico'
							aria-label={t('teams:builder.change', { name: cleanName(m.pokemon.speciesName) })}
							title={t('teams:builder.replace', { name: cleanName(m.pokemon.speciesName) })}
							onClick={() => onChangePokemon(i)}
						>
							{m.pokemon.isShadow && <ShadowMark />}
							<SpriteImg pokemon={m.pokemon} loading='lazy' />
						</button>
						<button
							type='button'
							className='r-tm-wins-name'
							title={t('teams:builder.replace', { name: cleanName(m.pokemon.speciesName) })}
							onClick={() => onChangePokemon(i)}
						>
							{cleanName(m.pokemon.speciesName)}
						</button>
						<span className='r-tm-wins-bar' aria-hidden='true'>
							<i style={{ width: `${meta.checked ? (meta.wins[i] / meta.checked) * 100 : 0}%` }} />
						</span>
						<b>{t('teams:coverage.beats', { n: meta.wins[i] })}</b>
					</li>
				))}
			</ul>

			<h3 className='r-tm-sub'>{t('teams:coverage.holesHeading')}</h3>
			{meta.holes.length === 0 ? (
				<p className='r-tm-good'>{t('teams:coverage.noHoles')}</p>
			) : (
				<>
					<p className='r-muted'>{t('teams:coverage.holesHint')}</p>
					<ul className='r-tm-holes'>
						{meta.holes.slice(0, HOLES_SHOWN).map((hole) => {
							const p = gamemaster[hole.speciesId];
							if (!p) return null;
							return (
								<li key={hole.speciesId}>
									<Link to={R.pokemon(hole.speciesId)} style={{ ['--tc' as string]: typeVar(p.types[0]) }}>
										<span className='r-tm-hole-ico'>
											{p.isShadow && <ShadowMark />}
											<SpriteImg pokemon={p} loading='lazy' />
										</span>
										<span>{cleanName(p.speciesName)}</span>
									</Link>
								</li>
							);
						})}
					</ul>
					{meta.holes.length > HOLES_SHOWN && (
						<p className='r-muted'>{t('teams:coverage.moreHoles', { n: meta.holes.length - HOLES_SHOWN })}</p>
					)}
				</>
			)}
		</section>
	);
};

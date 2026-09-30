import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ShadowMark } from '../../components/ShadowMark';
import { SpriteImg } from '../../components/Sprite';
import { TypeChip } from '../../components/TypeChip';
import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import type { TeamBuilderMove } from '../../DTOs/ITeamBuilder';
import { useDismiss } from '../../hooks/useDismiss';
import type { CombatMetric } from '../../lib/combat';
import { combatMetricNames } from '../../lib/combat-text';
import { cleanName } from '../../lib/format';
import { type TeamRole, type TeamSlotDescriptor } from '../../lib/team-analysis';
import { typeKey, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { translateMoveFromMoveId } from '../../utils/pokemon-helper';
import { roleNames } from './teams-text';
import type { AnalyzedMember } from './useTeamAnalysis';
import type { TeamsData } from './useTeamsData';

/* ------------------------------ Move picker ------------------------------- */

const MoveRow = ({
	kind,
	moveId,
	options,
	moveTable,
	recommended,
	onChange,
}: {
	kind: 'fast' | 'charged';
	moveId: string | undefined;
	options: ReadonlyArray<string>;
	moveTable: Record<string, TeamBuilderMove>;
	recommended: ReadonlyArray<string>;
	onChange: (moveId: string) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const { currentGameLanguage: gl } = useLanguage();
	const { moves } = useMoves();
	const [open, setOpen] = useState(false);
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	const name = (id: string) => translateMoveFromMoveId(id, moves, gl);
	const stat = (id: string) => {
		const m = moveTable[id];
		return kind === 'fast' ? `${m.power} · +${m.energyGain}` : `${m.power} · ${m.energy}`;
	};

	if (!moveId) {
		return (
			<div className='r-tm-move' ref={rootRef}>
				<button type='button' className='r-tm-move-btn r-tm-move-btn--empty' onClick={() => setOpen((o) => !o)}>
					<span className='r-tm-move-kind'>{t('teams:builder.chargedMove')}</span>
					<span className='r-tm-move-name'>{t('teams:builder.addMove')}</span>
				</button>
				{open && (
					<MovePopover
						options={options}
						moveTable={moveTable}
						recommended={recommended}
						name={name}
						stat={stat}
						current={undefined}
						onPick={(id) => {
							onChange(id);
							setOpen(false);
						}}
					/>
				)}
			</div>
		);
	}

	const info = moveTable[moveId];
	return (
		<div className='r-tm-move' ref={rootRef}>
			<button
				type='button'
				className='r-tm-move-btn'
				style={{ ['--tc' as string]: typeVar(info.type) }}
				aria-expanded={open}
				aria-haspopup='listbox'
				aria-label={t('teams:builder.pickMove', { move: name(moveId) })}
				onClick={() => setOpen((o) => !o)}
			>
				<img src={`/images/types/${info.type}.png`} alt='' width={18} height={18} />
				<span className='r-tm-move-name'>{name(moveId)}</span>
				<span className='r-tm-move-stat'>{stat(moveId)}</span>
			</button>
			{open && (
				<MovePopover
					options={options}
					moveTable={moveTable}
					recommended={recommended}
					name={name}
					stat={stat}
					current={moveId}
					onPick={(id) => {
						onChange(id);
						setOpen(false);
					}}
				/>
			)}
		</div>
	);
};

const MovePopover = ({
	options,
	moveTable,
	recommended,
	name,
	stat,
	current,
	onPick,
}: {
	options: ReadonlyArray<string>;
	moveTable: Record<string, TeamBuilderMove>;
	recommended: ReadonlyArray<string>;
	name: (id: string) => string;
	stat: (id: string) => string;
	current: string | undefined;
	onPick: (id: string) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const sorted = useMemo(
		() =>
			[...options].sort(
				(a, b) => Number(recommended.includes(b)) - Number(recommended.includes(a)) || name(a).localeCompare(name(b))
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[options, recommended]
	);
	return (
		<ul className='r-tm-movepop' role='listbox' aria-label={t('teams:builder.moveListAria')}>
			{sorted.map((id) => (
				<li key={id} role='option' aria-selected={id === current}>
					<button
						type='button'
						data-active={id === current ? '' : undefined}
						style={{ ['--tc' as string]: typeVar(moveTable[id].type) }}
						onClick={() => onPick(id)}
					>
						<img src={`/images/types/${moveTable[id].type}.png`} alt='' width={18} height={18} />
						<span className='r-tm-move-name'>{name(id)}</span>
						{recommended.includes(id) && (
							<i
								className='r-tm-star'
								title={t('teams:builder.recommended')}
								aria-label={t('teams:builder.recommended')}
							>
								★
							</i>
						)}
						<span className='r-tm-move-stat'>{stat(id)}</span>
					</button>
				</li>
			))}
		</ul>
	);
};

/* ----------------------------- Pokémon picker ----------------------------- */

type PickerSort = 'rank' | CombatMetric;
const PICKER_PAGE = 48;

const PokemonPicker = ({
	leagueLabel,
	data,
	blockedBases,
	onPick,
	onClose,
}: {
	leagueLabel: string;
	data: TeamsData;
	/** Base species already on the team (a Shadow and its normal form count as one). */
	blockedBases: ReadonlySet<string>;
	onPick: (speciesId: string) => void;
	onClose: () => void;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail', 'rankings']);
	const [query, setQuery] = useState('');
	const [sort, setSort] = useState<PickerSort>('rank');
	const [shown, setShown] = useState(PICKER_PAGE);
	const inputRef = useRef<HTMLInputElement>(null);
	const rootRef = useDismiss<HTMLDivElement>(true, onClose);
	const names = combatMetricNames(t);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const rows = useMemo(() => {
		const q = query.trim().toLowerCase();
		return Object.values(data.rankList)
			.filter((r) => data.gamemaster[r.speciesId])
			.filter((r) => {
				if (!q) return true;
				const p = data.gamemaster[r.speciesId];
				return p.speciesName.toLowerCase().includes(q) || p.types.some((ty) => String(ty).toLowerCase().includes(q));
			})
			.sort((a, b) => (sort === 'rank' ? a.rank - b.rank : b[sort] - a[sort]));
	}, [data.rankList, data.gamemaster, query, sort]);

	const sortKeys: Array<PickerSort> = ['rank', 'lead', 'switch', 'closer'];

	return (
		<div className='r-tm-picker-backdrop'>
			<div className='r-tm-picker' role='dialog' aria-modal='true' aria-label={t('teams:picker.title')} ref={rootRef}>
				<div className='r-tm-picker-head'>
					<h2>{t('teams:picker.title')}</h2>
					<button type='button' className='r-icon-btn' aria-label={t('teams:picker.close')} onClick={onClose}>
						×
					</button>
				</div>
				<input
					ref={inputRef}
					className='r-tm-picker-search'
					type='search'
					value={query}
					placeholder={t('teams:picker.searchPlaceholder', { league: leagueLabel })}
					onChange={(e) => {
						setQuery(e.target.value);
						setShown(PICKER_PAGE);
					}}
				/>
				<div className='r-tm-picker-sorts' role='group' aria-label={t('teams:picker.sortAria')}>
					{sortKeys.map((key) => (
						<button
							key={key}
							type='button'
							data-active={sort === key ? '' : undefined}
							onClick={() => {
								setSort(key);
								setShown(PICKER_PAGE);
							}}
						>
							{key === 'rank' ? t('rankings:sorts.overall') : names[key]}
						</button>
					))}
				</div>
				<ul className='r-tm-picker-list'>
					{rows.slice(0, shown).map((r) => {
						const p = data.gamemaster[r.speciesId];
						const blocked = blockedBases.has(r.speciesId.replace(/_shadow$/, ''));
						return (
							<li key={r.speciesId}>
								<button
									type='button'
									disabled={blocked}
									style={{ ['--tc' as string]: typeVar(p.types[0]) }}
									onClick={() => onPick(r.speciesId)}
								>
									<span className='r-tm-picker-art'>
										<SpriteImg pokemon={p} loading='lazy' />
									</span>
									<span className='r-tm-picker-info'>
										<b>{cleanName(p.speciesName)}</b>
										<span className='r-tm-picker-meta'>
											{p.isShadow && <ShadowMark className='r-tm-shadow-mark' />}
											{p.types.map((ty) => (
												<i key={typeKey(ty)} style={{ background: typeVar(ty) }} />
											))}
											<em>{blocked ? t('teams:picker.inTeam') : t('teams:picker.rank', { rank: r.rank })}</em>
										</span>
									</span>
									<span className='r-tm-picker-score'>{sort === 'rank' ? r.score.toFixed(1) : r[sort].toFixed(1)}</span>
								</button>
							</li>
						);
					})}
				</ul>
				{rows.length === 0 && <p className='r-muted r-tm-picker-empty'>{t('teams:picker.empty')}</p>}
				{shown < rows.length && (
					<button type='button' className='r-tm-more' onClick={() => setShown((s) => s + PICKER_PAGE)}>
						{t('teams:picker.showMore')}
					</button>
				)}
			</div>
		</div>
	);
};

/* ------------------------------- Member card ------------------------------ */

const ROLE_NUMBER: Record<TeamRole, number> = { lead: 1, switch: 2, closer: 3 };

const MemberCard = ({
	index,
	member,
	pokemon,
	data,
	role,
	onChangePokemon,
	onMove,
	onRemove,
}: {
	index: number;
	member: AnalyzedMember | undefined;
	pokemon: IGamemasterPokemon | undefined;
	data: TeamsData;
	role: TeamRole | undefined;
	onChangePokemon: () => void;
	onMove: (moveIndex: number, moveId: string) => void;
	onRemove: () => void;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail']);
	const roles = roleNames(t);
	const moveTable = data.builder!.moves;

	if (!member || !pokemon) {
		return (
			<button type='button' className='r-tm-card r-tm-card--empty' onClick={onChangePokemon}>
				<span className='r-tm-plus' aria-hidden='true'>
					+
				</span>
				<b>{t('teams:builder.emptySlot')}</b>
				<span className='r-muted'>{t('teams:builder.slotN', { n: index + 1 })}</span>
			</button>
		);
	}

	const name = cleanName(pokemon.speciesName);
	const { moveset } = member.slot;
	const recommended = data.rankList[pokemon.speciesId]?.moveset ?? [];
	const validMove = (id: string) => !!moveTable[id];
	const fastOptions = pokemon.fastMoves.filter(validMove);
	const chargedPool = [...new Set([...pokemon.chargedMoves, ...pokemon.extraChargedMoves])].filter(validMove);
	const stats = member.stats;

	return (
		<article
			className='r-tm-card'
			data-role={role}
			data-shadow={pokemon.isShadow ? '' : undefined}
			style={{
				['--tc' as string]: typeVar(pokemon.types[0]),
				['--tc2' as string]: typeVar(pokemon.types[1] ?? pokemon.types[0]),
			}}
		>
			{role && (
				<span className='r-tm-role' data-role={role}>
					<b>{ROLE_NUMBER[role]}</b>
					{roles[role]}
				</span>
			)}
			<button type='button' className='r-tm-remove' aria-label={t('teams:builder.remove', { name })} onClick={onRemove}>
				×
			</button>

			<button
				type='button'
				className='r-tm-art'
				aria-label={t('teams:builder.change', { name })}
				onClick={onChangePokemon}
			>
				<span className='r-tm-halo' aria-hidden='true' />
				<SpriteImg pokemon={pokemon} />
				{pokemon.isShadow && <ShadowMark />}
			</button>

			<h3 className='r-tm-name'>{name}</h3>
			<div className='r-tm-types'>
				{pokemon.types.map((ty) => (
					<TypeChip key={typeKey(ty)} type={typeKey(ty)} />
				))}
			</div>

			<dl className='r-tm-facts'>
				<div>
					<dt>{t('teams:builder.cp')}</dt>
					<dd>{stats.cp}</dd>
				</div>
				<div>
					<dt>{t('teams:builder.level')}</dt>
					<dd>{stats.level}</dd>
				</div>
				<div>
					<dt>{t('teams:builder.ivs')}</dt>
					<dd>{stats.ivs.join('/')}</dd>
				</div>
			</dl>

			<div className='r-tm-moves'>
				<MoveRow
					kind='fast'
					moveId={moveset[0]}
					options={fastOptions}
					moveTable={moveTable}
					recommended={recommended}
					onChange={(id) => onMove(0, id)}
				/>
				{[1, 2].map((slot) => (
					<MoveRow
						key={slot}
						kind='charged'
						moveId={moveset[slot]}
						options={chargedPool.filter((id) => id === moveset[slot] || !moveset.slice(1).includes(id))}
						moveTable={moveTable}
						recommended={recommended}
						onChange={(id) => onMove(slot, id)}
					/>
				))}
			</div>
		</article>
	);
};

/* --------------------------------- Stage ---------------------------------- */

export const TeamStage = ({
	leagueLabel,
	data,
	team,
	members,
	roleOf,
	onSetMember,
	onMove,
	onRemove,
}: {
	leagueLabel: string;
	data: TeamsData;
	team: ReadonlyArray<TeamSlotDescriptor>;
	members: ReadonlyArray<AnalyzedMember>;
	roleOf: (index: number) => TeamRole | undefined;
	onSetMember: (index: number, speciesId: string) => void;
	onMove: (index: number, moveIndex: number, moveId: string) => void;
	onRemove: (index: number) => void;
}) => {
	const [pickerFor, setPickerFor] = useState<number | null>(null);
	const blocked = useMemo(() => {
		const others = team.filter((_, i) => i !== pickerFor);
		return new Set(others.map((s) => s.speciesId.replace(/_shadow$/, '')));
	}, [team, pickerFor]);

	return (
		<>
			<div className='r-tm-stage'>
				{[0, 1, 2].map((i) => (
					<MemberCard
						key={i}
						index={i}
						member={members[i]}
						pokemon={team[i] ? data.gamemaster[team[i].speciesId] : undefined}
						data={data}
						role={roleOf(i)}
						onChangePokemon={() => setPickerFor(i)}
						onMove={(moveIndex, moveId) => onMove(i, moveIndex, moveId)}
						onRemove={() => onRemove(i)}
					/>
				))}
			</div>
			{pickerFor !== null && (
				<PokemonPicker
					leagueLabel={leagueLabel}
					data={data}
					blockedBases={blocked}
					onClose={() => setPickerFor(null)}
					onPick={(speciesId) => {
						onSetMember(pickerFor, speciesId);
						setPickerFor(null);
					}}
				/>
			)}
		</>
	);
};

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PokemonPickerModal } from '../../components/PokemonPickerModal';
import { RankMedal } from '../../components/RankMedal';
import { ShadowMark } from '../../components/ShadowMark';
import { SortBar, type SortDir, type SortOption } from '../../components/SortBar';
import { SpriteImg } from '../../components/Sprite';
import { TypeChip } from '../../components/TypeChip';
import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import type { IRankedPokemon } from '../../DTOs/IRankedPokemon';
import type { TeamBuilderMove } from '../../DTOs/ITeamBuilder';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDismiss } from '../../hooks/useDismiss';
import { useOptimalBuild } from '../../hooks/useOptimalBuild';
import { COMBAT_METRICS, type CombatMetric, isCombatMetric } from '../../lib/combat';
import { combatMetricNames } from '../../lib/combat-text';
import { cleanName, ordinal } from '../../lib/format';
import { type BuffInfo, buffInfo } from '../../lib/moves';
import {
	isBuddy,
	MAX_MOVES,
	maxLevelOf,
	speciesFamilyKey,
	type TeamRole,
	type TeamSlotDescriptor,
} from '../../lib/team-analysis';
import {
	type BuildChange,
	isUnrecommendedMove,
	ivsChange,
	levelChange,
	movesAreRecommended,
	pickerBlock,
	resetChange,
	showReset,
	starterNickname,
	type StatusFlags,
	statusToggle,
	syncedNickname,
} from '../../lib/team-build';
import { typeKey, typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import gameTranslator, { GameTranslatorKeys } from '../../utils/GameTranslator';
import { translateMoveFromMoveId } from '../../utils/pokemon-helper';
import { IvModal } from './IvModal';
import { LevelModal } from './LevelModal';
import { NotRecommendedMark } from './NotRecommendedMark';
import { roleNames } from './teams-text';
import type { AnalyzedMember } from './useTeamAnalysis';
import type { TeamsData } from './useTeamsData';

/* ------------------------------ Move picker ------------------------------- */

/**
 * Marks a charged move that raises or lowers stat stages. On desktop, hovering it lists which ones, in the
 * game's own localized wording and with the activation chance, exactly as the moves rows print them.
 */
const BuffMark = ({ info }: { info: BuffInfo }) => {
	const lines = info.badges.map((b) => `${b.label}${b.magnitude > 1 ? ` ×${b.magnitude}` : ''}`);
	const chance = `${info.chanceLabel}: ${info.chancePercent}%`;
	return (
		<span className='r-tm-buff' role='img' aria-label={`${lines.join(', ')} — ${chance}`}>
			<svg viewBox='0 0 24 24' aria-hidden='true'>
				<path d='M10 6.5 11.9 12 17.5 13.9 11.9 15.8 10 21.3 8.1 15.8 2.5 13.9 8.1 12z' />
				<path d='M18.5 2.5 19.4 5.1 22 6 19.4 6.9 18.5 9.5 17.6 6.9 15 6 17.6 5.1z' />
			</svg>
			<span className='r-tm-buff-tip' aria-hidden='true'>
				{lines.map((line) => (
					<b key={line}>{line}</b>
				))}
				<span>{chance}</span>
			</span>
		</span>
	);
};

const MoveRow = ({
	kind,
	moveId,
	options,
	moveTable,
	recommended,
	legacy,
	elite,
	onChange,
}: {
	kind: 'fast' | 'charged';
	moveId: string | undefined;
	options: ReadonlyArray<string>;
	moveTable: Record<string, TeamBuilderMove>;
	recommended: ReadonlyArray<string>;
	/** This Pokémon's Legacy / Elite moves, for the chips. */
	legacy: ReadonlySet<string>;
	elite: ReadonlySet<string>;
	onChange: (moveId: string) => void;
}) => {
	const { t } = useTranslation(['teams', 'moveDetail', 'pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const { moves } = useMoves();
	const [open, setOpen] = useState(false);
	// The move menu is an inline pick list: it doesn't darken the page.
	const rootRef = useDismiss<HTMLDivElement>(open, () => setOpen(false), { dim: false });

	const name = (id: string) => translateMoveFromMoveId(id, moves, gl);
	// "DMG 90 · NRG 55", with the localized short labels the moves pages use.
	const stat = (id: string) => {
		const m = moveTable[id];
		return (
			<>
				<small>{t('moveDetail:statLabels.dmg')}</small> <b>{m.power}</b> <small>{t('moveDetail:statLabels.nrg')}</small>{' '}
				<b>{kind === 'fast' ? `+${m.energyGain}` : m.energy}</b>
				{kind === 'fast' && (
					<>
						{' '}
						<small>{t('moveDetail:statLabels.turns')}</small> <b>{m.turns}</b>
					</>
				)}
			</>
		);
	};
	// What sits after a move's name, in the row and in the menu: the stat-buff mark, then a Legacy / Elite chip.
	const tag = (id: string) => {
		const fx = kind === 'charged' ? buffInfo(moves[id]?.buffs, gl) : null;
		return (
			<>
				{fx && <BuffMark info={fx} />}
				{legacy.has(id) ? (
					<i className='r-move-tag r-tm-move-tag'>{t('pokemonDetail:moves.legacy')}</i>
				) : elite.has(id) ? (
					<i className='r-move-tag r-tm-move-tag'>{t('pokemonDetail:moves.elite')}</i>
				) : null}
			</>
		);
	};

	if (!moveId || moveId === 'none') {
		return (
			<div className='r-tm-move' ref={rootRef}>
				<button type='button' className='r-tm-move-btn r-tm-move-btn--empty' onClick={() => setOpen((o) => !o)}>
					<span className='r-tm-move-kind'>{t('teams:builder.chargedMove')}</span>
					<span className='r-tm-move-name'>
						{moveId === 'none' ? t('teams:builder.none') : t('teams:builder.addMove')}
					</span>
				</button>
				{open && (
					<MovePopover
						options={options}
						moveTable={moveTable}
						recommended={recommended}
						name={name}
						stat={stat}
						tag={tag}
						current={moveId}
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
				title={t('teams:builder.replace', { name: name(moveId) })}
				onClick={() => setOpen((o) => !o)}
			>
				<img src={`/images/types/${info.type}.png`} alt='' width={18} height={18} />
				<span className='r-tm-move-name'>{name(moveId)}</span>
				{tag(moveId)}
				{isUnrecommendedMove(moveId, recommended) && <NotRecommendedMark />}
				<span className='r-tm-move-stat'>{stat(moveId)}</span>
			</button>
			{open && (
				<MovePopover
					options={options}
					moveTable={moveTable}
					recommended={recommended}
					name={name}
					stat={stat}
					tag={tag}
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
	tag,
	current,
	onPick,
}: {
	options: ReadonlyArray<string>;
	moveTable: Record<string, TeamBuilderMove>;
	recommended: ReadonlyArray<string>;
	name: (id: string) => string;
	stat: (id: string) => ReactNode;
	tag: (id: string) => ReactNode;
	current: string | undefined;
	onPick: (id: string) => void;
}) => {
	const { t } = useTranslation(['teams']);
	const sorted = useMemo(
		() =>
			[...options].sort((a, b) =>
				a === 'none'
					? 1
					: b === 'none'
						? -1
						: Number(recommended.includes(b)) - Number(recommended.includes(a)) || name(a).localeCompare(name(b))
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
						style={id === 'none' ? undefined : { ['--tc' as string]: typeVar(moveTable[id].type) }}
						onClick={() => onPick(id)}
					>
						{id === 'none' ? (
							<span className='r-tm-move-name'>{t('teams:builder.none')}</span>
						) : (
							<>
								<img src={`/images/types/${moveTable[id].type}.png`} alt='' width={18} height={18} />
								<span className='r-tm-move-name'>{name(id)}</span>
								{tag(id)}
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
							</>
						)}
					</button>
				</li>
			))}
		</ul>
	);
};

/* ----------------------------- Pokémon picker ----------------------------- */

type PickerSort = 'overall' | CombatMetric;
const PICKER_PAGE = 48;

const PokemonPicker = ({
	leagueLabel,
	data,
	teamBases,
	megaTaken,
	replacing,
	onPick,
	onClose,
}: {
	leagueLabel: string;
	data: TeamsData;
	/** Base species already on the team (a Shadow, its normal form and any Mega of it count as one) — labelled, not blocked. */
	teamBases: ReadonlySet<string>;
	/** A teammate is already a Mega: a team has one at most, so no other Mega can be picked — labelled and blocked too. */
	megaTaken: boolean;
	/** Name of the Pokémon this pick will replace, when the slot isn't empty. */
	replacing?: string | undefined;
	onPick: (speciesId: string) => void;
	onClose: () => void;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail', 'rankings', 'components']);
	const title = replacing ? t('teams:picker.replaceTitle', { name: replacing }) : t('teams:picker.title');
	const { currentLanguage } = useLanguage();
	const [query, setQuery] = useState('');
	const searchTerm = useDebouncedValue(query.trim().toLowerCase(), 220);
	const [sortKey, setSortKey] = useState<PickerSort>('overall');
	const [sortDir, setSortDir] = useState<SortDir>('asc');
	const [shown, setShown] = useState(PICKER_PAGE);
	const inputRef = useRef<HTMLInputElement>(null);
	const rootRef = useDismiss<HTMLDivElement>(true, onClose);
	const names = combatMetricNames(t);

	// Same "Order by" options as a league's rankings page: the overall rank, then PvPoke's six role scores.
	const sortOptions: ReadonlyArray<SortOption> = [
		{ key: 'overall', label: t('rankings:sorts.overall'), defaultDir: 'asc' },
		...COMBAT_METRICS.map((m) => ({ key: m, label: names[m], defaultDir: 'desc' as const })),
	];

	const rows = useMemo(() => {
		// "Overall" reads best-first when ascending (rank 1 on top); the role scores read highest-first when descending.
		const order = sortKey === 'overall' ? (sortDir === 'asc' ? 1 : -1) : sortDir === 'desc' ? -1 : 1;
		const value = (r: IRankedPokemon) => (sortKey === 'overall' ? r.rank : r[sortKey]);

		return (
			Object.values(data.rankList)
				.filter((r) => data.gamemaster[r.speciesId])
				.sort((x, y) => order * (value(x) - value(y)))
				// The number is the position in the *full* sorted list, so searching never renumbers it.
				.map((r, i) => ({ r, position: i + 1 }))
				.filter(({ r }) => {
					if (!searchTerm) return true;
					const p = data.gamemaster[r.speciesId];
					return cleanName(p.speciesName).toLowerCase().includes(searchTerm);
				})
		);
	}, [data.rankList, data.gamemaster, searchTerm, sortKey, sortDir]);

	const changeSort = (key: string, dir: SortDir) => {
		if (key !== 'overall' && !isCombatMetric(key)) return;
		setSortKey(key);
		setSortDir(dir);
		setShown(PICKER_PAGE);
	};

	return (
		<PokemonPickerModal
			title={title}
			closeLabel={t('teams:picker.close')}
			onClose={onClose}
			inputRef={inputRef}
			dialogRef={rootRef}
			query={query}
			onQueryChange={(value) => {
				setQuery(value);
				setShown(PICKER_PAGE);
			}}
			placeholder={t('teams:picker.searchPlaceholder', { league: leagueLabel })}
			clearAriaLabel={t('components:searchBox.clearAriaLabel')}
			onClear={() => {
				setQuery('');
				inputRef.current?.focus();
			}}
			tools={<SortBar options={sortOptions} sortKey={sortKey} dir={sortDir} onChange={changeSort} />}
		>
			<ul className='r-tm-picker-list'>
				{rows.slice(0, shown).map(({ r, position }) => {
					const p = data.gamemaster[r.speciesId];
					const inTeam = teamBases.has(speciesFamilyKey(r.speciesId, (x) => data.gamemaster[x]));
					const block = pickerBlock({ inTeam, megaTaken, isMega: p.isMega });
					const score = sortKey === 'overall' ? r.score : r[sortKey];
					return (
						<li key={r.speciesId}>
							<button
								type='button'
								style={{ ['--tc' as string]: typeVar(p.types[0]) }}
								// a Pokémon already on the team (shadow or not) can't be picked again
								disabled={block !== null}
								onClick={() => onPick(r.speciesId)}
							>
								<RankMedal rank={position} className='r-tm-picker-medal' />
								<span className='r-search-sprite r-ctr-art'>
									{p.isShadow && <ShadowMark />}
									<SpriteImg pokemon={p} loading='lazy' />
								</span>
								<span className='r-tm-picker-info'>
									<span className='r-search-name'>{cleanName(p.speciesName)}</span>
									<span className='r-tm-picker-meta'>
										{p.types.map((ty) => (
											<i key={typeKey(ty)} style={{ background: typeVar(ty) }} />
										))}
										{inTeam && <em>{t('teams:picker.inTeam')}</em>}
										{block === 'megaTaken' && <em>{t('teams:picker.megaTaken')}</em>}
									</span>
								</span>
								<span className='r-tm-picker-side'>
									<span className='r-search-dex'>{ordinal(position, currentLanguage)}</span>
									<b>{score.toFixed(1)}</b>
								</span>
							</button>
						</li>
					);
				})}
			</ul>
			{rows.length === 0 && <p className='r-muted r-tm-picker-empty'>{t('teams:picker.empty')}</p>}
			{shown < rows.length && (
				<button type='button' className='r-tm-more' onClick={() => setShown((n) => n + PICKER_PAGE)}>
					{t('teams:picker.showMore')}
				</button>
			)}
		</PokemonPickerModal>
	);
};

/* ------------------------------- Member card ------------------------------ */

const ROLE_NUMBER: Record<TeamRole, number> = { lead: 1, switch: 2, closer: 3 };

interface MemberCardProps {
	index: number;
	member: AnalyzedMember | undefined;
	pokemon: IGamemasterPokemon | undefined;
	data: TeamsData;
	role: TeamRole | undefined;
	onChangePokemon: () => void;
	onMove: (moveIndex: number, moveId: string) => void;
	/** Open the IVs / the level dialog for this member (the stage owns them: a dialog can't sit inside an animated card). */
	onEditIvs: () => void;
	onEditLevel: () => void;
	onRemove: () => void;
	/** Only on the empty cards of a team that has one or two Pokémon: finish the team with the best teammates. */
	suggestion?: { pending: boolean; onSuggest: () => void } | undefined;
	onConfirm?: (() => void) | undefined;
	confirmLabel?: string | undefined;
	/** Why Confirm can't be pressed right now: it stays visible but disabled, and this shows as its tooltip (a tap shows it too). */
	confirmDisabledReason?: string | undefined;
	nickname?: string | undefined;
	onNicknameChange?: ((nickname: string) => void) | undefined;
	onNicknameFocus?: (() => void) | undefined;
	/** The IVs / level are what the current Best Buddy setting makes optimal: not shown as picked, even if stored. */
	ivsOptimal?: boolean | undefined;
	levelOptimal?: boolean | undefined;
	/** The Pokémon is not at the best it can be: offered a Reset (IVs and level together). */
	onReset?: (() => void) | undefined;
	/** Its CP is over the league's CP cap: shown in red (and the build is not rated). */
	overCap?: boolean | undefined;
	/** The Best Buddy toggle, only for a Pokémon that would benefit from it in this league (or already is one). */
	buddy?: { on: boolean; label: string; hint: string; onToggle: () => void } | undefined;
	/** The Super Max Mega toggle, only for a species that can be one. */
	superMega?: { on: boolean; label: string; hint: string; onToggle: () => void } | undefined;
	nicknameLabel?: string | undefined;
}

export const MemberCard = ({
	index,
	member,
	pokemon,
	data,
	role,
	onChangePokemon,
	onMove,
	onEditIvs,
	onEditLevel,
	onRemove,
	suggestion,
	onConfirm,
	confirmLabel,
	confirmDisabledReason,
	nickname,
	onNicknameChange,
	onNicknameFocus,
	ivsOptimal = false,
	levelOptimal = false,
	onReset,
	overCap = false,
	buddy,
	superMega,
	nicknameLabel,
}: MemberCardProps) => {
	const { t } = useTranslation(['teams', 'pokemonDetail']);
	const roles = roleNames(t);
	const moveTable = data.builder!.moves;
	// A tap on a disabled Confirm has no hover to rely on: show the reason for a moment.
	const [reasonShown, setReasonShown] = useState(false);
	useEffect(() => {
		if (!reasonShown) return;
		const id = window.setTimeout(() => setReasonShown(false), 3000);
		return () => window.clearTimeout(id);
	}, [reasonShown]);

	if (!member || !pokemon) {
		return (
			<div className='r-tm-card r-tm-card--empty' data-pending={suggestion?.pending ? '' : undefined}>
				{suggestion?.pending ? (
					<span className='r-spinner' role='status' aria-label={t('teams:threat.simulating')} />
				) : (
					<>
						<button type='button' className='r-tm-empty-add' onClick={onChangePokemon}>
							<span className='r-tm-plus' aria-hidden='true'>
								+
							</span>
							<b>{t('teams:builder.emptySlot')}</b>
							<span className='r-muted'>{t('teams:builder.slotN', { n: index + 1 })}</span>
						</button>
						{suggestion && (
							<button type='button' className='r-tm-suggest-link' onClick={suggestion.onSuggest}>
								{t('teams:builder.suggestion')}
							</button>
						)}
					</>
				)}
			</div>
		);
	}

	const name = cleanName(pokemon.speciesName);
	const { moveset } = member.slot;
	const recommended = data.rankList[pokemon.speciesId]?.moveset ?? [];
	// Two Charged Moves, or three for a Mega Pokémon in a Mega cup (the ranking's moveset says which).
	const chargedSlots = Math.max(2, recommended.filter((m) => m !== 'none').length - 1, moveset.length - 1);
	const validMove = (id: string) => !!moveTable[id];
	// The pool is PvPoke's, like the move table it is checked against: one source, not the game master's lists next to it.
	// (Data from before dex-server shipped the pools falls back to the game master's.)
	const pool = data.builder?.pools?.[pokemon.speciesId];
	const fastOptions = (pool?.fast ?? pokemon.fastMoves).filter(validMove);
	const chargedPool = [...new Set(pool?.charged ?? [...pokemon.chargedMoves, ...pokemon.extraChargedMoves])].filter(
		validMove
	);
	const stats = member.stats;
	const legacy = new Set(pool?.legacy ?? pokemon.legacyMoves);
	const elite = new Set(pool?.elite ?? pokemon.eliteMoves);

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
			{onConfirm && (
				<>
					<button
						type='button'
						className='r-tm-confirm'
						aria-label={confirmLabel}
						aria-disabled={confirmDisabledReason ? true : undefined}
						title={confirmDisabledReason ?? confirmLabel}
						onClick={() => (confirmDisabledReason ? setReasonShown((shown) => !shown) : onConfirm())}
					>
						✓
					</button>
					{confirmDisabledReason && reasonShown && (
						<button type='button' className='r-tm-confirm-tip' onClick={() => setReasonShown(false)}>
							{confirmDisabledReason}
						</button>
					)}
				</>
			)}
			<button type='button' className='r-tm-remove' aria-label={t('teams:builder.remove', { name })} onClick={onRemove}>
				×
			</button>

			<button
				type='button'
				className='r-tm-art'
				aria-label={t('teams:builder.change', { name })}
				title={t('teams:builder.replace', { name: name })}
				onClick={onChangePokemon}
			>
				<span className='r-tm-halo' aria-hidden='true' />
				<SpriteImg pokemon={pokemon} />
				{pokemon.isShadow && <ShadowMark />}
			</button>

			<h3 className='r-tm-name'>
				<button type='button' title={t('teams:builder.replace', { name: name })} onClick={onChangePokemon}>
					{name}
				</button>
			</h3>
			{onNicknameChange && (
				<input
					className='r-tm-nickname'
					value={nickname ?? ''}
					maxLength={32}
					aria-label={nicknameLabel}
					placeholder={nicknameLabel}
					onFocus={onNicknameFocus}
					onChange={(event) => onNicknameChange(event.target.value)}
				/>
			)}
			<div className='r-tm-types'>
				{pokemon.types.map((ty) => (
					<TypeChip key={typeKey(ty)} type={typeKey(ty)} />
				))}
			</div>
			{(buddy ?? superMega) && (
				<div className='r-tm-buddies'>
					{buddy && (
						<button
							type='button'
							className='r-tm-buddy'
							aria-pressed={buddy.on}
							title={buddy.hint}
							onClick={buddy.onToggle}
						>
							<img src='/images/buddy-crown.png' alt='' aria-hidden='true' width={18} height={18} />
							{buddy.label}
						</button>
					)}
					{superMega && (
						<button
							type='button'
							className='r-tm-buddy r-tm-buddy--super'
							aria-pressed={superMega.on}
							title={superMega.hint}
							onClick={superMega.onToggle}
						>
							<img src='/images/mega-logo.png' alt='' aria-hidden='true' width={18} height={18} />
							{superMega.label}
						</button>
					)}
				</div>
			)}

			<dl className='r-tm-facts'>
				<div>
					<dt>{t('teams:builder.cp')}</dt>
					<dd data-over={overCap ? '' : undefined} title={overCap ? t('teams:builder.overCapTitle') : undefined}>
						{stats.cp}
					</dd>
				</div>
				<div>
					<dt>{t('teams:builder.level')}</dt>
					<dd>
						<button
							type='button'
							className='r-tm-iv-btn'
							data-custom={member.slot.level !== undefined && !levelOptimal ? '' : undefined}
							aria-haspopup='dialog'
							aria-label={t('teams:builder.levelEdit', { name })}
							title={t('teams:builder.levelEdit', { name })}
							onClick={onEditLevel}
						>
							{stats.level}
						</button>
					</dd>
				</div>
				<div>
					<dt>{t('teams:builder.ivs')}</dt>
					<dd>
						<button
							type='button'
							className='r-tm-iv-btn'
							data-custom={member.slot.ivs && !ivsOptimal ? '' : undefined}
							aria-haspopup='dialog'
							aria-label={t('teams:builder.ivEdit', { name })}
							title={t('teams:builder.ivEdit', { name })}
							onClick={onEditIvs}
						>
							{stats.ivs.join('/')}
						</button>
					</dd>
				</div>
			</dl>
			{/* its space is kept while it is not offered, so the card does not move when it appears */}
			<button
				type='button'
				className='r-tm-reset'
				hidden={!onReset}
				tabIndex={onReset ? undefined : -1}
				aria-hidden={onReset ? undefined : true}
				onClick={onReset}
			>
				{t('teams:builder.reset')}
			</button>

			<div className='r-tm-moves'>
				<MoveRow
					kind='fast'
					moveId={moveset[0]}
					options={fastOptions}
					moveTable={moveTable}
					recommended={recommended}
					legacy={legacy}
					elite={elite}
					onChange={(id) => onMove(0, id)}
				/>
				{Array.from({ length: chargedSlots }, (_, k) => k + 1).map((slot) => (
					<MoveRow
						key={slot}
						kind='charged'
						moveId={moveset[slot]}
						options={[
							// the current move stays listed even when it isn't in the usual pool (a Mega cup's own moves)
							...new Set([
								...(moveset[slot] && moveset[slot] !== 'none' && validMove(moveset[slot]) ? [moveset[slot]] : []),
								// replacing a move also lists the ones in the other Charged slots: picking one swaps the two.
								// Filling an empty slot doesn't, since there is nothing to swap with.
								...(moveset[slot] && moveset[slot] !== 'none'
									? moveset.slice(1).filter((id, k) => k + 1 !== slot && id !== 'none' && validMove(id))
									: []),
								...chargedPool.filter((id) => !moveset.slice(1).includes(id)),
							]),
							...(slot >= 2 ? ['none'] : []),
						]}
						moveTable={moveTable}
						recommended={recommended}
						legacy={legacy}
						elite={elite}
						onChange={(id) => onMove(slot, id)}
					/>
				))}
			</div>
		</article>
	);
};

export const TeamMemberEditor = ({
	index,
	member,
	pokemon,
	data,
	role,
	cpCap,
	onChangePokemon,
	onMove,
	onBuild,
	onRemove,
	suggestion,
	onConfirm,
	confirmLabel,
	confirmDisabledReason,
	nickname,
	onNicknameChange,
	nicknameLabel,
	buddyTaken = false,
}: Omit<
	MemberCardProps,
	'onEditIvs' | 'onEditLevel' | 'onNicknameFocus' | 'ivsOptimal' | 'levelOptimal' | 'buddy' | 'superMega'
> & {
	cpCap: number;
	/** Another member of the team is already above level 50 (Best Buddy): only one per team can be. */
	buddyTaken?: boolean;
	onBuild: (index: number, build: BuildChange) => boolean | void;
}) => {
	const { t } = useTranslation(['teams', 'pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const [editing, setEditing] = useState<'ivs' | 'level' | null>(null);

	// A nickname can carry the rank of the member's IVs ("Azumarill #12"). Ties share a rank (1, 1, 3, …), so this
	// is the competition rank in the league's IV table, the same one the Pokémon page shows. Picked IVs / level that are
	// exactly what the Best Buddy setting makes optimal read as the defaults, not as something the player pinned.
	const buddyNow = member ? isBuddy(member.slot) : false;
	const superNow = !!member?.slot.superMega;
	// The highest level the picker takes: 50 (51 as a Best Buddy); a Pokémon that can be a Super Max Mega goes to 52 (53 as a Best
	// Buddy). The website's own Best Buddy setting plays no part in the builder.
	const levelMax = maxLevelOf({ buddy: buddyNow, superMega: !!pokemon?.isSuperMega });
	const {
		ivRank,
		ivsOptimal,
		levelOptimal,
		best,
		buddy: buddyBest,
		superMega: superBest,
	} = useOptimalBuild(pokemon, member?.stats.ivs, member?.stats.level, { buddy: buddyNow, superMega: superNow }, cpCap);
	// Any Pokémon can be made a Best Buddy (even one that gains nothing from it in this league); only one per team can be.
	// A Mega that can be a Super Max Mega can be that too (two more levels, on top of a Best Buddy's one). Turning either on
	// picks the spread that is best at the new level ceiling, and its level when that is above 50; turning one off goes back
	// to the best at the lower ceiling, or to the defaults when nothing is left.
	const flip = (target: typeof buddyBest, nextFlags: StatusFlags, flag: 'buddy' | 'superMega') => {
		const change = statusToggle(flag, nextFlags, target);
		if (change) onBuild(index, change);
	};
	const buddy = member
		? {
				on: buddyNow,
				label: t('teams:builder.bestBuddy'),
				hint: !buddyNow && buddyTaken ? t('teams:builder.bestBuddyMoveHint') : t('teams:builder.bestBuddyHint'),
				onToggle: () => flip(buddyBest, { buddy: !buddyNow, superMega: superNow }, 'buddy'),
			}
		: undefined;
	const superMega =
		member && pokemon?.isSuperMega
			? {
					on: superNow,
					// the two words, in the order the language reads them ("Super Max Mega" / "Mega Super Máximo")
					label: t('teams:builder.superMega', {
						max: t('pokemonDetail:counters.megaLevel.superMax'),
						mega: gameTranslator(GameTranslatorKeys.MegaDisplay, gl),
					}),
					hint: t('teams:builder.superMegaHint'),
					onToggle: () => flip(superBest, { buddy: buddyNow, superMega: !superNow }, 'superMega'),
				}
			: undefined;
	// The card's Reset puts the IVs, the level AND the moves back to the best the Pokémon can be (with its Best Buddy / Super Max
	// Mega statuses as they are), whenever any of them isn't.
	const bestMoves = (pokemon ? (data.rankList[pokemon.speciesId]?.moveset ?? []) : [])
		.filter((m) => m !== 'none')
		.slice(0, MAX_MOVES);
	const movesOptimal = !member || movesAreRecommended(member.slot.moveset, bestMoves);
	const resetAll = showReset({ ivsOptimal, levelOptimal, movesOptimal })
		? () => onBuild(index, resetChange({ buddy: buddyNow, superMega: superNow }, best, bestMoves))
		: undefined;
	// Once the nickname ends in "#<number>", keep that number in step with the IVs as they change.
	useEffect(() => {
		if (!onNicknameChange) return;
		const synced = syncedNickname(nickname, ivRank);
		if (synced !== undefined) onNicknameChange(synced);
	}, [nickname, ivRank, onNicknameChange]);
	// Starting a nickname: prefill the Pokémon's name and its IV rank.
	const prefillNickname = () => {
		if (!onNicknameChange || !pokemon || nickname) return;
		onNicknameChange(starterNickname(cleanName(pokemon.speciesName), ivRank));
	};

	return (
		<>
			<MemberCard
				index={index}
				member={member}
				pokemon={pokemon}
				data={data}
				role={role}
				onChangePokemon={onChangePokemon}
				onMove={onMove}
				onEditIvs={() => setEditing('ivs')}
				onEditLevel={() => setEditing('level')}
				onRemove={onRemove}
				suggestion={suggestion}
				onConfirm={onConfirm}
				confirmLabel={confirmLabel}
				confirmDisabledReason={confirmDisabledReason}
				nickname={nickname}
				onNicknameChange={onNicknameChange}
				onNicknameFocus={prefillNickname}
				ivsOptimal={ivsOptimal}
				levelOptimal={levelOptimal}
				onReset={resetAll}
				overCap={!!member && member.stats.cp > cpCap}
				buddy={buddy}
				superMega={superMega}
				nicknameLabel={nicknameLabel}
			/>
			{member && pokemon && editing === 'ivs' && (
				<IvModal
					name={cleanName(pokemon.speciesName)}
					value={member.stats.ivs}
					onChange={(ivs) => onBuild(index, ivsChange(member.slot, ivs))}
					onClose={() => setEditing(null)}
				/>
			)}
			{member && pokemon && editing === 'level' && (
				<LevelModal
					name={cleanName(pokemon.speciesName)}
					level={member.stats.level}
					baseStats={pokemon.baseStats}
					ivs={member.stats.ivs}
					maxLevel={levelMax}
					buddyMaxLevel={maxLevelOf({ buddy: true, superMega: !!pokemon.isSuperMega })}
					onChange={(level) => onBuild(index, levelChange(level, member.slot.ivs, pokemon, superNow))}
					onClose={() => setEditing(null)}
				/>
			)}
		</>
	);
};

/* --------------------------------- Stage ---------------------------------- */

/** The Pokémon picker for one team slot — opened from a team card or from the Battle plan's step cards. */
export const SlotPicker = ({
	leagueLabel,
	data,
	team,
	slot,
	onSetMember,
	onClose,
}: {
	leagueLabel: string;
	data: TeamsData;
	team: ReadonlyArray<TeamSlotDescriptor>;
	slot: number;
	onSetMember: (index: number, speciesId: string) => void;
	onClose: () => void;
}) => {
	const current = team[slot] ? data.gamemaster[team[slot].speciesId] : undefined;
	const replacing = current ? cleanName(current.speciesName) : undefined;
	const teamBases = useMemo(
		() =>
			new Set(team.filter((_, i) => i !== slot).map((s) => speciesFamilyKey(s.speciesId, (x) => data.gamemaster[x]))),
		[team, slot, data.gamemaster]
	);

	return (
		<PokemonPicker
			leagueLabel={leagueLabel}
			data={data}
			teamBases={teamBases}
			megaTaken={team.some((s, i) => i !== slot && !!data.gamemaster[s.speciesId]?.isMega)}
			replacing={replacing}
			onClose={onClose}
			onPick={(speciesId) => {
				onSetMember(slot, speciesId);
				onClose();
			}}
		/>
	);
};

export const TeamStage = ({
	data,
	team,
	members,
	roleOf,
	onChangePokemon,
	onMove,
	onBuild,
	cpCap,
	onRemove,
	onSuggest,
	suggesting,
}: {
	data: TeamsData;
	team: ReadonlyArray<TeamSlotDescriptor>;
	members: ReadonlyArray<AnalyzedMember>;
	roleOf: (index: number) => TeamRole | undefined;
	onChangePokemon: (index: number) => void;
	onMove: (index: number, moveIndex: number, moveId: string) => void;
	onBuild: (index: number, build: BuildChange) => boolean | void;
	/** The league's CP cap, to tell when a picked level puts a Pokémon over it. */
	cpCap: number;
	onRemove: (index: number) => void;
	/** Finish the team (one or two Pokémon so far) with the best teammates. */
	onSuggest: () => void;
	/** That is being worked out: the empty cards show a spinner. */
	suggesting: boolean;
}) => {
	return (
		<div className='r-tm-stage'>
			{[0, 1, 2].map((i) => (
				<TeamMemberEditor
					key={i}
					index={i}
					member={members[i]}
					pokemon={team[i] ? data.gamemaster[team[i].speciesId] : undefined}
					data={data}
					role={roleOf(i)}
					cpCap={cpCap}
					buddyTaken={team.some((slot, k) => k !== i && isBuddy(slot))}
					onChangePokemon={() => onChangePokemon(i)}
					onMove={(moveIndex, moveId) => onMove(i, moveIndex, moveId)}
					onBuild={onBuild}
					onRemove={() => onRemove(i)}
					suggestion={team.length >= 1 && team.length < 3 ? { pending: suggesting, onSuggest } : undefined}
				/>
			))}
		</div>
	);
};

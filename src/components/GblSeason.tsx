import { type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { GameLanguage, useLanguage } from '../contexts/language-context';
import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import type { GblVerdict, IGblAttackChange, IGblEncounter, IGblSeason } from '../DTOs/IGblSeason';
import { usePlayOnChange } from '../hooks/usePlayOnChange';
import { cleanName, dateRange } from '../lib/format';
import { gblEventId } from '../lib/gbl';
import { R } from '../lib/nav';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';
import { gameTypeDisplayTranslator } from '../utils/GameTranslator';
import { EventActions } from './EventActions';
import { GblRankBadge } from './GblRankBadge';
import { PokeMini } from './PokeMini';
import { RichText } from './RichText';
import { SparkleIcon } from './SparkleIcon';
import { SpriteImg } from './Sprite';

const VERDICTS: ReadonlyArray<GblVerdict> = ['buff', 'adjusted', 'nerf'];
const VERDICT_MARK: Record<GblVerdict, string> = { buff: '▲', adjusted: '⇅', nerf: '▼' };

/** A move's type, as the picture the app draws it with. */
const TypeIcon = ({ type, gl }: { type: string; gl: GameLanguage }) => {
	const name = type.toLowerCase();
	return (
		<img
			className='r-gbl-ico'
			src={`/images/types/${name}.png`}
			alt={gameTypeDisplayTranslator(name, gl) || type}
			width={34}
			height={34}
			loading='lazy'
		/>
	);
};

/** The surprise Legendary that closes the standard encounters: a question mark where the Pokémon would be. */
const SurpriseTile = ({ rank }: { rank: number }) => {
	const { t } = useTranslation(['calendar']);
	return (
		<div className='r-mini r-gbl-surprise' role='img' aria-label={t('calendar:events.gbl.surprise')}>
			<GblRankBadge rank={rank} exact={false} />
			<b aria-hidden='true'>?</b>
			<span>{t('calendar:events.gbl.surpriseShort')}</span>
		</div>
	);
};

/**
 * The reward encounters of the season as the site's Pokémon tiles, laid out as in the post: five to a row, the last row centred. The
 * sparkle shows when one can be shiny and the rank it is met at is drawn over its corner (a rank-up encounter at exactly that rank,
 * a standard one from that rank on: "6+").
 */
const Encounters = ({
	title,
	hint,
	encounters,
	exact,
	surpriseRank,
}: {
	title: string;
	hint: string;
	encounters: ReadonlyArray<IGblEncounter>;
	/** Rank-up encounters: each is at exactly its rank. */
	exact: boolean;
	/** The surprise Legendary that closes the standard encounters, with the rank it starts at. */
	surpriseRank?: number | undefined;
}) => (
	<section className='r-gbl-section'>
		<div className='r-section-h'>
			<SparkleIcon className='r-section-h-icon' />
			{title}
		</div>
		<p className='r-gbl-hint'>{hint}</p>
		<div className='r-gbl-encounters'>
			{encounters.map((e) => (
				<PokeMini
					key={e.speciesId}
					speciesId={e.speciesId}
					shiny={e.shiny}
					badge={<GblRankBadge rank={e.rank} exact={exact} />}
				/>
			))}
			{surpriseRank !== undefined && <SurpriseTile rank={surpriseRank} />}
		</div>
	</section>
);

/** The moves of a list split in Fast and Charged ones (in that order), each under its own title with a rule: no tag on every move. */
const KindSections = <T,>({
	items,
	isFast,
	children,
}: {
	items: ReadonlyArray<T>;
	isFast: (item: T) => boolean;
	children: (items: ReadonlyArray<T>) => ReactNode;
}) => {
	const { t } = useTranslation(['pokemonDetail']);
	const groups = [
		{ key: 'fast', title: t('pokemonDetail:moves.fastMoves'), list: items.filter(isFast) },
		{ key: 'charged', title: t('pokemonDetail:moves.chargedMoves'), list: items.filter((item) => !isFast(item)) },
	];
	return (
		<>
			{groups
				.filter((group) => group.list.length > 0)
				.map((group) => (
					<div key={group.key} className='r-gbl-kind-group'>
						<h5 className='r-gbl-kind-h'>{group.title}</h5>
						{children(group.list)}
					</div>
				))}
		</>
	);
};

/**
 * A move's changes exactly as the post words them in the player's language (the old value struck through). Each bullet point has the
 * arrow of what it does (better, worse) when the language has the same bullet points as the English post; otherwise a plain dot.
 */
const AttackChange = ({
	change,
	move,
	gl,
}: {
	change: IGblAttackChange;
	move: IGameMasterMove | undefined;
	gl: GameLanguage;
}) => {
	const blocks = change.text[gl] ?? change.text[GameLanguage.en];
	const aligned = blocks.length === change.directions.length;
	return (
		<li className='r-gbl-move'>
			<div className='r-gbl-move-head'>
				{move && <TypeIcon type={move.type} gl={gl} />}
				<Link to={R.move(change.moveId)}>{move?.moveName[gl] ?? cleanName(change.moveId)}</Link>
			</div>
			<RichText
				blocks={blocks}
				className='r-gbl-text'
				bullet={(_block, index) => {
					const direction = aligned ? change.directions[index] : 'mixed';
					return (
						<span className='r-gbl-arrow' data-dir={direction} aria-hidden='true'>
							{direction === 'buff' ? '▲' : direction === 'nerf' ? '▼' : '•'}
						</span>
					);
				}}
			/>
		</li>
	);
};

/** The moves that change, in three lists (buffed, adjusted, nerfed), each split in Fast and Charged moves. */
const AttackChanges = ({ changes }: { changes: ReadonlyArray<IGblAttackChange> }) => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	const { moves } = useMoves();
	const heading = {
		buff: t('calendar:events.gbl.verdict.buff'),
		adjusted: t('calendar:events.gbl.verdict.adjusted'),
		nerf: t('calendar:events.gbl.verdict.nerf'),
	};
	return (
		<section className='r-gbl-section'>
			<div className='r-section-h'>
				<SparkleIcon className='r-section-h-icon' />
				{t('calendar:events.gbl.attackChanges')}
			</div>
			{VERDICTS.map((verdict) => {
				const list = changes.filter((c) => c.verdict === verdict);
				return list.length > 0 ? (
					<div key={verdict} className='r-gbl-verdict' data-verdict={verdict}>
						<h4 className='r-gbl-verdict-h'>
							<span aria-hidden='true'>{VERDICT_MARK[verdict]}</span>
							{heading[verdict]}
							<em>{list.length}</em>
						</h4>
						<KindSections items={list} isFast={(c) => !!moves[c.moveId]?.isFast}>
							{(group) => (
								<ul className='r-gbl-moves'>
									{group.map((c) => (
										<AttackChange key={c.moveId} change={c} move={moves[c.moveId]} gl={gl} />
									))}
								</ul>
							)}
						</KindSections>
					</div>
				) : null;
			})}
		</section>
	);
};

/** The Pokémon that learn a new attack: a compact card per attack, with its Pokémon as chips. */
const AttackAvailability = ({ availability }: { availability: IGblSeason['attackAvailability'] }) => {
	const { t } = useTranslation(['calendar']);
	const { currentGameLanguage: gl } = useLanguage();
	const { moves } = useMoves();
	const { gamemasterPokemon } = usePokemon();
	const byMove = new Map<string, Array<string>>();
	for (const { moveId, speciesId } of availability) {
		byMove.set(moveId, [...(byMove.get(moveId) ?? []), speciesId]);
	}
	return (
		<section className='r-gbl-section'>
			<div className='r-section-h'>
				<SparkleIcon className='r-section-h-icon' />
				{t('calendar:events.gbl.attackAvailability')}
			</div>
			<KindSections items={[...byMove]} isFast={([moveId]) => !!moves[moveId]?.isFast}>
				{(group) => (
					<ul className='r-gbl-learns'>
						{group.map(([moveId, speciesIds]) => {
							const move = moves[moveId];
							return (
								<li key={moveId} className='r-gbl-learn'>
									<div className='r-gbl-move-head'>
										{move && <TypeIcon type={move.type} gl={gl} />}
										<Link to={R.move(moveId)}>{move?.moveName[gl] ?? cleanName(moveId)}</Link>
									</div>
									<div className='r-gbl-chips'>
										{speciesIds.map((speciesId) => {
											const pokemon = gamemasterPokemon[speciesId];
											return pokemon ? (
												<Link key={speciesId} to={R.pokemon(speciesId)} className='r-gbl-chip'>
													<SpriteImg pokemon={pokemon} loading='lazy' />
													<span>{cleanName(pokemon.speciesName)}</span>
												</Link>
											) : null;
										})}
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</KindSections>
		</section>
	);
};

/**
 * The GO Battle League post of the season, as a card next to the Season's: the season's dates are the Season's own (the post always
 * matches it), the body is the rank-up and standard reward encounters, the attack changes and the Pokémon that learn new attacks.
 */
export const GblSeasonCard = ({
	season,
	startDate,
	endDate,
	open,
	onToggle,
	unseen,
}: {
	season: IGblSeason;
	/** The Season's dates. */
	startDate: number;
	endDate: number;
	open: boolean;
	/** Told which card it is, to keep it where it is on the page while the open one changes (see `useScrollAnchor`). */
	onToggle: (card: HTMLElement | null) => void;
	unseen: boolean;
}) => {
	const { t } = useTranslation(['calendar']);
	const { currentLanguage, currentGameLanguage: gl } = useLanguage();
	const cardRef = useRef<HTMLDivElement>(null);
	usePlayOnChange(cardRef, open);
	return (
		<div className='r-event r-gbl' ref={cardRef} data-open={open} data-event={gblEventId(season)}>
			<button
				type='button'
				className='r-event-head'
				onClick={(e) => onToggle(e.currentTarget.closest<HTMLElement>('[data-event]'))}
			>
				{season.imageUrl && <img src={season.imageUrl} alt='' loading='lazy' />}
				<div>
					<b>
						{unseen && <i className='r-event-new' aria-label={t('calendar:events.unseenAriaLabel')} />}
						{t('calendar:events.gbl.title', { season: season.name[gl] ?? season.name[GameLanguage.en] })}
					</b>
					<span>{dateRange(startDate, endDate, currentLanguage)}</span>
				</div>
				<i className='r-phase' data-phase='season'>
					PvP
				</i>
			</button>
			{open && (
				<div className='r-event-body'>
					<Encounters
						title={t('calendar:events.gbl.rankUp')}
						hint={t('calendar:events.gbl.rankUpHint')}
						encounters={season.rankUpEncounters}
						exact
					/>
					<Encounters
						title={t('calendar:events.gbl.standard')}
						hint={t('calendar:events.gbl.standardHint')}
						encounters={season.standardEncounters}
						exact={false}
						surpriseRank={season.legendarySurprise?.rank}
					/>
					<AttackChanges changes={season.attackChanges} />
					<AttackAvailability availability={season.attackAvailability} />
					<EventActions
						eventId={gblEventId(season)}
						announcementUrl={`https://pokemongo.com/${gl}/news/${season.slug}`}
					/>
				</div>
			)}
		</div>
	);
};

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { spriteUrl } from '../../components/Sprite';
import { useImageSource } from '../../contexts/imageSource-context';
import { useLanguage } from '../../contexts/language-context';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { cleanName } from '../../lib/format';
import { R } from '../../lib/nav';
import { typeVar } from '../../lib/types';
import { useMoves } from '../../queries/moves';
import { usePokemon } from '../../queries/pokemon';
import { usePvp } from '../../queries/pvp';
import { ConfigKeys, readPersistentValue, writePersistentValue } from '../../utils/persistent-configs-handler';
import { getComputeWorker } from '../../workers/compute-client';

const LEAGUE_NAME = ['Great', 'Ultra', 'Master', 'Raid'] as const;
const LG_SLUG = ['great', 'ultra', 'master', 'raid'] as const;
const PVP_TOP = 5;
const RAID_TOP = 10;

const CountersTab = ({ pokemon, league }: { pokemon: IGamemasterPokemon; league: number }) => {
	const { gamemasterPokemon, fetchCompleted } = usePokemon();
	const { rankLists, pvpFetchCompleted } = usePvp();
	const { moves, movesFetchCompleted } = useMoves();
	const { currentGameLanguage: gl } = useLanguage();
	const { imageSource } = useImageSource();

	const isRaid = league === 3;

	const [mega, setMega] = useState(() => readPersistentValue(ConfigKeys.Mega) !== 'false');
	const [shadow, setShadow] = useState(() => readPersistentValue(ConfigKeys.Shadow) !== 'false');
	useEffect(() => void writePersistentValue(ConfigKeys.Mega, String(mega)), [mega]);
	useEffect(() => void writePersistentValue(ConfigKeys.Shadow, String(shadow)), [shadow]);

	// PvP: the pre-computed ranked entry for this exact species (as in the legacy site).
	const ranked = useMemo(
		() => (isRaid ? undefined : rankLists[league]?.[pokemon.speciesId]),
		[isRaid, rankLists, league, pokemon.speciesId]
	);

	const ready = fetchCompleted && (isRaid ? movesFetchCompleted : pvpFetchCompleted);

	const { data: raidCounters = [], isFetching: raidLoading } = useQuery({
		enabled: isRaid && ready,
		queryKey: ['raid-counters', pokemon.speciesId],
		queryFn: () =>
			getComputeWorker().raidComparisons({
				candidates: Object.values(gamemasterPokemon).filter((p) => !p.aliasId),
				moves,
				target: pokemon,
			}),
		staleTime: Infinity,
		gcTime: 30 * 60 * 1000,
	});

	const link = (speciesId: string) => `${R.pokemon(speciesId, 'counters')}?lg=${LG_SLUG[league]}`;
	const moveName = (id: string) => moves[id]?.moveName[gl] ?? cleanName(id);

	if (!ready) {
		return (
			<div className='r-loading' style={{ minHeight: '30dvh' }}>
				<div className='r-spinner' />
			</div>
		);
	}

	/* ---- PvP leagues (Great / Ultra / Master) ---- */
	if (!isRaid) {
		if (!ranked) {
			return (
				<div className='r-movecontent'>
					<div className='r-card' style={{ textAlign: 'center' }}>
						<p className='r-muted'>
							{cleanName(pokemon.speciesName)} isn’t ranked in {LEAGUE_NAME[league]} League — no pre-computed match-ups.
						</p>
					</div>
				</div>
			);
		}

		const name = cleanName(pokemon.speciesName);
		const section = (title: string, list: ReadonlyArray<{ opponent: string; rating: number }>) => (
			<>
				<div className='r-section-h'>{title}</div>
				<div className='r-ctr-list'>
					{list.length === 0 && <p className='r-muted'>No data.</p>}
					{list.map((m, i) => {
						const p = gamemasterPokemon[m.opponent];
						if (!p) return null;
						return (
							<Link
								key={m.opponent}
								to={link(m.opponent)}
								className='r-ctr-row'
								style={{ ['--tc' as string]: typeVar(p.types[0]) }}
							>
								<span className='r-ctr-rank'>{i + 1}</span>
								<span className='r-ctr-art'>
									<img src={spriteUrl(p, imageSource)} alt='' loading='lazy' decoding='async' />
								</span>
								<span className='r-ctr-name'>{cleanName(p.speciesName)}</span>
								<span className='r-ctr-score' data-tone={m.rating >= 500 ? 'win' : 'lose'}>
									{(m.rating / 10).toFixed(1)}%
								</span>
							</Link>
						);
					})}
				</div>
			</>
		);

		return (
			<div className='r-movecontent'>
				{section(`${name} is strong against · ${LEAGUE_NAME[league]} League`, ranked.matchups.slice(0, PVP_TOP))}
				{section(`${name} is weak against · ${LEAGUE_NAME[league]} League`, ranked.counters.slice(0, PVP_TOP))}
			</div>
		);
	}

	/* ---- Raid ---- */
	const list = raidCounters
		.filter((e) => {
			const p = gamemasterPokemon[e.speciesId];
			return p && (shadow || !p.isShadow) && (mega || !p.isMega);
		})
		.slice(0, RAID_TOP);

	return (
		<div className='r-movecontent'>
			<div className='r-section-h'>Best raid counters · {cleanName(pokemon.speciesName)}</div>

			<div className='r-ctr-toggles'>
				<button
					type='button'
					className='r-ctr-toggle'
					data-on={mega ? '' : undefined}
					onClick={() => setMega((v) => !v)}
				>
					<span className='r-ss-box' aria-hidden='true' />
					Include Megas
				</button>
				<button
					type='button'
					className='r-ctr-toggle'
					data-on={shadow ? '' : undefined}
					onClick={() => setShadow((v) => !v)}
				>
					<span className='r-ss-box' aria-hidden='true' />
					Include Shadows
				</button>
			</div>

			{raidLoading && list.length === 0 ? (
				<div className='r-loading' style={{ minHeight: '20dvh' }}>
					<div className='r-spinner' />
				</div>
			) : (
				<div className='r-ctr-list'>
					{list.length === 0 && <p className='r-muted'>No counters match those filters.</p>}
					{list.map((e, i) => {
						const p = gamemasterPokemon[e.speciesId];
						if (!p) return null;
						return (
							<div
								key={e.speciesId}
								className='r-ctr-row r-ctr-row--raid'
								style={{ ['--tc' as string]: typeVar(p.types[0]) }}
							>
								<span className='r-ctr-rank'>{i + 1}</span>
								<Link to={link(e.speciesId)} className='r-ctr-art'>
									<img src={spriteUrl(p, imageSource)} alt='' loading='lazy' decoding='async' />
								</Link>
								<div className='r-ctr-mid'>
									<Link to={link(e.speciesId)} className='r-ctr-name'>
										{cleanName(p.speciesName)}
									</Link>
									<span className='r-ctr-moves'>
										<Link to={R.move(e.fastMove)}>{moveName(e.fastMove)}</Link>
										<i>+</i>
										<Link to={R.move(e.chargedMove)}>{moveName(e.chargedMove)}</Link>
									</span>
								</div>
								<span className='r-ctr-score'>
									{e.dps.toFixed(1)}
									<i>DPS</i>
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default CountersTab;

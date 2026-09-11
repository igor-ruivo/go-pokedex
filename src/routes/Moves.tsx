import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { FilterBar } from '../components/FilterBar';
import { MoveStatRows } from '../components/MoveStatRows';
import { SortBar, type SortDir, type SortOption } from '../components/SortBar';
import { useLanguage } from '../contexts/language-context';
import { cleanName } from '../lib/format';
import { type Arena, buffText, moveDPE, moveDPS, moveEPS } from '../lib/moves';
import { R } from '../lib/nav';
import { TYPE_KEYS, TYPE_LABEL } from '../lib/types';
import { useMoves } from '../queries/moves';

// PvE / PvP are split out so it's unambiguous which stat a sort acts on.
const MOVE_SORTS: ReadonlyArray<SortOption> = [
	{ key: 'name', label: 'Name', defaultDir: 'asc' },
	{ key: 'dmg_pve', label: 'DMG · PvE', defaultDir: 'desc' },
	{ key: 'dmg_pvp', label: 'DMG · PvP', defaultDir: 'desc' },
	{ key: 'nrg_pve', label: 'NRG · PvE', defaultDir: 'desc' },
	{ key: 'nrg_pvp', label: 'NRG · PvP', defaultDir: 'desc' },
	{ key: 'cd_pve', label: 'DUR · PvE', defaultDir: 'asc' },
	{ key: 'cd_pvp', label: 'TURNS · PvP', defaultDir: 'asc' },
	{ key: 'dps_pve', label: 'DPS · PvE', defaultDir: 'desc' },
	{ key: 'dps_pvp', label: 'DPS · PvP', defaultDir: 'desc' },
	{ key: 'eps_pve', label: 'EPS · PvE', defaultDir: 'desc' },
	{ key: 'eps_pvp', label: 'EPS · PvP', defaultDir: 'desc' },
	{ key: 'dpe_pve', label: 'DPE · PvE', defaultDir: 'desc' },
	{ key: 'dpe_pvp', label: 'DPE · PvP', defaultDir: 'desc' },
];

// Fixed row heights (the list buff line is clamped to 1 line) so the virtualizer
// needs no per-element measurement — exact estimates = no scroll drift / gaps.
const ROW_PLAIN = 100; // 92px card + 8px gap
const ROW_BUFF = 124; // + the one-line buff row

type Kind = 'all' | 'fast' | 'charged';

const Moves = () => {
	const { moves, movesFetchCompleted } = useMoves();
	const { currentGameLanguage: gl } = useLanguage();
	const [kind, setKind] = useState<Kind>('all');
	const [type, setType] = useState<Array<string>>([]);
	const [sortKey, setSortKey] = useState('name');
	const [sortDir, setSortDir] = useState<SortDir>('asc');
	// the app-bar search box writes `?q=` live as you type (same as the
	// Pokédex/Rankings grids) — this page just reads it back.
	const [params] = useSearchParams();
	const q = (params.get('q') ?? '').toLowerCase().trim();

	const list = useMemo(() => {
		const t = type[0];
		const seen = new Set<string>();
		const filtered = Object.values(moves).filter((m) => {
			if (kind === 'fast' && !m.isFast) return false;
			if (kind === 'charged' && m.isFast) return false;
			if (t && m.type.toLowerCase() !== t) return false;
			if (q && !(m.moveName[gl] ?? m.moveId).toLowerCase().includes(q)) return false;
			// collapse only exact cosmetic clones — same name AND identical stats
			// (Wrap Green/Pink, Scald Blastoise…). Anything with different stats
			// (incl. the Aegislash stance-change variants) is kept.
			const sig = `${m.moveName[gl] ?? m.moveId}|${m.type}|${m.isFast}|${m.pvePower}|${m.pveEnergy}|${m.pveCooldown}|${m.pvpPower}|${m.pvpEnergy}|${m.pvpCooldown}`;
			if (seen.has(sig)) return false;
			seen.add(sig);
			return true;
		});

		const name = (m: (typeof filtered)[number]) => m.moveName[gl] ?? m.moveId;
		const s = sortDir === 'asc' ? 1 : -1;
		const num = (k: string, m: (typeof filtered)[number]): number => {
			const [metric, arenaStr] = k.split('_');
			const arena: Arena = arenaStr === 'pvp' ? 'pvp' : 'pve';
			switch (metric) {
				case 'dmg':
					return arena === 'pve' ? m.pvePower : m.pvpPower;
				case 'nrg':
					return Math.abs(arena === 'pve' ? m.pveEnergy : m.pvpEnergy);
				case 'cd':
					return arena === 'pve' ? m.pveCooldown : m.pvpCooldown;
				case 'dps':
					return moveDPS(m, arena);
				case 'eps':
					return moveEPS(m, arena);
				case 'dpe':
					return moveDPE(m, arena);
				default:
					return 0;
			}
		};
		filtered.sort((a, b) =>
			sortKey === 'name'
				? s * name(a).localeCompare(name(b))
				: s * (num(sortKey, a) - num(sortKey, b)) || name(a).localeCompare(name(b))
		);
		return filtered;
	}, [moves, kind, type, gl, sortKey, sortDir, q]);

	const listRef = useRef<HTMLDivElement>(null);
	const [scrollMargin, setScrollMargin] = useState(0);
	useEffect(() => {
		setScrollMargin(listRef.current?.offsetTop ?? 0);
	}, [list.length]);

	const rowHeight = (i: number) => {
		const m = list[i];
		return m && !m.isFast && buffText(m.buffs) ? ROW_BUFF : ROW_PLAIN;
	};
	const virt = useWindowVirtualizer({
		count: list.length,
		estimateSize: rowHeight,
		// key by moveId so re-sorting doesn't reuse a stale height for a slot
		getItemKey: (i) => list[i]?.moveId ?? String(i),
		overscan: 8,
		scrollMargin,
	});

	// getMeasurements() memoises on itemSizeCache; re-sorting keeps count/keys the
	// same, so force a fresh pass whenever the ordering (the list ref) changes.
	useEffect(() => {
		virt.measure();
	}, [list, virt]);

	if (!movesFetchCompleted) {
		return (
			<div className='r-loading'>
				<div className='r-spinner' />
			</div>
		);
	}

	return (
		<div className='r-shell'>
			<h1 className='r-page-title'>Moves</h1>

			<div className='r-seg' role='tablist' aria-label='Move kind'>
				{(['all', 'fast', 'charged'] as const).map((k) => (
					<button key={k} type='button' data-active={kind === k} onClick={() => setKind(k)}>
						{k === 'all' ? 'All' : k === 'fast' ? 'Fast' : 'Charged'}
					</button>
				))}
			</div>

			<div className='r-controls'>
				<FilterBar types={TYPE_KEYS} selected={type} onChange={setType} single />
				<SortBar
					options={MOVE_SORTS}
					sortKey={sortKey}
					dir={sortDir}
					onChange={(k, d) => {
						setSortKey(k);
						setSortDir(d);
					}}
				/>
			</div>

			<p className='r-muted r-count'>{list.length.toLocaleString()} moves</p>

			<div ref={listRef}>
				<div style={{ height: virt.getTotalSize(), position: 'relative' }}>
					{virt.getVirtualItems().map((vi) => {
						const m = list[vi.index];
						if (!m) return null;
						const t = m.type.toLowerCase();
						return (
							<div
								key={m.moveId}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									height: rowHeight(vi.index),
									paddingBottom: 8,
									transform: `translateY(${vi.start - virt.options.scrollMargin}px)`,
								}}
							>
								<Link
									to={R.move(m.moveId)}
									className='r-move r-move--link'
									style={{ ['--tc' as string]: `var(--t-${t})` }}
								>
									<div className='r-move-head'>
										<span className='r-move-type'>{TYPE_LABEL[t] ?? m.type}</span>
										<b>{m.moveName[gl] ?? cleanName(m.moveId)}</b>
										<i className='r-move-tag'>{m.isFast ? 'Fast' : 'Charged'}</i>
									</div>
									<MoveStatRows m={m} />
								</Link>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default Moves;

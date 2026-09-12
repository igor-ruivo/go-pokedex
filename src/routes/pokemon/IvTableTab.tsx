import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';

import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { useBestIvs } from '../../hooks/useBestIvs';
import { cleanName } from '../../lib/format';

const CAP = [1500, 2500, Number.MAX_VALUE] as const;
const LEAGUE_NAME = ['Great', 'Ultra', 'Master'] as const;
const ROW_H = 44;
const VISIBLE_ROWS = 50; // show ~50 spreads, then the list scrolls inside itself

type IvFields = [string, string, string];
const FIELD_LABEL = ['ATK', 'DEF', 'HP'] as const;

const clamp15 = (s: string) => {
	const n = Number.parseInt(s, 10);
	return Number.isNaN(n) ? '' : String(Math.max(0, Math.min(15, n)));
};

// Truncate to one decimal (no rounding — matches pvpivs.com), then drop a
// trailing ".0" so a whole value like 178.0 reads "178" and 100.0% reads "100%".
const dec1 = (n: number) => {
	const t = Math.trunc(n * 10) / 10;
	return Number.isInteger(t) ? String(t) : t.toFixed(1);
};

const IvTableTab = ({ pokemon, league }: { pokemon: IGamemasterPokemon; league: number }) => {
	const isPvp = league === 0 || league === 1 || league === 2;
	const rows = useBestIvs(pokemon, isPvp ? CAP[league] : 1500, isPvp);

	const [fields, setFields] = useState<IvFields>(['', '', '']);
	const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

	const triplet = useMemo<[number, number, number] | null>(() => {
		if (fields.some((v) => v === '')) return null;
		const nums = fields.map(Number) as [number, number, number];
		return nums.some((n) => n < 0 || n > 15) ? null : nums;
	}, [fields]);
	const anyEntered = fields.some((v) => v !== '');

	// Typing/pasting a whole spread ("15 / 14 / 15", "151415", "15,14,15") into
	// ANY box splits it across all three — so the mobile numeric keypad, which
	// has no "/", still works.
	const setField = (idx: number, raw: string) => {
		const groups = raw.match(/\d{1,2}/g);
		if (/\D/.test(raw) && groups && groups.length >= 3) {
			setFields([clamp15(groups[0]), clamp15(groups[1]), clamp15(groups[2])]);
			return;
		}
		const digits = raw.replace(/\D/g, '');
		if (digits.length === 6) {
			setFields([clamp15(digits.slice(0, 2)), clamp15(digits.slice(2, 4)), clamp15(digits.slice(4, 6))]);
			return;
		}
		setFields((prev) => {
			const next = [...prev] as IvFields;
			next[idx] = digits.slice(0, 2);
			return next;
		});
	};

	const matchIdx = useMemo(() => {
		if (!triplet) return -1;
		return rows.findIndex((r) => r.IVs.A === triplet[0] && r.IVs.D === triplet[1] && r.IVs.S === triplet[2]);
	}, [rows, triplet]);
	const bestProd = rows[0] ? rows[0].battle.A * rows[0].battle.D * rows[0].battle.S : 1;
	const match = matchIdx >= 0 ? rows[matchIdx] : undefined;

	const scrollRef = useRef<HTMLDivElement>(null);
	const virt = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_H,
		overscan: 12,
	});

	if (!isPvp) {
		return (
			<div className='r-movecontent'>
				<div className='r-card' style={{ textAlign: 'center' }}>
					<p className='r-muted'>IV rankings don’t apply to raids — pick Great, Ultra or Master above.</p>
				</div>
			</div>
		);
	}

	if (rows.length === 0) {
		return (
			<div className='r-loading' style={{ minHeight: '30dvh' }}>
				<div className='r-spinner' />
			</div>
		);
	}

	// Stat-product percentile vs the #1 spread (formatted with `dec1`).
	const pctOf = (r: (typeof rows)[number]) => (r.battle.A * r.battle.D * r.battle.S * 100) / bestProd;
	// The bar shows where a spread sits *within the possible range*: the #1 spread
	// fills it, the #4096 (worst) spread empties it. The number still reports the
	// true stat-product percentile (~89% for the worst).
	const worstRow = rows[rows.length - 1];
	const worstPct = worstRow ? pctOf(worstRow) : 0;
	const barSpan = 100 - worstPct;
	const barOf = (r: (typeof rows)[number]) =>
		barSpan > 0.01 ? Math.max(0, Math.min(100, ((pctOf(r) - worstPct) / barSpan) * 100)) : 100;

	return (
		<div className='r-movecontent'>
			<div className='r-section-h'>
				{LEAGUE_NAME[league]} League · all 4,096 IV spreads for {pokemon.isShadow ? 'Shadow ' : ''}
				{cleanName(pokemon.speciesName)}
			</div>

			<div className='r-iv-search'>
				{FIELD_LABEL.map((label, i) => (
					<label key={label}>
						<span>{label}</span>
						<input
							value={fields[i] ?? ''}
							onChange={(e) => setField(i, e.target.value)}
							inputMode='numeric'
							pattern='[0-9]*'
							maxLength={2}
							placeholder='–'
							aria-label={`${label} IV, 0 to 15`}
						/>
					</label>
				))}
				{anyEntered && (
					<button
						type='button'
						className='r-iv-search-clear'
						onClick={() => setFields(['', '', ''])}
						aria-label='Clear'
					>
						×
					</button>
				)}
			</div>

			{anyEntered &&
				(match ? (
					<div className='r-ivt-found'>
						<span className='r-ivt-found-rank'>#{(matchIdx + 1).toLocaleString()}</span>
						<span className='r-ivt-found-iv'>
							{match.IVs.A} / {match.IVs.D} / {match.IVs.S}
						</span>
						<span className='r-ivt-found-stats'>
							<span>
								ATK <b>{dec1(match.battle.A)}</b>
							</span>
							<span>
								DEF <b>{dec1(match.battle.D)}</b>
							</span>
							<span>
								HP <b>{Math.floor(match.battle.S)}</b>
							</span>
						</span>
						<span className='r-ivt-found-meta'>
							{match.CP} CP · L{match.L} · {dec1(pctOf(match))}%
						</span>
					</div>
				) : (
					<p className='r-muted r-ivt-none'>
						{triplet ? 'That spread isn’t in the ranking.' : 'Fill in all three (0–15).'}
					</p>
				))}

			<div className='r-ivt' onMouseLeave={() => setHover(null)}>
				<div className='r-ivt-head'>
					{['#', 'IVs', 'Atk · Def · HP', '%', '', 'CP', 'Lvl'].map((label, c) => (
						<span
							key={c}
							data-colhot={hover?.c === c ? '' : undefined}
							onMouseEnter={() => setHover({ r: -1, c })}
							aria-hidden={label === '' ? 'true' : undefined}
						>
							{label}
						</span>
					))}
				</div>
				<div className='r-ivt-scroll' ref={scrollRef} style={{ maxHeight: `min(${ROW_H * VISIBLE_ROWS}px, 85dvh)` }}>
					<div style={{ height: virt.getTotalSize(), position: 'relative' }}>
						{virt.getVirtualItems().map((vi) => {
							const r = rows[vi.index];
							if (!r) return null;
							const on = (c: number) => () => setHover({ r: vi.index, c });
							const hot = (c: number) => (hover?.c === c ? '' : undefined);
							return (
								<div
									key={vi.index}
									className='r-ivt-row'
									data-match={vi.index === matchIdx ? '' : undefined}
									data-hot={hover?.r === vi.index ? '' : undefined}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										height: ROW_H,
										transform: `translateY(${vi.start}px)`,
									}}
								>
									<span className='r-ivt-rank' data-colhot={hot(0)} onMouseEnter={on(0)}>
										{(vi.index + 1).toLocaleString()}
									</span>
									<span className='r-ivt-iv' data-colhot={hot(1)} onMouseEnter={on(1)}>
										<b>{r.IVs.A}</b>
										<i>/</i>
										<b>{r.IVs.D}</b>
										<i>/</i>
										<b>{r.IVs.S}</b>
									</span>
									<span className='r-ivt-stats' data-colhot={hot(2)} onMouseEnter={on(2)}>
										{dec1(r.battle.A)} <i>·</i> {dec1(r.battle.D)} <i>·</i> {Math.floor(r.battle.S)}
									</span>
									<span className='r-ivt-pct' data-colhot={hot(3)} onMouseEnter={on(3)}>
										{dec1(pctOf(r))}%
									</span>
									<span className='r-ivt-bar' data-colhot={hot(4)} onMouseEnter={on(4)}>
										<span className='r-ivt-bar-fill' style={{ width: `${barOf(r)}%` }} />
									</span>
									<span className='r-ivt-cp' data-colhot={hot(5)} onMouseEnter={on(5)}>
										{r.CP}
									</span>
									<span className='r-ivt-lvl' data-colhot={hot(6)} onMouseEnter={on(6)}>
										{r.L}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

export default IvTableTab;

import { Fragment, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { fmtMult, isDoubleMult, typeMatchups } from '../lib/effectiveness';
import { TYPE_LABEL, typeVar } from '../lib/types';
import { computeMoveEffectiveness } from '../utils/pokemon-helper';

// Column / row order for the chart (the canonical Pokémon type order).
const ORDER = [
	'normal',
	'fighting',
	'flying',
	'poison',
	'ground',
	'rock',
	'bug',
	'ghost',
	'steel',
	'fire',
	'water',
	'grass',
	'electric',
	'psychic',
	'ice',
	'dragon',
	'dark',
	'fairy',
];

const tier = (m: number): 'se' | 'nn' | 'nve' | 'imm' => {
	if (m > 1.1) return 'se';
	if (m > 0.9) return 'nn';
	if (m > 0.5) return 'nve';
	return 'imm';
};

const cellText = (m: number) => (tier(m) === 'nn' ? '' : m.toFixed(m < 1 ? 2 : 1));

const TypeIcon = ({ t, size = 20 }: { t: string; size?: number }) => (
	<img
		className='r-tc-ic'
		src={`/images/types/${t}.png`}
		alt={TYPE_LABEL[t] ?? t}
		width={size}
		height={size}
		loading='lazy'
		decoding='async'
	/>
);

const Types = () => {
	const { t } = useTranslation(['types']);
	const [def, setDef] = useState<Array<string>>([]);
	const [hover, setHover] = useState<{ a: string; d: string } | null>(null);

	const { weak, resist } = useMemo(() => (def.length ? typeMatchups(def) : { weak: [], resist: [] }), [def]);

	const toggleDef = (t: string) =>
		setDef((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].slice(-2)));

	return (
		<div className='r-shell r-shell--wide'>
			<h1 className='r-page-title'>{t('types:page.title')}</h1>

			<p className='r-muted' style={{ margin: '0 2px 12px', fontSize: 12 }}>
				<Trans i18nKey='types:page.description' components={{ b: <b /> }} />
			</p>

			<div className='r-tc-scroll'>
				<div className='r-tc-grid' onMouseLeave={() => setHover(null)}>
					<div className='r-tc-corner' aria-hidden='true' />
					{ORDER.map((d) => (
						<div
							key={`h-${d}`}
							className='r-tc-colh'
							data-hot={hover?.d === d ? '' : undefined}
							style={{ ['--tc' as string]: typeVar(d) }}
							title={TYPE_LABEL[d]}
						>
							<TypeIcon t={d} size={18} />
						</div>
					))}

					{ORDER.map((a) => (
						<Fragment key={`r-${a}`}>
							<div
								className='r-tc-rowh'
								data-hot={hover?.a === a ? '' : undefined}
								style={{ ['--tc' as string]: typeVar(a) }}
								title={TYPE_LABEL[a]}
							>
								<TypeIcon t={a} size={18} />
							</div>
							{ORDER.map((d) => {
								const m = computeMoveEffectiveness(a, d);
								const onAxis = hover?.a === a || hover?.d === d;
								const isHot = hover?.a === a && hover?.d === d;
								return (
									<div
										key={`${a}-${d}`}
										className='r-tc-cell'
										data-t={tier(m)}
										data-axis={onAxis && !isHot ? '' : undefined}
										data-hot={isHot ? '' : undefined}
										onMouseEnter={() => setHover({ a, d })}
										title={`${TYPE_LABEL[a]} → ${TYPE_LABEL[d]}: ${m.toFixed(3)}×`}
									>
										{cellText(m)}
									</div>
								);
							})}
						</Fragment>
					))}
				</div>
			</div>

			<div className='r-tc-legend'>
				<span data-t='se'>{t('types:legend.superEffective')}</span>
				<span data-t='nve'>{t('types:legend.resisted')}</span>
				<span data-t='imm'>{t('types:legend.immune')}</span>
			</div>

			<div className='r-section-h'>{t('types:calculator.title')}</div>
			<div className='r-card r-tc-calc'>
				<div>
					<span className='r-tc-pick-l'>{t('types:calculator.defendingTypesLabel')}</span>
					<div className='r-eff-list'>
						{ORDER.map((t) => (
							<button
								key={t}
								type='button'
								className='r-eff-t r-tc-pchip'
								data-active={def.includes(t) ? '' : undefined}
								style={{ ['--tc' as string]: typeVar(t) }}
								onClick={() => toggleDef(t)}
							>
								{TYPE_LABEL[t]}
							</button>
						))}
					</div>
				</div>

				{def.length > 0 && (
					<div className='r-tc-results'>
						<div className='r-tc-res'>
							<h4>{t('types:calculator.takesExtraFrom')}</h4>
							<div className='r-eff-list'>
								{weak.length ? (
									weak.map(({ type, mult }) => (
										<span
											key={type}
											className='r-eff-t'
											data-double={isDoubleMult(mult) ? '' : undefined}
											style={{ ['--tc' as string]: typeVar(type) }}
										>
											{TYPE_LABEL[type]}
											<span className='r-eff-mult'>{fmtMult(mult)}</span>
										</span>
									))
								) : (
									<span className='r-muted'>{t('types:calculator.nothing')}</span>
								)}
							</div>
						</div>
						<div className='r-tc-res'>
							<h4>{t('types:calculator.takesLessFrom')}</h4>
							<div className='r-eff-list'>
								{resist.length ? (
									resist.map(({ type, mult }) => (
										<span
											key={type}
											className='r-eff-t'
											data-double={isDoubleMult(mult) ? '' : undefined}
											style={{ ['--tc' as string]: typeVar(type) }}
										>
											{TYPE_LABEL[type]}
											<span className='r-eff-mult'>{fmtMult(mult)}</span>
										</span>
									))
								) : (
									<span className='r-muted'>{t('types:calculator.nothing')}</span>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Types;

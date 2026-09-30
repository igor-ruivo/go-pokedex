import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { CombatHexagon } from '../../components/CombatHexagon';
import { useLanguage } from '../../contexts/language-context';
import type { ActiveLeague } from '../../DTOs/IActiveLeague';
import type { IGamemasterPokemon } from '../../DTOs/IGamemasterPokemon';
import { COMBAT_METRICS } from '../../lib/combat';
import { combatMetricDescriptions, combatMetricNames } from '../../lib/combat-text';
import { fmtMult, isDoubleMult, typeMatchups } from '../../lib/effectiveness';
import { cleanName, sentenceCase } from '../../lib/format';
import gameTranslator, { GameTranslatorKeys, gameTypeDisplayTranslator } from '../../utils/GameTranslator';

/**
 * Everything about how this Pokémon actually fights, per league: PvPoke's six
 * role scores as a hexagon (Great/Ultra/Master or a rotating cup — they differ
 * per league), then its type matchups. Raids have no such scores.
 */
const CombatTab = ({ pokemon, activeLeague }: { pokemon: IGamemasterPokemon; activeLeague: ActiveLeague }) => {
	const { t } = useTranslation(['pokemonDetail']);
	const { currentGameLanguage: gl } = useLanguage();
	const name = cleanName(pokemon.speciesName);

	const matchups = useMemo(() => typeMatchups(pokemon.types.map((ty) => String(ty))), [pokemon]);

	const ranked = activeLeague.isRaid ? undefined : activeLeague.rankList[pokemon.speciesId];
	const labels = combatMetricNames(t);
	const descriptions = combatMetricDescriptions(t);

	const effList = (list: typeof matchups.weak) =>
		list.length === 0 ? (
			<span className='r-muted'>{t('pokemonDetail:effectiveness.nothing')}</span>
		) : (
			list.map(({ type, mult }) => (
				<span
					key={type}
					className='r-eff-t'
					data-double={isDoubleMult(mult) ? '' : undefined}
					style={{ ['--tc' as string]: `var(--t-${type})` }}
				>
					{gameTypeDisplayTranslator(type, gl)}
					<span className='r-eff-mult'>{fmtMult(mult)}</span>
				</span>
			))
		);

	return (
		<div className='r-movecontent'>
			<div className='r-section-h'>{t('pokemonDetail:combat.heading', { name, league: activeLeague.title })}</div>
			<div className='r-card'>
				{ranked ? (
					<CombatHexagon
						// remount per Pokémon/league so the grow-in animation replays on every switch
						key={`${pokemon.speciesId}|${activeLeague.title}`}
						values={{
							lead: ranked.lead,
							switch: ranked.switch,
							charger: ranked.charger,
							closer: ranked.closer,
							consistency: ranked.consistency,
							attacker: ranked.attacker,
						}}
						labels={labels}
						descriptions={descriptions}
						color={activeLeague.colorVar}
						ariaLabel={t('pokemonDetail:combat.chartAriaLabel', { name, league: activeLeague.title })}
					/>
				) : (
					<p className='r-muted' style={{ textAlign: 'center' }}>
						{activeLeague.isRaid
							? t('pokemonDetail:combat.notForRaids', {
									raid: sentenceCase(gameTranslator(GameTranslatorKeys.RaidDisplay, gl)),
									great: gameTranslator(GameTranslatorKeys.GreatLeagueShort, gl),
									ultra: gameTranslator(GameTranslatorKeys.UltraLeagueShort, gl),
									master: gameTranslator(GameTranslatorKeys.MasterLeagueShort, gl),
								})
							: t('pokemonDetail:combat.notRanked', { name, league: activeLeague.title })}
					</p>
				)}

				{ranked && (
					<details className='r-ctr-help r-hex-help'>
						<summary>{t('pokemonDetail:combat.helpSummary')}</summary>
						<dl>
							{COMBAT_METRICS.map((m) => (
								<Fragment key={m}>
									<dt>{labels[m]}</dt>
									<dd>{descriptions[m]}</dd>
								</Fragment>
							))}
						</dl>
					</details>
				)}
			</div>

			<div className='r-section-h'>{t('pokemonDetail:effectiveness.heading', { name })}</div>
			<div className='r-card'>
				<div className='r-eff'>
					<div className='r-eff-col'>
						<b>{t('pokemonDetail:effectiveness.weakTo')}</b>
						<div className='r-eff-list'>{effList(matchups.weak)}</div>
					</div>
					<div className='r-eff-col'>
						<b>{t('pokemonDetail:effectiveness.resists')}</b>
						<div className='r-eff-list'>{effList(matchups.resist)}</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CombatTab;

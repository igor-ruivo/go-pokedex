import type { RankList } from '../queries/pvp';

/**
 * Everything a Pokémon-page tab (Moves/Counters/IV Table/Strings) needs to
 * know about whichever league/mode is currently selected — great/ultra/
 * master/raid or any rotating/custom cup alike. Deliberately NOT the old
 * `0|1|2|3` index: IV percentile spreads only ever depend on `cpCap`'s tier
 * (1500/2500/uncapped — see `leagueSlice` in PokemonDetail.tsx), never on
 * which specific cup, so passing that (plus the cup's own real ranking list
 * for moveset/matchup lookups) is all any tab actually needs — one shape
 * that already works for a rotating cup with zero changes to any of them.
 */
export interface ActiveLeague {
	id: string;
	/** Full, localized league name for display. */
	title: string;
	/** `Number.MAX_VALUE` for Master / raids (no CP cap). */
	cpCap: number;
	/** A ready-to-use CSS color value (`var(--lg-great)` or a rotating cup's own hex). */
	colorVar: string;
	isRaid: boolean;
	/** This league's own PvPoke-style ranking list — empty for raids. */
	rankList: RankList;
}
